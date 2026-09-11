import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { hashPassword } from '../common/utils/crypto.util';
import { AppException } from '../common/errors/app.exception';

describe('AuthService', () => {
  const prisma = {
    admin: {
      findUnique: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  };
  const service = new AuthService(
    prisma as never,
    jwtService as unknown as JwtService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in the single admin and never returns the password hash', async () => {
    prisma.admin.findUnique.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@vitaran.com',
      passwordHash: await hashPassword('super-secret-password'),
      isActive: true,
    });

    const result = await service.login({
      email: 'admin@vitaran.com',
      password: 'super-secret-password',
    });

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.admin).toEqual({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@vitaran.com',
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('super-secret-password');
  });

  it('rejects invalid admin credentials', async () => {
    prisma.admin.findUnique.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@vitaran.com',
      passwordHash: await hashPassword('super-secret-password'),
      isActive: true,
    });

    await expect(
      service.login({
        email: 'admin@vitaran.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
