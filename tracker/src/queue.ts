import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { ActivityEventType } from "./state-machine";

export type QueuedEvent = {
  eventId: string;
  eventType: ActivityEventType;
  occurredAt: string;
};

function queuePath() {
  return path.join(app.getPath("userData"), "event-queue.json");
}

export function loadQueue(): QueuedEvent[] {
  const target = queuePath();
  if (!fs.existsSync(target)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(target, "utf8")) as QueuedEvent[];
  } catch {
    return [];
  }
}

export function saveQueue(events: QueuedEvent[]) {
  fs.writeFileSync(queuePath(), JSON.stringify(events));
}

export function enqueue(event: QueuedEvent) {
  const events = loadQueue();
  if (events.some((item) => item.eventId === event.eventId)) {
    return;
  }
  events.push(event);
  saveQueue(events);
}

export function removeFromQueue(eventId: string) {
  saveQueue(loadQueue().filter((item) => item.eventId !== eventId));
}
