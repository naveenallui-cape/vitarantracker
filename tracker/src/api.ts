import os from "node:os";
import { randomUUID } from "node:crypto";
import type { ActivityEventType, HeartbeatStatus } from "./state-machine";
import type { DeviceCredentials } from "./store";
import { enqueue, loadQueue, removeFromQueue } from "./queue";

const AGENT_VERSION = "1.0.0";

export type PostResult = {
  ok: boolean;
  unlinked: boolean;
};

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function registerDevice(input: {
  backendUrl: string;
  employeeId: string;
  registrationCode: string;
  deviceName: string;
}) {
  const response = await fetch(joinUrl(input.backendUrl, "/api/devices/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: input.employeeId.trim(),
      registrationCode: input.registrationCode.trim().toUpperCase(),
      deviceName: input.deviceName.trim() || os.hostname(),
      hostname: os.hostname(),
      agentVersion: AGENT_VERSION,
    }),
  });

  const body = (await response.json()) as {
    success?: boolean;
    deviceId?: string;
    deviceToken?: string;
    message?: string;
  };

  if (!response.ok || !body.deviceId || !body.deviceToken) {
    throw new Error(body.message ?? "Registration failed");
  }

  return {
    deviceId: body.deviceId,
    deviceToken: body.deviceToken,
    deviceName: input.deviceName.trim() || os.hostname(),
  };
}

export async function sendEvent(
  credentials: DeviceCredentials,
  eventType: ActivityEventType,
  occurredAt = new Date(),
): Promise<PostResult> {
  const event = {
    eventId: randomUUID(),
    eventType,
    occurredAt: occurredAt.toISOString(),
  };

  const result = await postJson(credentials, "/api/tracker/events", event);
  if (!result.ok && !result.unlinked) {
    enqueue(event);
  }
  return result;
}

export async function sendHeartbeat(
  credentials: DeviceCredentials,
  status: HeartbeatStatus,
) {
  return postJson(credentials, "/api/tracker/heartbeat", {
    status,
    agentVersion: AGENT_VERSION,
    occurredAt: new Date().toISOString(),
  });
}

export async function flushQueue(credentials: DeviceCredentials) {
  for (const event of loadQueue()) {
    const result = await postJson(credentials, "/api/tracker/events", event);
    if (result.ok) {
      removeFromQueue(event.eventId);
    }
    if (result.unlinked) {
      return result;
    }
  }
  return { ok: true, unlinked: false };
}

async function postJson(
  credentials: DeviceCredentials,
  path: string,
  payload: Record<string, string>,
): Promise<PostResult> {
  try {
    const response = await fetch(joinUrl(credentials.backendUrl, path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.deviceToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) {
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
      };
      if (
        body.code === "DEVICE_REVOKED" ||
        body.code === "DEVICE_TOKEN_INVALID"
      ) {
        return { ok: false, unlinked: true };
      }
    }
    return {
      ok: response.ok || response.status === 409,
      unlinked: false,
    };
  } catch {
    return { ok: false, unlinked: false };
  }
}
