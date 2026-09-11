import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  addUtcDays,
  formatUtcDate,
  parseUtcDate,
  startOfUtcDay,
} from '../common/utils/time.util';
import { DailySummaryService } from '../work-time/daily-summary.service';
import { WorkTimeReportQueryDto } from './dto/work-time-report-query.dto';

const ACTIVITY_RANK: Record<string, number> = {
  ACTIVE: 4,
  IDLE: 3,
  LOCKED: 2,
  OFFLINE: 1,
};

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailySummary: DailySummaryService,
  ) {}

  async workTime(query: WorkTimeReportQueryDto) {
    const today = formatUtcDate(new Date());
    const from = parseUtcDate(query.from ?? today);
    const to = parseUtcDate(query.to ?? today);
    const dates = this.eachUtcDate(from, to);
    await this.refreshSummaries(from, to);

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

  async overview(query: WorkTimeReportQueryDto) {
    const today = formatUtcDate(new Date());
    const date = query.from ?? query.to ?? today;
    const report = await this.workTime({ ...query, from: date, to: date });
    const devices = await this.prisma.device.findMany({
      where: { status: { not: 'REVOKED' } },
      select: {
        id: true,
        employeeId: true,
        deviceName: true,
        hostname: true,
        currentActivityStatus: true,
        lastSeenAt: true,
        status: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const devicesByEmployee = new Map<string, typeof devices>();
    for (const device of devices) {
      const list = devicesByEmployee.get(device.employeeId) ?? [];
      list.push(device);
      devicesByEmployee.set(device.employeeId, list);
    }

    const employees = report.rows.map((row) => {
      const assigned = devicesByEmployee.get(row.employeeId) ?? [];
      const device = this.pickLiveDevice(assigned);
      const activityStatus = device?.currentActivityStatus ?? 'OFFLINE';
      const hasDevice = assigned.length > 0;
      return {
        id: row.employee.id,
        employeeId: row.employee.employeeId,
        name: row.employee.name,
        email: row.employee.email,
        department: row.employee.department,
        designation: row.employee.designation,
        status: row.employee.status,
        activityStatus,
        hasDevice,
        deviceId: device?.id ?? null,
        deviceName: device?.deviceName ?? null,
        lastSeenAt: device?.lastSeenAt ?? null,
        firstActiveAt: row.firstActiveAt,
        lastActivityAt: row.lastActivityAt,
        activeSeconds: row.activeSeconds,
        idleSeconds: row.idleSeconds,
        lockedSeconds: row.lockedSeconds,
        totalTrackedSeconds: row.totalTrackedSeconds,
      };
    });

    const counts = employees.reduce(
      (acc, employee) => {
        if (!employee.hasDevice) {
          acc.noDevice += 1;
        } else if (employee.activityStatus === 'ACTIVE') {
          acc.workingNow += 1;
        } else if (employee.activityStatus === 'IDLE') {
          acc.idle += 1;
        } else if (employee.activityStatus === 'LOCKED') {
          acc.locked += 1;
        } else {
          acc.offline += 1;
        }
        acc.totalEmployees += 1;
        return acc;
      },
      {
        workingNow: 0,
        idle: 0,
        locked: 0,
        offline: 0,
        noDevice: 0,
        totalEmployees: 0,
      },
    );

    return {
      date,
      generatedAt: new Date().toISOString(),
      counts,
      totals: report.totals,
      employees,
    };
  }

  async timeline(query: WorkTimeReportQueryDto) {
    const today = formatUtcDate(new Date());
    const date = query.from ?? query.to ?? today;
    const from = parseUtcDate(date);
    await this.refreshSummaries(from, from);

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

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      select: EMPLOYEE_SELECT,
      orderBy: { employeeId: 'asc' },
    });

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const days = await this.dailySummary.segmentsForEmployee(
          employee.id,
          from,
          from,
        );
        const day = days.find((item) => item.date === date);
        return {
          employee,
          segments: (day?.segments ?? []).map((segment) => ({
            start: segment.start.toISOString(),
            end: segment.end.toISOString(),
            status: segment.status,
          })),
        };
      }),
    );

    return {
      date,
      dayStart: from.toISOString(),
      dayEnd: addUtcDays(from, 1).toISOString(),
      rows,
    };
  }

  private pickLiveDevice<
    T extends {
      currentActivityStatus: string;
      lastSeenAt: Date | null;
    },
  >(devices: T[]): T | null {
    if (devices.length === 0) {
      return null;
    }
    return [...devices].sort((left, right) => {
      const rank =
        (ACTIVITY_RANK[right.currentActivityStatus] ?? 0) -
        (ACTIVITY_RANK[left.currentActivityStatus] ?? 0);
      if (rank !== 0) {
        return rank;
      }
      return (
        (right.lastSeenAt?.getTime() ?? 0) - (left.lastSeenAt?.getTime() ?? 0)
      );
    })[0];
  }

  private async refreshSummaries(from: Date, to: Date): Promise<void> {
    const employees = await this.prisma.employee.findMany({
      where: { devices: { some: {} } },
      select: { id: true },
    });

    for (const employee of employees) {
      await this.dailySummary.applyEmployeeRange(employee.id, from, to);
    }
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
