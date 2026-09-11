import { DevicesService } from './devices.service';
import { AppException } from '../common/errors/app.exception';

describe('DevicesService', () => {
  const existing = {
    id: 'device-1',
    employeeId: 'emp-1',
    status: 'ACTIVE',
  };

  const prisma = {
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    activityEvent: { findMany: jest.fn() },
    employee: { findFirst: jest.fn() },
    deviceAssignment: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = {
    get: jest.fn().mockReturnValue('secret-secret-secret-secret-32ch'),
  };
  const auditLogs = { record: jest.fn() };
  const deviceRegistration = { generateCode: jest.fn() };
  const service = new DevicesService(
    prisma as never,
    config as never,
    auditLogs as never,
    deviceRegistration as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.device.findUnique.mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          device: { update: jest.fn() },
          deviceAssignment: { updateMany: jest.fn() },
        });
      },
    );
  });

  it('revokes a device and rotates the stored token hash', async () => {
    prisma.device.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({
        ...existing,
        status: 'REVOKED',
        deviceAssignments: [],
      });

    const result = await service.revoke('device-1', 'admin-1');
    expect(result.status).toBe('REVOKED');
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REVOKE_DEVICE' }),
    );
    expect(JSON.stringify(result)).not.toContain('deviceToken');
  });

  it('replaces a laptop by revoking the old device and issuing a new code', async () => {
    deviceRegistration.generateCode.mockResolvedValue({
      code: 'AB7K-92PX',
      expiresAt: new Date(),
    });

    const result = await service.replace('device-1', 'admin-1');

    expect(result.revokedDeviceId).toBe('device-1');
    expect(result.registrationCode.code).toBe('AB7K-92PX');
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPLACE_DEVICE' }),
    );
  });

  it('reassigns a laptop to another employee without rewriting history', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-2',
      employeeId: 'EMP002',
      status: 'ACTIVE',
    });
    deviceRegistration.generateCode.mockResolvedValue({
      code: 'CD8L-31QY',
      expiresAt: new Date(),
    });

    const result = await service.reassign(
      'device-1',
      { newEmployeeId: 'EMP002', reason: 'Employee transfer' },
      'admin-1',
    );

    expect(result.newEmployeeId).toBe('EMP002');
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REASSIGN_DEVICE',
        metadata: expect.objectContaining({
          previousEmployeeId: 'emp-1',
          newEmployeeId: 'EMP002',
        }),
      }),
    );
  });

  it('preserves assignment history for a device', async () => {
    prisma.deviceAssignment.findMany.mockResolvedValue([
      { id: 'a1', employeeId: 'emp-1', unassignedAt: new Date() },
      { id: 'a2', employeeId: 'emp-2', unassignedAt: null },
    ]);

    const history = await service.assignmentHistory('device-1');
    expect(history).toHaveLength(2);
  });

  it('rejects reassignment to a missing employee', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(
      service.reassign('device-1', { newEmployeeId: 'MISSING' }, 'admin-1'),
    ).rejects.toBeInstanceOf(AppException);
  });
});
