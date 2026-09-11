import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const BLOCKED_METADATA_KEYS = [
  'password',
  'passwordHash',
  'accessToken',
  'deviceToken',
  'jwtSecret',
  'registrationCode',
  'codeHash',
  'typedText',
  'keystrokes',
  'screenshot',
  'clipboard',
  'browserHistory',
  'url',
  'fileName',
];

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    action: AuditAction;
    adminId?: string | null;
    employeeId?: string | null;
    deviceId?: string | null;
    metadata?: Record<string, unknown> | null;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const client = params.tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        action: params.action,
        adminId: params.adminId ?? null,
        employeeId: params.employeeId ?? null,
        deviceId: params.deviceId ?? null,
        metadata: this.sanitize(params.metadata) as Prisma.InputJsonValue,
      },
    });
  }

  private sanitize(
    metadata?: Record<string, unknown> | null,
  ): Record<string, unknown> | undefined {
    if (!metadata) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(metadata).filter(
        ([key]) => !BLOCKED_METADATA_KEYS.includes(key),
      ),
    );
  }
}
