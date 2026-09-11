import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseUtcDate } from '../common/utils/time.util';
import { WorkTimeReportQueryDto } from './dto/work-time-report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async workTime(query: WorkTimeReportQueryDto) {
    const where = this.buildWhere(query);
    const summaries = await this.prisma.dailyWorkSummary.findMany({
      where,
      include: {
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
      },
      orderBy: [{ date: 'asc' }, { employee: { employeeId: 'asc' } }],
    });

    return {
      filters: query,
      rows: summaries,
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

  async exportCsv(query: WorkTimeReportQueryDto): Promise<string> {
    const report = await this.workTime(query);
    const header = [
      'Employee ID',
      'Name',
      'Department',
      'Date',
      'Active Seconds',
      'Idle Seconds',
      'Locked Seconds',
      'Total Tracked Seconds',
      'First Active At',
      'Last Activity At',
    ].join(',');

    const lines = report.rows.map((row) =>
      [
        row.employee.employeeId,
        this.csv(row.employee.name),
        this.csv(row.employee.department),
        row.date.toISOString().slice(0, 10),
        row.activeSeconds,
        row.idleSeconds,
        row.lockedSeconds,
        row.totalTrackedSeconds,
        row.firstActiveAt?.toISOString() ?? '',
        row.lastActivityAt?.toISOString() ?? '',
      ].join(','),
    );

    return [header, ...lines].join('\n');
  }

  private buildWhere(
    query: WorkTimeReportQueryDto,
  ): Prisma.DailyWorkSummaryWhereInput {
    const where: Prisma.DailyWorkSummaryWhereInput = {};

    if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        where.date.gte = parseUtcDate(query.from);
      }
      if (query.to) {
        where.date.lte = parseUtcDate(query.to);
      }
    }

    if (query.employeeId || query.department || query.deviceId) {
      where.employee = {};
      if (query.employeeId) {
        where.employee.OR = [
          { id: query.employeeId },
          { employeeId: query.employeeId },
        ];
      }
      if (query.department) {
        where.employee.department = {
          equals: query.department,
          mode: 'insensitive',
        };
      }
      if (query.deviceId) {
        where.employee.devices = { some: { id: query.deviceId } };
      }
    }

    return where;
  }

  private csv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
