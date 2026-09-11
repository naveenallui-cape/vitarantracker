import { UnauthorizedException } from '@nestjs/common';
import { DeviceAuthGuard } from './device-auth.guard';
import { hashWithSecret } from '../utils/crypto.util';

describe('DeviceAuthGuard', () => {
  const secret = 'test-device-secret-please-change-32';
  const prisma = {
    device: { findUnique: jest.fn() },
  };
  const config = { get: jest.fn().mockReturnValue(secret) };
  const guard = new DeviceAuthGuard(prisma as never, config as never);

  const contextFor = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization },
        }),
      }),
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue(secret);
  });

  it('rejects an invalid device token', async () => {
    prisma.device.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor('Bearer not-a-real-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.device.findUnique).toHaveBeenCalledWith({
      where: { deviceTokenHash: hashWithSecret('not-a-real-token', secret) },
    });
  });

  it('rejects a revoked device immediately', async () => {
    prisma.device.findUnique.mockResolvedValue({
      id: 'device-1',
      status: 'REVOKED',
    });

    await expect(
      guard.canActivate(contextFor('Bearer revoked-token')),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'DEVICE_REVOKED' }),
    });
  });
});
