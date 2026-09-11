import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  generateDeviceToken,
  generateRegistrationCode,
  hashWithSecret,
  normalizeRegistrationCode,
} from '../common/utils/crypto.util';
import { AppConfig } from '../config/configuration';
import { RegisterDeviceDto } from './dto/register-device.dto';

const DEFAULT_CODE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class DeviceRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async generateCode(employeeKey: string, adminId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id: employeeKey }, { employeeId: employeeKey }] },
    });

    if (!employee) {
      throw new AppException(
        'Employee not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    if (employee.status !== 'ACTIVE') {
      throw new AppException(
        'Employee is inactive',
        ErrorCodes.EMPLOYEE_INACTIVE,
        HttpStatus.CONFLICT,
      );
    }

    const code = generateRegistrationCode();
    const codeHash = hashWithSecret(
      normalizeRegistrationCode(code),
      this.secret(),
    );
    const expiresAt = new Date(Date.now() + DEFAULT_CODE_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.deviceRegistrationCode.updateMany({
        where: {
          employeeId: employee.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      });

      await tx.deviceRegistrationCode.create({
        data: {
          employeeId: employee.id,
          codeHash,
          expiresAt,
        },
      });

      await this.auditLogs.record({
        tx,
        action: 'GENERATE_REGISTRATION_CODE',
        adminId,
        employeeId: employee.id,
        metadata: { employeeId: employee.employeeId, expiresAt },
      });
    });

    return { code, expiresAt };
  }

  async register(dto: RegisterDeviceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: dto.employeeId },
    });
    if (!employee) {
      throw new AppException(
        'Employee not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    if (employee.status !== 'ACTIVE') {
      throw new AppException(
        'Employee is inactive',
        ErrorCodes.EMPLOYEE_INACTIVE,
        HttpStatus.CONFLICT,
      );
    }

    const codeHash = hashWithSecret(
      normalizeRegistrationCode(dto.registrationCode),
      this.secret(),
    );

    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.deviceRegistrationCode.findFirst({
        where: {
          employeeId: employee.id,
          codeHash,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!registration) {
        throw new AppException(
          'Registration code is invalid',
          ErrorCodes.REGISTRATION_CODE_INVALID,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (registration.usedAt) {
        throw new AppException(
          'Registration code has already been used',
          ErrorCodes.REGISTRATION_CODE_USED,
          HttpStatus.CONFLICT,
        );
      }
      if (registration.expiresAt.getTime() <= Date.now()) {
        throw new AppException(
          'Registration code has expired',
          ErrorCodes.REGISTRATION_CODE_EXPIRED,
          HttpStatus.GONE,
        );
      }

      const deviceToken = generateDeviceToken();
      const device = await tx.device.create({
        data: {
          employeeId: employee.id,
          deviceName: dto.deviceName.trim(),
          hostname: dto.hostname.trim(),
          operatingSystem: 'WINDOWS',
          agentVersion: dto.agentVersion.trim(),
          deviceTokenHash: hashWithSecret(deviceToken, this.secret()),
          status: 'ACTIVE',
          currentActivityStatus: 'OFFLINE',
        },
      });

      await tx.deviceRegistrationCode.update({
        where: { id: registration.id },
        data: { usedAt: new Date() },
      });

      await tx.deviceAssignment.create({
        data: {
          deviceId: device.id,
          employeeId: employee.id,
          reason: 'INITIAL_REGISTRATION',
        },
      });

      await this.auditLogs.record({
        tx,
        action: 'REGISTER_DEVICE',
        employeeId: employee.id,
        deviceId: device.id,
        metadata: {
          employeeId: employee.employeeId,
          deviceName: device.deviceName,
          hostname: device.hostname,
          operatingSystem: 'WINDOWS',
          agentVersion: device.agentVersion,
        },
      });

      return {
        success: true,
        deviceId: device.id,
        deviceToken,
      };
    });
  }

  private secret(): string {
    return this.config.get('deviceTokenSecret', { infer: true });
  }
}
