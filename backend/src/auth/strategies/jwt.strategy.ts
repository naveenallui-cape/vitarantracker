import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ErrorCodes } from '../../common/errors/error-codes';
import { AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { AppConfig } from '../../config/configuration';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwtSecret', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedAdmin> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException({
        success: false,
        message: 'Authentication required',
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
    };
  }
}
