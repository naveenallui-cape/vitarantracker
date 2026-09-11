"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { StatusBadge } from "@/components/status-badge";
import { formatDuration, formatTime, formatTimestamp } from "@/lib/api";
import type {
  ActivityStatus,
  CompanyOverview,
  CompanyOverviewEmployee,
  LiveActivity,
} from "@/lib/types";

type PresenceFilter =
  | "ALL"
  | "WORKING"
  | "IDLE"
  | "LOCKED"
  | "OFFLINE"
  | "NO_DEVICE";

function activityFromLive(status: LiveActivity["status"]): ActivityStatus {
  return status === "UNLOCKED" ? "ACTIVE" : status;
}

export function OverviewClient({
  initialOverview,
  initialEvents,
  initialError = "",
}: {
  initialOverview: CompanyOverview | null;
  initialEvents: LiveActivity[];
  initialError?: string;
}) {
  const [overview, setOverview] = useState<CompanyOverview | null>(
    initialOverview,
  );
  const [employees, setEmployees] = useState<CompanyOverviewEmployee[]>(
    initialOverview?.employees ?? [],
  );
  const [events, setEvents] = useState<LiveActivity[]>(initialEvents);
  const [error, setError] = useState(initialError);
  const [filter, setFilter] = useState<PresenceFilter>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setOverview(initialOverview);
    setEmployees(initialOverview?.employees ?? []);
    setEvents(initialEvents);
    setError(initialError);
  }, [initialOverview, initialEvents, initialError]);

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000",
      { transports: ["websocket", "polling"] },
    );
    socket.on("tracker.activity.updated", (payload: LiveActivity) => {
      setEvents((current) => [payload, ...current].slice(0, 40));
      setEmployees((current) =>
        current.map((employee) => {
          const matches =
            employee.id === payload.employeeId ||
            employee.employeeId === payload.employeeCode;
          if (!matches) {
            return employee;
          }
          return {
            ...employee,
            activityStatus: activityFromLive(payload.status),
            lastSeenAt: payload.timestamp,
            hasDevice: true,
            deviceId: payload.deviceId,
          };
        }),
      );
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const counts = useMemo(() => {
    return employees.reduce(
      (acc, employee) => {
        if (!employee.hasDevice) {
          acc.noDevice += 1;
        } else if (employee.activityStatus === "ACTIVE") {
          acc.workingNow += 1;
        } else if (employee.activityStatus === "IDLE") {
          acc.idle += 1;
        } else if (employee.activityStatus === "LOCKED") {
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
  }, [employees]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filter === "WORKING" && employee.activityStatus !== "ACTIVE") {
        return false;
      }
      if (filter === "IDLE" && employee.activityStatus !== "IDLE") {
        return false;
      }
      if (filter === "LOCKED" && employee.activityStatus !== "LOCKED") {
        return false;
      }
      if (
        filter === "OFFLINE" &&
        (employee.activityStatus !== "OFFLINE" || !employee.hasDevice)
      ) {
        return false;
      }
      if (filter === "NO_DEVICE" && employee.hasDevice) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.employeeId.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query)
      );
    });
  }, [employees, filter, search]);

  const cards = [
    { key: "WORKING" as const, label: "Working now", value: counts.workingNow },
    { key: "IDLE" as const, label: "Idle", value: counts.idle },
    { key: "LOCKED" as const, label: "Locked", value: counts.locked },
    { key: "OFFLINE" as const, label: "Offline", value: counts.offline },
    { key: "NO_DEVICE" as const, label: "No tracker", value: counts.noDevice },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Company</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5d6b63]">
          Live keyboard and mouse activity on company Windows laptops. Working
          means input in the last 5 minutes. Idle means no keyboard or mouse.
          This never records keys, typed text, screenshots, websites, or mouse
          position.
        </p>
      </div>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() =>
              setFilter((current) =>
                current === card.key ? "ALL" : card.key,
              )
            }
            className={`rounded-2xl bg-[var(--panel)] p-5 text-left shadow-[0_8px_30px_rgba(20,35,28,0.04)] ${
              filter === card.key ? "ring-2 ring-[#1f6f4a]" : ""
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-[#5d6b63]">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </button>
        ))}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5d6b63]">
            Today keyboard/mouse
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatDuration(overview?.totals.activeSeconds ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5d6b63]">
            Today idle
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatDuration(overview?.totals.idleSeconds ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5d6b63]">
            Today locked
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatDuration(overview?.totals.lockedSeconds ?? 0)}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Search employees
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, ID, or department"
            className="mt-1 block w-72 rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm"
          />
        </label>
        <p className="pb-2 text-sm text-[#5d6b63]">
          {visible.length} of {counts.totalEmployees} employees
          {overview?.date ? ` · ${overview.date}` : ""}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <section className="overflow-x-auto overflow-hidden rounded-2xl bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#d9d4c8] text-xs uppercase tracking-wide text-[#5d6b63]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Now</th>
                <th className="px-4 py-3">First in</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3">Keyboard/mouse</th>
                <th className="px-4 py-3">Idle</th>
                <th className="px-4 py-3">Locked</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-sm text-[#5d6b63]">
                    No employees match this filter. Add employees and register
                    Windows trackers to see working hours.
                  </td>
                </tr>
              ) : (
                visible.map((employee) => (
                  <tr key={employee.id} className="border-t border-[#efeae0]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="font-medium text-[#1f6f4a]"
                      >
                        {employee.name}
                      </Link>
                      <div className="text-xs text-[#5d6b63]">
                        {employee.employeeId} · {employee.department}
                        {employee.deviceName ? ` · ${employee.deviceName}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        kind="activity"
                        status={
                          employee.hasDevice
                            ? employee.activityStatus
                            : "OFFLINE"
                        }
                      />
                      <div className="mt-1 text-xs text-[#5d6b63]">
                        {employee.hasDevice
                          ? formatTimestamp(employee.lastSeenAt)
                          : "No tracker"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatTime(employee.firstActiveAt)}
                    </td>
                    <td className="px-4 py-3">
                      {formatTime(employee.lastActivityAt)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDuration(employee.activeSeconds)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDuration(employee.idleSeconds)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDuration(employee.lockedSeconds)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <section className="rounded-2xl bg-[var(--panel)] p-5">
          <h2 className="text-sm font-semibold">Live activity</h2>
          <p className="mt-1 text-xs text-[#5d6b63]">
            State changes from keyboard, mouse, and lock screen.
          </p>
          <div className="mt-4 space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-[#5d6b63]">
                Waiting for tracker heartbeats and keyboard/mouse state changes.
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={`${event.deviceId}-${event.timestamp}-${index}`}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {event.employeeName ?? event.employeeCode ?? "Employee"}
                    </div>
                    <div className="text-xs text-[#5d6b63]">
                      {event.employeeCode}
                      {event.department ? ` · ${event.department}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge kind="activity" status={event.status} />
                    <div className="mt-1 text-xs text-[#5d6b63]">
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
