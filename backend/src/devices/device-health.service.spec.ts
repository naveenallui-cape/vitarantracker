import { DeviceHealthService } from './device-health.service';

describe('DeviceHealthService', () => {
  const prisma = {
    device: { updateMany: jest.fn() },
  };
  const config = {
    get: jest.fn().mockReturnValue(180),
  };
  const service = new DeviceHealthService(prisma as never, config as never);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(180);
    prisma.device.updateMany.mockResolvedValue({ count: 2 });
  });

  it('marks only ACTIVE devices offline after the grace period', async () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const count = await service.detectOfflineDevices(now);

    expect(count).toBe(2);
    expect(prisma.device.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        OR: [
          { lastSeenAt: null, registeredAt: { lt: expect.any(Date) } },
          { lastSeenAt: { lt: expect.any(Date) } },
        ],
      },
      data: {
        status: 'OFFLINE',
        currentActivityStatus: 'OFFLINE',
      },
    });

    const threshold = (
      prisma.device.updateMany.mock.calls[0][0] as {
        where: { OR: Array<{ lastSeenAt?: { lt: Date } }> };
      }
    ).where.OR[1].lastSeenAt?.lt;
    expect(now.getTime() - (threshold?.getTime() ?? 0)).toBe(180000);
  });

  it('never targets REVOKED devices in offline detection', async () => {
    await service.detectOfflineDevices();
    const arg = prisma.device.updateMany.mock.calls[0][0] as {
      where: { status: string };
    };
    expect(arg.where.status).toBe('ACTIVE');
  });
});
