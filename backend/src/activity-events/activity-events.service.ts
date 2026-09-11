import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCodes } from '../common/errors/error-codes';
import { parseOccurredAt, startOfUtcDay } from '../common/utils/time.util';
import { AuthenticatedDevice } from '../common/decorators/current-device.decorator';
import { DailySummaryService } from '../work-time/daily-summary.service';
import { TrackerGateway } from '../tracker/tracker.gateway';
import { CreateActivityEventDto } from './dto/create-activity-event.dto';

@Injectable()
export class ActivityEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailySummary: DailySummaryService,
    private readonly trackerGateway: TrackerGateway,
  ) {}

  async ingest(device: AuthenticatedDevice, dto: CreateActivityEventDto) {
    const occurredAt = this.parseTimestamp(dto.occurredAt);
    const existing = await this.prisma.activityEvent.findUnique({
      where: { eventId: dto.eventId },
    });

    if (existing) {
      return {
        success: true,
        idempotent: true,
        eventId: existing.eventId,
      };
    }

    const activityStatus =
      dto.eventType === 'UNLOCKED' ? 'ACTIVE' : dto.eventType;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.activityEvent.create({
          data: {
            eventId: dto.eventId,
            employeeId: device.employeeId,
            deviceId: device.id,
            eventType: dto.eventType,
            occurredAt,
          },
        });

        await tx.device.update({
          where: { id: device.id },
          data: {
            status: 'ACTIVE',
            currentActivityStatus: activityStatus,
            lastSeenAt: occurredAt,
          },
        });

        const previous = await tx.activityEvent.findFirst({
          where: {
            employeeId: device.employeeId,
            occurredAt: { lt: occurredAt },
            eventId: { not: dto.eventId },
          },
          orderBy: { occurredAt: 'desc' },
        });

        await this.dailySummary.applyEmployeeRange(
          device.employeeId,
          startOfUtcDay(previous?.occurredAt ?? occurredAt),
          occurredAt,
          tx,
        );
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          success: true,
          idempotent: true,
          eventId: dto.eventId,
        };
      }
      throw error;
    }

    this.trackerGateway.emitActivityUpdated({
      employeeId: device.employeeId,
      deviceId: device.id,
      status: dto.eventType,
      timestamp: occurredAt.toISOString(),
    });

    return {
      success: true,
      idempotent: false,
      eventId: dto.eventId,
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
          ? 'Event timestamp is unreasonably in the future'
          : 'Event timestamp is invalid',
        ErrorCodes.INVALID_TIMESTAMP,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
