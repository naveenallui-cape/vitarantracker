import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DeviceRegistrationService } from '../device-registration/device-registration.service';
import {
  generateDeviceToken,
  hashWithSecret,
} from '../common/utils/crypto.util';
import { normalizePagination, paginate } from '../common/utils/pagination.util';
import { AppConfig } from '../config/configuration';
import { QueryDevicesDto } from './dto/query-devices.dto';
import { ReassignDeviceDto } from './dto/reassign-device.dto';

const SAFE_DEVICE_SELECT = {
  id: true,
  employeeId: true,
  deviceName: true,
  hostname: true,
  operatingSystem: true,
  agentVersion: true,
  status: true,
  currentActivityStatus: true,
  lastSeenAt: true,
  registeredAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      employeeId: true,
      name: true,
      department: true,
      designation: true,
      status: true,
    },
  },
} satisfies Prisma.DeviceSelect;

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly auditLogs: AuditLogsService,
    private readonly deviceRegistration: DeviceRegistrationService,
  ) {}

  async findMany(query: QueryDevicesDto) {
    const { page, limit, skip } = normalizePagination(query);
    const where: Prisma.DeviceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.employeeId) {
      where.employee = {
        OR: [{ id: query.employeeId }, { employeeId: query.employeeId }],
      };
    }
    if (query.search) {
      where.OR = [
        { deviceName: { contains: query.search, mode: 'insensitive' } },
        { hostname: { contains: query.search, mode: 'insensitive' } },
        { employee: { name: { contains: query.search, mode: 'insensitive' } } },
        {
          employee: {
            employeeId: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
        select: SAFE_DEVICE_SELECT,
      }),
      this.prisma.device.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async recentActivity(limit = 40) {
    const take = Math.min(100, Math.max(1, limit));
    const events = await this.prisma.activityEvent.findMany({
      take,
      orderBy: { occurredAt: 'desc' },
      select: {
        employeeId: true,
        deviceId: true,
        eventType: true,
        occurredAt: true,
        employee: {
          select: {
            name: true,
            employeeId: true,
            department: true,
          },
        },
      },
    });

    return events.map((event) => ({
      employeeId: event.employeeId,
      employeeName: event.employee.name,
      employeeCode: event.employee.employeeId,
      department: event.employee.department,
      deviceId: event.deviceId,
      status: event.eventType,
      timestamp: event.occurredAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: {
        ...SAFE_DEVICE_SELECT,
        deviceAssignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!device) {
      throw new AppException(
        'Device not found',
        ErrorCodes.DEVICE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return device;
  }

  async findByEmployee(employeeKey: string) {
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

    return this.prisma.device.findMany({
      where: { employeeId: employee.id },
      orderBy: { registeredAt: 'desc' },
      select: SAFE_DEVICE_SELECT,
    });
  }

  async revoke(id: string, adminId: string, reason = 'REVOKED') {
    const device = await this.requireDevice(id);
    if (device.status === 'REVOKED') {
      return this.findOne(id);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.invalidateDevice(tx, device.id, reason);
      await this.auditLogs.record({
        tx,
        action: 'REVOKE_DEVICE',
        adminId,
        employeeId: device.employeeId,
        deviceId: device.id,
        metadata: { reason },
      });
    });

    return this.findOne(id);
  }

  async replace(id: string, adminId: string) {
    const device = await this.requireDevice(id);

    await this.prisma.$transaction(async (tx) => {
      await this.invalidateDevice(tx, device.id, 'REPLACED');
      await this.auditLogs.record({
        tx,
        action: 'REPLACE_DEVICE',
        adminId,
        employeeId: device.employeeId,
        deviceId: device.id,
        metadata: { previousDeviceId: device.id },
      });
    });

    const registration = await this.deviceRegistration.generateCode(
      device.employeeId,
      adminId,
    );

    return {
      success: true,
      revokedDeviceId: device.id,
      registrationCode: registration,
    };
  }

  async reassign(id: string, dto: ReassignDeviceDto, adminId: string) {
    const device = await this.requireDevice(id);
    const newEmployee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ id: dto.newEmployeeId }, { employeeId: dto.newEmployeeId }],
      },
    });

    if (!newEmployee) {
      throw new AppException(
        'Employee not found',
        ErrorCodes.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    if (newEmployee.status !== 'ACTIVE') {
      throw new AppException(
        'Employee is inactive',
        ErrorCodes.EMPLOYEE_INACTIVE,
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.invalidateDevice(tx, device.id, dto.reason ?? 'REASSIGNED');
      await this.auditLogs.record({
        tx,
        action: 'REASSIGN_DEVICE',
        adminId,
        employeeId: newEmployee.id,
        deviceId: device.id,
        metadata: {
          previousEmployeeId: device.employeeId,
          newEmployeeId: newEmployee.employeeId,
          reason: dto.reason ?? 'Employee transfer',
        },
      });
    });

    const registration = await this.deviceRegistration.generateCode(
      newEmployee.id,
      adminId,
    );

    return {
      success: true,
      revokedDeviceId: device.id,
      newEmployeeId: newEmployee.employeeId,
      registrationCode: registration,
    };
  }

  async assignmentHistory(id: string) {
    await this.requireDevice(id);
    return this.prisma.deviceAssignment.findMany({
      where: { deviceId: id },
      orderBy: { assignedAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
    });
  }

  private async requireDevice(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new AppException(
        'Device not found',
        ErrorCodes.DEVICE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return device;
  }

  private async invalidateDevice(
    tx: Prisma.TransactionClient,
    deviceId: string,
    reason: string,
  ): Promise<void> {
    const rotatedHash = hashWithSecret(
      generateDeviceToken(),
      this.config.get('deviceTokenSecret', { infer: true }),
    );

    await tx.device.update({
      where: { id: deviceId },
      data: {
        status: 'REVOKED',
        currentActivityStatus: 'OFFLINE',
        revokedAt: new Date(),
        deviceTokenHash: rotatedHash,
      },
    });

    await tx.deviceAssignment.updateMany({
      where: { deviceId, unassignedAt: null },
      data: {
        unassignedAt: new Date(),
        reason,
      },
    });
  }
}
