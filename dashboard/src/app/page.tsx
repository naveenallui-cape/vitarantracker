"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { api, formatTimestamp } from "@/lib/api";
import type { Device, LiveActivity, Paginated } from "@/lib/types";

export default function LivePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<LiveActivity[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void api<Paginated<Device>>("/admin/devices?limit=100")
      .then((result) => {
        if (!cancelled) {
          setDevices(result.data);
        }
      })
      .catch((reason: Error) => setError(reason.message));

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000",
      { transports: ["websocket", "polling"] },
    );
    socket.on("tracker.activity.updated", (payload: LiveActivity) => {
      setEvents((current) => [payload, ...current].slice(0, 40));
      setDevices((current) =>
        current.map((device) =>
          device.id === payload.deviceId
            ? {
                ...device,
                currentActivityStatus:
                  payload.status === "UNLOCKED" ? "ACTIVE" : payload.status,
                lastSeenAt: payload.timestamp,
                status: device.status === "REVOKED" ? "REVOKED" : "ACTIVE",
              }
            : device,
        ),
      );
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  const counts = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        acc[device.currentActivityStatus] += 1;
        return acc;
      },
      { ACTIVE: 0, IDLE: 0, LOCKED: 0, OFFLINE: 0 },
    );
  }, [devices]);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Live activity</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5d6b63]">
          Status updates from Windows laptops. This dashboard never shows
          keystrokes, typed text, screenshots, URLs, or mouse coordinates.
        </p>
      </div>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {(["ACTIVE", "IDLE", "LOCKED", "OFFLINE"] as const).map((status) => (
          <div
            key={status}
            className="rounded-2xl bg-[var(--panel)] p-5 shadow-[0_8px_30px_rgba(20,35,28,0.04)]"
          >
            <p className="text-xs uppercase tracking-wide text-[#5d6b63]">
              {status}
            </p>
            <p className="mt-2 text-3xl font-semibold">{counts[status]}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="overflow-hidden rounded-2xl bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#d9d4c8] text-xs uppercase tracking-wide text-[#5d6b63]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-t border-[#efeae0]">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {device.employee?.name ?? "—"}
                    </div>
                    <div className="text-xs text-[#5d6b63]">
                      {device.employee?.employeeId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{device.deviceName}</div>
                    <div className="text-xs text-[#5d6b63]">
                      {device.hostname} · Windows
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        device.status === "REVOKED"
                          ? "REVOKED"
                          : device.currentActivityStatus
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-[#5d6b63]">
                    {formatTimestamp(device.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-2xl bg-[var(--panel)] p-5">
          <h2 className="text-sm font-semibold">Live events</h2>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-[#5d6b63]">
                Waiting for tracker heartbeats and state changes.
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={`${event.deviceId}-${event.timestamp}-${index}`}
                  className="flex items-center justify-between text-sm"
                >
                  <StatusBadge status={event.status} />
                  <span className="text-xs text-[#5d6b63]">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
