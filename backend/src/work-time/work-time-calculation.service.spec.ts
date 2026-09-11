import { WorkTimeCalculationService } from './work-time-calculation.service';

describe('WorkTimeCalculationService', () => {
  const service = new WorkTimeCalculationService();

  it('calculates multiple active sessions from the specification example', () => {
    const summaries = service.calculate(
      [
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T10:05:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T10:25:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T13:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T13:45:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T18:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-10T00:00:00.000Z'),
        to: new Date('2026-09-10T00:00:00.000Z'),
      },
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].activeSeconds).toBe(7 * 3600 + 55 * 60);
    expect(summaries[0].idleSeconds).toBe(20 * 60 + 45 * 60);
    expect(summaries[0].firstActiveAt?.toISOString()).toBe(
      '2026-09-10T09:00:00.000Z',
    );
  });

  it('allocates midnight-crossing activity to the correct UTC days', () => {
    const summaries = service.calculate([
      {
        deviceId: 'd1',
        eventType: 'ACTIVE',
        occurredAt: new Date('2026-09-10T23:00:00.000Z'),
      },
      {
        deviceId: 'd1',
        eventType: 'IDLE',
        occurredAt: new Date('2026-09-11T01:00:00.000Z'),
      },
    ]);

    const dayOne = summaries.find((row) => row.date === '2026-09-10');
    const dayTwo = summaries.find((row) => row.date === '2026-09-11');
    expect(dayOne?.activeSeconds).toBe(3600);
    expect(dayTwo?.activeSeconds).toBe(3600);
  });

  it('does not double-count overlapping devices for the same employee', () => {
    const [summary] = service.calculate(
      [
        {
          deviceId: 'old',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
        {
          deviceId: 'old',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T12:00:00.000Z'),
        },
        {
          deviceId: 'new',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T10:00:00.000Z'),
        },
        {
          deviceId: 'new',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T11:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-10T00:00:00.000Z'),
        to: new Date('2026-09-10T00:00:00.000Z'),
      },
    );

    expect(summary.activeSeconds).toBe(3 * 3600);
  });

  it('treats UNLOCKED as ACTIVE and counts locked periods separately', () => {
    const [summary] = service.calculate(
      [
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'LOCKED',
          occurredAt: new Date('2026-09-10T10:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'UNLOCKED',
          occurredAt: new Date('2026-09-10T10:30:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T11:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-10T00:00:00.000Z'),
        to: new Date('2026-09-10T00:00:00.000Z'),
      },
    );

    expect(summary.activeSeconds).toBe(90 * 60);
    expect(summary.lockedSeconds).toBe(30 * 60);
  });

  it('ignores duplicate same-timestamp events and sorts out-of-order input', () => {
    const [summary] = service.calculate(
      [
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T10:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-10T00:00:00.000Z'),
        to: new Date('2026-09-10T00:00:00.000Z'),
      },
    );

    expect(summary.activeSeconds).toBe(3600);
  });

  it('does not treat login minus logout as the work-time formula', () => {
    const [summary] = service.calculate(
      [
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T09:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T10:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-10T16:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-10T17:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-10T00:00:00.000Z'),
        to: new Date('2026-09-10T00:00:00.000Z'),
      },
    );

    expect(summary.activeSeconds).toBe(2 * 3600);
    expect(summary.activeSeconds).not.toBe(8 * 3600);
  });

  it('extends an open ACTIVE session using lastSeenAt from heartbeats', () => {
    const [summary] = service.calculate(
      [
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-11T04:00:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-11T00:00:00.000Z'),
        to: new Date('2026-09-11T00:00:00.000Z'),
        asOf: new Date('2026-09-11T06:00:00.000Z'),
        deviceLastSeen: {
          d1: new Date('2026-09-11T05:59:30.000Z'),
        },
      },
    );

    expect(summary.activeSeconds).toBe(2 * 3600);
  });

  it('returns merged keyboard/mouse segments for a day timeline', () => {
    const [day] = service.segments(
      [
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-11T04:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'IDLE',
          occurredAt: new Date('2026-09-11T06:00:00.000Z'),
        },
        {
          deviceId: 'd1',
          eventType: 'ACTIVE',
          occurredAt: new Date('2026-09-11T06:30:00.000Z'),
        },
      ],
      {
        from: new Date('2026-09-11T00:00:00.000Z'),
        to: new Date('2026-09-11T00:00:00.000Z'),
        asOf: new Date('2026-09-11T07:00:00.000Z'),
        deviceLastSeen: {
          d1: new Date('2026-09-11T06:59:30.000Z'),
        },
      },
    );

    expect(day.segments.map((segment) => segment.status)).toEqual([
      'ACTIVE',
      'IDLE',
      'ACTIVE',
    ]);
    expect(day.segments[0].start.toISOString()).toBe(
      '2026-09-11T04:00:00.000Z',
    );
  });
});
