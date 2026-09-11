"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { api, formatTime } from "@/lib/api";
import type { ActivitySegment, DayTimeline } from "@/lib/types";

const SEGMENT_COLORS: Record<ActivitySegment["status"], string> = {
  ACTIVE: "bg-[#1f6f4a]",
  IDLE: "bg-[#d4a017]",
  LOCKED: "bg-[#8a96a0]",
};

function leftPercent(start: string, dayStart: number, dayMs: number) {
  return Math.max(
    0,
    Math.min(100, ((new Date(start).getTime() - dayStart) / dayMs) * 100),
  );
}

function widthPercent(start: string, end: string, dayMs: number) {
  return Math.max(
    0.4,
    Math.min(
      100,
      ((new Date(end).getTime() - new Date(start).getTime()) / dayMs) * 100,
    ),
  );
}

export function TimelineClient({
  initialTimeline,
  initialDate,
  initialError = "",
}: {
  initialTimeline: DayTimeline | null;
  initialDate: string;
  initialError?: string;
}) {
  const [timeline, setTimeline] = useState<DayTimeline | null>(initialTimeline);
  const [error, setError] = useState(initialError);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date") ?? "").trim();
    const department = String(form.get("department") ?? "").trim();
    const employeeId = String(form.get("employeeId") ?? "").trim();
    const query = new URLSearchParams({ from: date, to: date });
    if (department) query.set("department", department);
    if (employeeId) query.set("employeeId", employeeId);
    try {
      const result = await api<DayTimeline>(
        `/admin/reports/timeline?${query.toString()}`,
      );
      setTimeline(result);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Timeline failed");
    }
  }

  const hours = useMemo(() => {
    if (!timeline) {
      return [];
    }
    const start = new Date(timeline.dayStart).getTime();
    return Array.from({ length: 13 }, (_, index) => {
      const time = new Date(start + index * 2 * 60 * 60 * 1000);
      return time.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    });
  }, [timeline]);
  const dayStart = timeline ? new Date(timeline.dayStart).getTime() : 0;
  const dayMs = 24 * 60 * 60 * 1000;

  return (
    <>
      <h1 className="text-3xl font-semibold">Day timeline</h1>
      <p className="mt-2 mb-6 max-w-3xl text-sm text-[#5d6b63]">
        Every employee’s keyboard/mouse, idle, and locked time for the selected
        day. Green is input activity, yellow is idle (no keyboard or mouse for
        5+ minutes), gray is lock screen.
      </p>
      <form
        onSubmit={(event) => void load(event)}
        className="mb-6 grid gap-3 rounded-2xl bg-[var(--panel)] p-5 sm:grid-cols-4"
      >
        <label className="text-sm">
          Date
          <input
            name="date"
            type="date"
            defaultValue={initialDate}
            className="mt-1 w-full rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm"
          />
        </label>
        <input
          name="employeeId"
          placeholder="Employee ID"
          className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm self-end"
        />
        <input
          name="department"
          placeholder="Department"
          className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm self-end"
        />
        <button className="self-end rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm text-white">
          Show timeline
        </button>
      </form>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-[#5d6b63]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-6 rounded bg-[#1f6f4a]" /> Keyboard/mouse
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-6 rounded bg-[#d4a017]" /> Idle
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-6 rounded bg-[#8a96a0]" /> Locked
        </span>
      </div>
      {timeline ? (
        <div className="overflow-x-auto rounded-2xl bg-[var(--panel)] p-4">
          <div className="mb-2 ml-44 flex justify-between text-[10px] text-[#5d6b63]">
            {hours.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
          <div className="space-y-3">
            {timeline.rows.length === 0 ? (
              <p className="px-2 py-8 text-sm text-[#5d6b63]">
                No employees yet. Add employees and register Windows trackers.
              </p>
            ) : (
              timeline.rows.map((row) => (
                <div key={row.employee.id} className="flex items-center gap-3">
                  <Link
                    href={`/employees/${row.employee.id}`}
                    className="w-40 shrink-0 text-sm text-[#1f6f4a]"
                  >
                    <div className="font-medium">{row.employee.name}</div>
                    <div className="text-xs text-[#5d6b63]">
                      {row.employee.employeeId}
                    </div>
                  </Link>
                  <div className="relative h-7 min-w-[640px] flex-1 rounded-md bg-[#efeae0]">
                    {row.segments.map((segment) => (
                      <div
                        key={`${segment.start}-${segment.end}-${segment.status}`}
                        title={`${segment.status} ${formatTime(segment.start)}–${formatTime(segment.end)}`}
                        className={`absolute top-1 h-5 rounded-sm ${SEGMENT_COLORS[segment.status]}`}
                        style={{
                          left: `${leftPercent(segment.start, dayStart, dayMs)}%`,
                          width: `${widthPercent(segment.start, segment.end, dayMs)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
