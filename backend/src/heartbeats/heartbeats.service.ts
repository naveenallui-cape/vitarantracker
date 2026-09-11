import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { parseOccurredAt } from '../common/utils/time.util';
import { AuthenticatedDevice } from '../common/decorators/current-device.decorator';
import { TrackerGateway } from '../tracker/tracker.gateway';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Injectable()
export class HeartbeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerGateway: TrackerGateway,
  ) {}

  async ingest(device: AuthenticatedDevice, dto: HeartbeatDto) {
    const occurredAt = this.parseTimestamp(dto.occurredAt);

    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: 'ACTIVE',
        currentActivityStatus: dto.status,
        agentVersion: dto.agentVersion.trim(),
        lastSeenAt: occurredAt,
      },
    });

    this.trackerGateway.emitActivityUpdated({
      employeeId: device.employeeId,
      deviceId: device.id,
      status: dto.status,
      timestamp: occurredAt.toISOString(),
    });

    return {
      success: true,
      status: dto.status,
      lastSeenAt: occurredAt.toISOString(),
    };
  }

  private parseTimestamp(value: string): Date {
    try {
      return parseOccurredAt(value);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'INVALID_TIMESTAMP';
      throw new AppException(
        reason === 'FUTURE_TIMESTAMP'
          ? 'Heartbeat timestamp is unreasonably in the future'
          : 'Heartbeat timestamp is invalid',
        ErrorCodes.INVALID_TIMESTAMP,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
