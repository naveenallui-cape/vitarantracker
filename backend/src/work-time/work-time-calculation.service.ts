import { Injectable } from '@nestjs/common';
import {
  addUtcDays,
  formatUtcDate,
  startOfUtcDay,
} from '../common/utils/time.util';

export type TrackedStatus = 'ACTIVE' | 'IDLE' | 'LOCKED';
export type ActivityEventType = TrackedStatus | 'UNLOCKED';

export type TimelineEvent = {
  deviceId: string;
  eventType: ActivityEventType;
  occurredAt: Date;
};

export type DaySummary = {
  date: string;
  firstActiveAt: Date | null;
  lastActivityAt: Date | null;
  activeSeconds: number;
  idleSeconds: number;
  lockedSeconds: number;
  totalTrackedSeconds: number;
};

export type CalculateWorkTimeOptions = {
  asOf?: Date;
  deviceLastSeen?: Record<string, Date | null | undefined>;
  from?: Date;
  to?: Date;
  offlineGraceMs?: number;
};

type Interval = {
  start: Date;
  end: Date;
  status: TrackedStatus;
};

const STATUS_RANK: Record<TrackedStatus, number> = {
  ACTIVE: 3,
  LOCKED: 2,
  IDLE: 1,
};

@Injectable()
export class WorkTimeCalculationService {
  toStatus(eventType: ActivityEventType): TrackedStatus {
    return eventType === 'UNLOCKED' ? 'ACTIVE' : eventType;
  }

  calculate(
    events: TimelineEvent[],
    options: CalculateWorkTimeOptions = {},
  ): DaySummary[] {
    const asOf = options.asOf ?? new Date();
    const offlineGraceMs = options.offlineGraceMs ?? 3 * 60 * 1000;
    const byDevice = new Map<string, TimelineEvent[]>();

    for (const event of events) {
      const list = byDevice.get(event.deviceId) ?? [];
      list.push(event);
      byDevice.set(event.deviceId, list);
    }

    const dayIntervals = new Map<string, Interval[]>();

    for (const [deviceId, deviceEvents] of byDevice.entries()) {
      const intervals = this.buildDeviceIntervals(
        deviceEvents,
        asOf,
        options.deviceLastSeen?.[deviceId],
        offlineGraceMs,
      );
      for (const interval of intervals) {
        for (const part of this.splitByUtcDays(interval)) {
          const key = formatUtcDate(part.start);
          const list = dayIntervals.get(key) ?? [];
          list.push(part);
          dayIntervals.set(key, list);
        }
      }
    }

    return [...dayIntervals.keys()]
      .sort()
      .filter((date) => {
        if (options.from && date < formatUtcDate(options.from)) {
          return false;
        }
        if (options.to && date > formatUtcDate(options.to)) {
          return false;
        }
        return true;
      })
      .map((date) =>
        this.mergeDayIntervals(date, dayIntervals.get(date) ?? []),
      );
  }

  private buildDeviceIntervals(
    events: TimelineEvent[],
    asOf: Date,
    lastSeenAt?: Date | null,
    offlineGraceMs = 3 * 60 * 1000,
  ): Interval[] {
    const sorted = [...events].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    );
    const intervals: Interval[] = [];

    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      const start = current.occurredAt;
      const end = next
        ? next.occurredAt
        : this.resolveOpenEnd(start, asOf, lastSeenAt, offlineGraceMs);

      if (!end || end <= start) {
        continue;
      }

      intervals.push({
        start,
        end,
        status: this.toStatus(current.eventType),
      });
    }

    return intervals;
  }

  private resolveOpenEnd(
    start: Date,
    asOf: Date,
    lastSeenAt?: Date | null,
    offlineGraceMs = 3 * 60 * 1000,
  ): Date | null {
    if (!lastSeenAt || lastSeenAt < start) {
      return null;
    }

    const recentlySeen = asOf.getTime() - lastSeenAt.getTime() <= offlineGraceMs;
    if (recentlySeen && asOf > start) {
      return asOf;
    }

    return lastSeenAt > start ? lastSeenAt : null;
  }

  private splitByUtcDays(interval: Interval): Interval[] {
    const parts: Interval[] = [];
    let cursor = interval.start;

    while (cursor < interval.end) {
      const dayEnd = addUtcDays(startOfUtcDay(cursor), 1);
      const end = interval.end < dayEnd ? interval.end : dayEnd;
      parts.push({ ...interval, start: cursor, end });
      cursor = end;
    }

    return parts;
  }

  private mergeDayIntervals(date: string, intervals: Interval[]): DaySummary {
    if (intervals.length === 0) {
      return {
        date,
        firstActiveAt: null,
        lastActivityAt: null,
        activeSeconds: 0,
        idleSeconds: 0,
        lockedSeconds: 0,
        totalTrackedSeconds: 0,
      };
    }

    const points = new Set<number>();
    for (const interval of intervals) {
      points.add(interval.start.getTime());
      points.add(interval.end.getTime());
    }

    const sorted = [...points].sort((left, right) => left - right);
    let activeSeconds = 0;
    let idleSeconds = 0;
    let lockedSeconds = 0;
    let firstActiveAt: Date | null = null;
    let lastActivityAt: Date | null = null;

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const segmentStart = sorted[index];
      const segmentEnd = sorted[index + 1];
      if (segmentEnd <= segmentStart) {
        continue;
      }

      let best: TrackedStatus | null = null;
      for (const interval of intervals) {
        if (
          interval.start.getTime() <= segmentStart &&
          interval.end.getTime() >= segmentEnd
        ) {
          if (!best || STATUS_RANK[interval.status] > STATUS_RANK[best]) {
            best = interval.status;
          }
        }
      }

      if (!best) {
        continue;
      }

      const seconds = Math.floor((segmentEnd - segmentStart) / 1000);
      if (best === 'ACTIVE') {
        activeSeconds += seconds;
        if (!firstActiveAt) {
          firstActiveAt = new Date(segmentStart);
        }
      } else if (best === 'IDLE') {
        idleSeconds += seconds;
      } else {
        lockedSeconds += seconds;
      }
      lastActivityAt = new Date(segmentEnd);
    }

    return {
      date,
      firstActiveAt,
      lastActivityAt,
      activeSeconds,
      idleSeconds,
      lockedSeconds,
      totalTrackedSeconds: activeSeconds + idleSeconds + lockedSeconds,
    };
  }
}
