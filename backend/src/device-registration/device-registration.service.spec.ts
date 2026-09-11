import { DeviceRegistrationService } from './device-registration.service';
import { AppException } from '../common/errors/app.exception';
import {
  hashWithSecret,
  normalizeRegistrationCode,
} from '../common/utils/crypto.util';

describe('DeviceRegistrationService', () => {
  const secret = 'test-device-secret-please-change-32';
  const prisma = {
    employee: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const config = {
    get: jest.fn().mockReturnValue(secret),
  };
  const auditLogs = { record: jest.fn() };
  const service = new DeviceRegistrationService(
    prisma as never,
    config as never,
    auditLogs as never,
  );

  const employee = {
    id: 'emp-uuid',
    employeeId: 'EMP001',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(secret);
  });

  it('generates a registration code and never returns the stored hash', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          deviceRegistrationCode: {
            updateMany: jest.fn(),
            create: jest.fn(),
          },
        });
      },
    );

    const result = await service.generateCode('EMP001', 'admin-1');

    expect(result.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(JSON.stringify(result)).not.toContain('codeHash');
  });

  it('registers a Windows device atomically and returns the token once', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          deviceRegistrationCode: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'code-1',
              usedAt: null,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            }),
            update: jest.fn(),
          },
          device: {
            create: jest.fn().mockResolvedValue({
              id: 'device-1',
              deviceName: 'VITARAN-LAPTOP-001',
              hostname: 'RAHUL-PC',
              agentVersion: '1.0.0',
            }),
          },
          deviceAssignment: { create: jest.fn() },
        };
        return fn(tx);
      },
    );

    const result = await service.register({
      employeeId: 'EMP001',
      registrationCode: 'AB7K-92PX',
      deviceName: 'VITARAN-LAPTOP-001',
      hostname: 'RAHUL-PC',
      agentVersion: '1.0.0',
    });

    expect(result.success).toBe(true);
    expect(result.deviceId).toBe('device-1');
    expect(result.deviceToken).toHaveLength(64);
    expect(JSON.stringify(result)).not.toContain('deviceTokenHash');
  });

  it('rejects an expired registration code', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          deviceRegistrationCode: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'code-1',
              usedAt: null,
              expiresAt: new Date(Date.now() - 1000),
            }),
          },
        });
      },
    );

    await expect(
      service.register({
        employeeId: 'EMP001',
        registrationCode: 'AB7K-92PX',
        deviceName: 'VITARAN-LAPTOP-001',
        hostname: 'RAHUL-PC',
        agentVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({ code: 'REGISTRATION_CODE_EXPIRED' });
  });

  it('rejects a used registration code', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          deviceRegistrationCode: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'code-1',
              usedAt: new Date(),
              expiresAt: new Date(Date.now() + 10000),
            }),
          },
        });
      },
    );

    await expect(
      service.register({
        employeeId: 'EMP001',
        registrationCode: 'AB7K-92PX',
        deviceName: 'VITARAN-LAPTOP-001',
        hostname: 'RAHUL-PC',
        agentVersion: '1.0.0',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects an invalid registration code', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          deviceRegistrationCode: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        });
      },
    );

    await expect(
      service.register({
        employeeId: 'EMP001',
        registrationCode: 'ZZZZ-ZZZZ',
        deviceName: 'VITARAN-LAPTOP-001',
        hostname: 'RAHUL-PC',
        agentVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({ code: 'REGISTRATION_CODE_INVALID' });
  });

  it('hashes registration codes instead of storing plaintext', () => {
    const hash = hashWithSecret(normalizeRegistrationCode('AB7K-92PX'), secret);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('AB7K-92PX');
  });
});
