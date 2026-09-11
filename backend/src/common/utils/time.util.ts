export const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000;
export const MAX_PAST_DRIFT_MS = 30 * 24 * 60 * 60 * 1000;

export function parseOccurredAt(value: string | Date, now = new Date()): Date {
  const occurredAt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('INVALID_TIMESTAMP');
  }

  const drift = occurredAt.getTime() - now.getTime();
  if (drift > MAX_FUTURE_DRIFT_MS) {
    throw new Error('FUTURE_TIMESTAMP');
  }
  if (drift < -MAX_PAST_DRIFT_MS) {
    throw new Error('STALE_TIMESTAMP');
  }

  return occurredAt;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatUtcDate(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

export function parseUtcDate(value: string): Date {
  if (value.includes('T')) {
    return startOfUtcDay(new Date(value));
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
