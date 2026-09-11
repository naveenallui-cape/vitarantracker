import { powerMonitor } from "electron";
import {
  heartbeatStatusFrom,
  nextEvent,
  type ActivityEventType,
  type HeartbeatStatus,
} from "./state-machine";
import type { DeviceCredentials } from "./store";
import { flushQueue, sendEvent, sendHeartbeat } from "./api";

const IDLE_THRESHOLD_SECONDS = Number(process.env.IDLE_THRESHOLD_MINUTES ?? 5) * 60;
const HEARTBEAT_INTERVAL_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;

export class ActivityMonitor {
  private current: HeartbeatStatus = "ACTIVE";
  private locked = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly credentials: DeviceCredentials,
    private readonly onStatus: (status: HeartbeatStatus | "UNLOCKED") => void,
  ) {}

  start() {
    powerMonitor.on("lock-screen", () => {
      this.locked = true;
      void this.emit("LOCKED");
    });
    powerMonitor.on("unlock-screen", () => {
      this.locked = false;
      void this.emit("UNLOCKED");
    });

    this.timers.push(setInterval(() => this.poll(), POLL_INTERVAL_MS));
    this.timers.push(
      setInterval(() => {
        void sendHeartbeat(this.credentials, this.current);
        void flushQueue(this.credentials);
      }, HEARTBEAT_INTERVAL_MS),
    );

    void this.emit("ACTIVE");
    void sendHeartbeat(this.credentials, "ACTIVE");
  }

  stop() {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
  }

  private poll() {
    const idleSeconds = powerMonitor.getSystemIdleTime();
    const event = nextEvent(this.current, {
      locked: this.locked,
      idleSeconds,
      idleThresholdSeconds: IDLE_THRESHOLD_SECONDS,
    });
    if (event) {
      void this.emit(event);
    }
  }

  private async emit(eventType: ActivityEventType) {
    if (eventType !== "UNLOCKED" && this.current === eventType) {
      return;
    }
    await sendEvent(this.credentials, eventType);
    this.current = heartbeatStatusFrom(eventType);
    this.onStatus(eventType === "UNLOCKED" ? "UNLOCKED" : this.current);
  }
}
