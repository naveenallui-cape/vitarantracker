import { HeartbeatsService } from './heartbeats.service';
import { AuthenticatedDevice } from '../common/decorators/current-device.decorator';

describe('HeartbeatsService', () => {
  const device: AuthenticatedDevice = {
    id: 'device-1',
    employeeId: 'emp-1',
    deviceName: 'VITARAN-LAPTOP-001',
    hostname: 'RAHUL-PC',
    operatingSystem: 'WINDOWS',
    agentVersion: '1.0.0',
    status: 'OFFLINE',
    currentActivityStatus: 'OFFLINE',
  };

  const prisma = {
    device: { update: jest.fn() },
  };
  const trackerGateway = { emitActivityUpdated: jest.fn() };
  const service = new HeartbeatsService(
    prisma as never,
    trackerGateway as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates last seen, activity status, and agent version', async () => {
    const occurredAt = '2026-09-10T09:00:00.000Z';
    const result = await service.ingest(device, {
      status: 'ACTIVE',
      agentVersion: '1.0.1',
      occurredAt,
    });

    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: 'device-1' },
      data: {
        status: 'ACTIVE',
        currentActivityStatus: 'ACTIVE',
        agentVersion: '1.0.1',
        lastSeenAt: new Date(occurredAt),
      },
    });
    expect(result.success).toBe(true);
    expect(trackerGateway.emitActivityUpdated).toHaveBeenCalled();
  });
});
