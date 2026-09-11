import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCodes } from '../errors/error-codes';
import { hashWithSecret } from '../utils/crypto.util';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { device?: unknown }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        message: 'Device token required',
        code: ErrorCodes.DEVICE_TOKEN_INVALID,
      });
    }

    const tokenHash = hashWithSecret(
      token,
      this.config.get('deviceTokenSecret', { infer: true }),
    );
    const device = await this.prisma.device.findUnique({
      where: { deviceTokenHash: tokenHash },
      include: {
        employee: {
          select: { name: true, employeeId: true, department: true },
        },
      },
    });

    if (!device) {
      throw new UnauthorizedException({
        success: false,
        message: 'Invalid device token',
        code: ErrorCodes.DEVICE_TOKEN_INVALID,
      });
    }

    if (device.status === 'REVOKED') {
      throw new UnauthorizedException({
        success: false,
        message: 'Device has been revoked',
        code: ErrorCodes.DEVICE_REVOKED,
      });
    }

    request.device = {
      id: device.id,
      employeeId: device.employeeId,
      employeeName: device.employee.name,
      employeeCode: device.employee.employeeId,
      department: device.employee.department,
      deviceName: device.deviceName,
      hostname: device.hostname,
      operatingSystem: device.operatingSystem,
      agentVersion: device.agentVersion,
      status: device.status,
      currentActivityStatus: device.currentActivityStatus,
    };

    return true;
  }
}
