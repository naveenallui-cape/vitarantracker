import { powerMonitor } from "electron";
import {
  heartbeatStatusFrom,
  nextEvent,
  type ActivityEventType,
  type HeartbeatStatus,
} from "./state-machine";
import type { DeviceCredentials } from "./store";
import {
  flushQueue,
  sendEvent,
  sendHeartbeat,
  type PostResult,
} from "./api";

const IDLE_THRESHOLD_SECONDS = Number(process.env.IDLE_THRESHOLD_MINUTES ?? 5) * 60;
const HEARTBEAT_INTERVAL_MS = 60_000;
const POLL_INTERVAL_MS = 5_000;

export class ActivityMonitor {
  private current: HeartbeatStatus = "ACTIVE";
  private locked = false;
  private timers: NodeJS.Timeout[] = [];
  private unlinked = false;

  constructor(
    private readonly credentials: DeviceCredentials,
    private readonly onStatus: (status: HeartbeatStatus | "UNLOCKED") => void,
    private readonly onUnlinked?: () => void,
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
        void this.beat();
      }, HEARTBEAT_INTERVAL_MS),
    );

    void this.emit("ACTIVE");
    void this.beat();
  }

  stop() {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
  }

  private poll() {
    if (this.unlinked) {
      return;
    }
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

  private async beat() {
    if (this.unlinked) {
      return;
    }
    const heartbeat = await sendHeartbeat(this.credentials, this.current);
    if (this.handleResult(heartbeat)) {
      return;
    }
    const flushed = await flushQueue(this.credentials);
    this.handleResult(flushed);
  }

  private async emit(eventType: ActivityEventType) {
    if (this.unlinked) {
      return;
    }
    if (eventType !== "UNLOCKED" && this.current === eventType) {
      return;
    }
    const result = await sendEvent(this.credentials, eventType);
    if (this.handleResult(result)) {
      return;
    }
    this.current = heartbeatStatusFrom(eventType);
    this.onStatus(eventType === "UNLOCKED" ? "UNLOCKED" : this.current);
  }

  private handleResult(result: PostResult) {
    if (!result.unlinked || this.unlinked) {
      return result.unlinked;
    }
    this.unlinked = true;
    this.stop();
    this.onUnlinked?.();
    return true;
  }
}
