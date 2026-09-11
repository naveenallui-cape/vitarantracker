export type ActivityEventType = "ACTIVE" | "IDLE" | "LOCKED" | "UNLOCKED";
export type HeartbeatStatus = "ACTIVE" | "IDLE" | "LOCKED";

export type MonitorInput = {
  locked: boolean;
  idleSeconds: number;
  idleThresholdSeconds: number;
};

export function heartbeatStatusFrom(
  eventType: ActivityEventType,
): HeartbeatStatus {
  return eventType === "UNLOCKED" ? "ACTIVE" : eventType;
}

export function nextEvent(
  current: HeartbeatStatus,
  input: MonitorInput,
): ActivityEventType | null {
  if (input.locked) {
    return current === "LOCKED" ? null : "LOCKED";
  }

  if (input.idleSeconds >= input.idleThresholdSeconds) {
    return current === "IDLE" ? null : "IDLE";
  }

  if (current === "LOCKED") {
    return "UNLOCKED";
  }

  return current === "ACTIVE" ? null : "ACTIVE";
}
