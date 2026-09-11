import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  addUtcDays,
  parseUtcDate,
  startOfUtcDay,
} from '../common/utils/time.util';
import { WorkTimeReportQueryDto } from '../reports/dto/work-time-report-query.dto';
import {
  TimelineEvent,
  WorkTimeCalculationService,
} from './work-time-calculation.service';

@Injectable()
export class DailySummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workTime: WorkTimeCalculationService,
  ) {}

  async applyEmployeeRange(
    employeeId: string,
    from: Date,
    to: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const lookback = addUtcDays(startOfUtcDay(from), -1);

    const [prior, events, devices] = await Promise.all([
      client.activityEvent.findFirst({
        where: { employeeId, occurredAt: { lt: lookback } },
        orderBy: { occurredAt: 'desc' },
      }),
      client.activityEvent.findMany({
        where: {
          employeeId,
          occurredAt: { gte: lookback, lte: addUtcDays(startOfUtcDay(to), 1) },
        },
        orderBy: { occurredAt: 'asc' },
      }),
      client.device.findMany({
        where: { employeeId },
        select: { id: true, lastSeenAt: true },
      }),
    ]);

    const timeline: TimelineEvent[] = [
      ...(prior
        ? [
            {
              deviceId: prior.deviceId,
              eventType: prior.eventType,
              occurredAt: prior.occurredAt,
            },
          ]
        : []),
      ...events.map((event) => ({
        deviceId: event.deviceId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
      })),
    ];

    const deviceLastSeen = Object.fromEntries(
      devices.map((device) => [device.id, device.lastSeenAt]),
    );
    const summaries = this.workTime.calculate(timeline, {
      from: startOfUtcDay(from),
      to: startOfUtcDay(to),
      deviceLastSeen,
    });

    for (const summary of summaries) {
      await client.dailyWorkSummary.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: parseUtcDate(summary.date),
          },
        },
        create: {
          employeeId,
          date: parseUtcDate(summary.date),
          firstActiveAt: summary.firstActiveAt,
          lastActivityAt: summary.lastActivityAt,
          activeSeconds: summary.activeSeconds,
          idleSeconds: summary.idleSeconds,
          lockedSeconds: summary.lockedSeconds,
          totalTrackedSeconds: summary.totalTrackedSeconds,
        },
        update: {
          firstActiveAt: summary.firstActiveAt,
          lastActivityAt: summary.lastActivityAt,
          activeSeconds: summary.activeSeconds,
          idleSeconds: summary.idleSeconds,
          lockedSeconds: summary.lockedSeconds,
          totalTrackedSeconds: summary.totalTrackedSeconds,
        },
      });
    }
  }

  async getEmployeeSummaries(idOrCode: string, query: WorkTimeReportQueryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { OR: [{ id: idOrCode }, { employeeId: idOrCode }] },
    });
    if (!employee) {
      return { employee: null, summaries: [] };
    }

    const where: Prisma.DailyWorkSummaryWhereInput = {
      employeeId: employee.id,
    };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        where.date.gte = parseUtcDate(query.from);
      }
      if (query.to) {
        where.date.lte = parseUtcDate(query.to);
      }
    }

    const summaries = await this.prisma.dailyWorkSummary.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
      },
      summaries,
      totals: summaries.reduce(
        (acc, row) => ({
          activeSeconds: acc.activeSeconds + row.activeSeconds,
          idleSeconds: acc.idleSeconds + row.idleSeconds,
          lockedSeconds: acc.lockedSeconds + row.lockedSeconds,
          totalTrackedSeconds:
            acc.totalTrackedSeconds + row.totalTrackedSeconds,
        }),
        {
          activeSeconds: 0,
          idleSeconds: 0,
          lockedSeconds: 0,
          totalTrackedSeconds: 0,
        },
      ),
    };
  }
}
