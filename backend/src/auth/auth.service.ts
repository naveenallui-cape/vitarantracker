import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { verifyPassword } from '../common/utils/crypto.util';
import { LoginDto } from './dto/login.dto';

const DUMMY_PASSWORD_HASH =
  '$2b$12$CwTycUXWue0Thq9StjUM0uJ8iY2pQkq0n1cKQxgGkqYwqkqYwqkqW';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const valid = await verifyPassword(
      dto.password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!admin || !admin.isActive || !valid) {
      throw new AppException(
        'Invalid email or password',
        ErrorCodes.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    };
  }
}
