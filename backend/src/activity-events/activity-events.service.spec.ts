import { ActivityEventsService } from './activity-events.service';
import { AuthenticatedDevice } from '../common/decorators/current-device.decorator';

describe('ActivityEventsService', () => {
  const device: AuthenticatedDevice = {
    id: 'device-1',
    employeeId: 'emp-1',
    deviceName: 'VITARAN-LAPTOP-001',
    hostname: 'RAHUL-PC',
    operatingSystem: 'WINDOWS',
    agentVersion: '1.0.0',
    status: 'ACTIVE',
    currentActivityStatus: 'OFFLINE',
  };

  const prisma = {
    activityEvent: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const dailySummary = { applyEmployeeRange: jest.fn() };
  const trackerGateway = { emitActivityUpdated: jest.fn() };
  const service = new ActivityEventsService(
    prisma as never,
    dailySummary as never,
    trackerGateway as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores an allowed activity event and broadcasts a safe payload', async () => {
    prisma.activityEvent.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          activityEvent: {
            create: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          device: { update: jest.fn() },
        });
      },
    );

    const result = await service.ingest(device, {
      eventId: 'unique-event-id',
      eventType: 'ACTIVE',
      occurredAt: '2026-09-10T09:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      idempotent: false,
      eventId: 'unique-event-id',
    });
    expect(trackerGateway.emitActivityUpdated).toHaveBeenCalledWith({
      employeeId: 'emp-1',
      deviceId: 'device-1',
      status: 'ACTIVE',
      timestamp: '2026-09-10T09:00:00.000Z',
    });
  });

  it('returns an idempotent response for a duplicate eventId', async () => {
    prisma.activityEvent.findUnique.mockResolvedValue({
      eventId: 'unique-event-id',
    });

    const result = await service.ingest(device, {
      eventId: 'unique-event-id',
      eventType: 'ACTIVE',
      occurredAt: '2026-09-10T09:00:00.000Z',
    });

    expect(result.idempotent).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects unreasonable future timestamps', async () => {
    prisma.activityEvent.findUnique.mockResolvedValue(null);

    await expect(
      service.ingest(device, {
        eventId: 'future-event',
        eventType: 'IDLE',
        occurredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_TIMESTAMP' });
  });
});
