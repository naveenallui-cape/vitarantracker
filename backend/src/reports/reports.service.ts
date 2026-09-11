import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  addUtcDays,
  formatUtcDate,
  parseUtcDate,
  startOfUtcDay,
} from '../common/utils/time.util';
import { WorkTimeReportQueryDto } from './dto/work-time-report-query.dto';

const EMPLOYEE_SELECT = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  department: true,
  designation: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmployeeSelect;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async workTime(query: WorkTimeReportQueryDto) {
    const today = formatUtcDate(new Date());
    const from = parseUtcDate(query.from ?? today);
    const to = parseUtcDate(query.to ?? today);
    const dates = this.eachUtcDate(from, to);

    const employeeWhere: Prisma.EmployeeWhereInput = {};
    if (query.employeeId) {
      employeeWhere.OR = [
        { id: query.employeeId },
        { employeeId: query.employeeId },
      ];
    }
    if (query.department) {
      employeeWhere.department = {
        equals: query.department,
        mode: 'insensitive',
      };
    }
    if (query.deviceId) {
      employeeWhere.devices = { some: { id: query.deviceId } };
    }

    const [employees, summaries] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        select: EMPLOYEE_SELECT,
        orderBy: { employeeId: 'asc' },
      }),
      this.prisma.dailyWorkSummary.findMany({
        where: {
          date: { gte: from, lte: to },
          ...(Object.keys(employeeWhere).length > 0
            ? { employee: employeeWhere }
            : {}),
        },
        include: { employee: { select: EMPLOYEE_SELECT } },
      }),
    ]);

    const byKey = new Map(
      summaries.map((row) => [
        `${row.employeeId}|${formatUtcDate(row.date)}`,
        row,
      ]),
    );

    const rows = employees.flatMap((employee) =>
      dates.map((date) => {
        const existing = byKey.get(`${employee.id}|${date}`);
        if (existing) {
          return existing;
        }
        return {
          id: `empty-${employee.id}-${date}`,
          employeeId: employee.id,
          date: parseUtcDate(date),
          firstActiveAt: null,
          lastActivityAt: null,
          activeSeconds: 0,
          idleSeconds: 0,
          lockedSeconds: 0,
          totalTrackedSeconds: 0,
          createdAt: parseUtcDate(date),
          updatedAt: parseUtcDate(date),
          employee,
        };
      }),
    );

    return {
      filters: {
        ...query,
        from: formatUtcDate(from),
        to: formatUtcDate(to),
      },
      rows,
      totals: rows.reduce(
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
      'Keyboard/Mouse Active Seconds',
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
        formatUtcDate(row.date instanceof Date ? row.date : new Date(row.date)),
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

  private eachUtcDate(from: Date, to: Date): string[] {
    const dates: string[] = [];
    let cursor = startOfUtcDay(from);
    const end = startOfUtcDay(to);
    while (cursor.getTime() <= end.getTime()) {
      dates.push(formatUtcDate(cursor));
      cursor = addUtcDays(cursor, 1);
    }
    return dates;
  }

  private csv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
