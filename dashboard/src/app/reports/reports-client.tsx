"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api, formatDuration, formatTimestamp } from "@/lib/api";
import type { WorkTimeReport } from "@/lib/types";

export function ReportsClient({
  initialReport,
  initialFrom,
  initialTo,
  initialError = "",
}: {
  initialReport: WorkTimeReport | null;
  initialFrom: string;
  initialTo: string;
  initialError?: string;
}) {
  const [report, setReport] = useState<WorkTimeReport | null>(initialReport);
  const [error, setError] = useState(initialError);

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const key of ["from", "to", "employeeId", "department"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) query.set(key, value);
    }
    try {
      const result = await api<WorkTimeReport>(
        `/admin/reports/work-time?${query.toString()}`,
      );
      setReport(result);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Report failed");
    }
  }

  async function exportCsv(form: HTMLFormElement) {
    const query = new URLSearchParams();
    const data = new FormData(form);
    for (const key of ["from", "to", "employeeId", "department"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) query.set(key, value);
    }
    const response = await fetch(
      `/api/backend/admin/reports/work-time/export?${query}`,
      { cache: "no-store", credentials: "include" },
    );
    if (!response.ok) {
      setError("CSV export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "daily-work-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Daily work</h1>
      <p className="mt-2 mb-6 max-w-3xl text-sm text-[#5d6b63]">
        Admin view of every employee, every day. Active time is keyboard and
        mouse use on the company Windows laptop (Windows last-input time). This
        does not record which keys were pressed, typed text, mouse position,
        screenshots, or websites.
      </p>
      <form
        onSubmit={(event) => void load(event)}
        className="mb-6 grid gap-3 rounded-2xl bg-[var(--panel)] p-5 sm:grid-cols-3"
      >
        <label className="text-sm">
          From
          <input
            name="from"
            type="date"
            defaultValue={initialFrom}
            className="mt-1 w-full rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          To
          <input
            name="to"
            type="date"
            defaultValue={initialTo}
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
        <div className="flex gap-2 self-end">
          <button className="rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm text-white">
            Show days
          </button>
          <button
            type="button"
            onClick={(event) => void exportCsv(event.currentTarget.form!)}
            className="rounded-lg border border-[#d9d4c8] px-4 py-2 text-sm"
          >
            Export CSV
          </button>
        </div>
      </form>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      {report ? (
        <>
          <p className="mb-3 text-sm text-[#5d6b63]">
            Keyboard/mouse {formatDuration(report.totals.activeSeconds)} · Idle{" "}
            {formatDuration(report.totals.idleSeconds)} · Locked{" "}
            {formatDuration(report.totals.lockedSeconds)}
          </p>
          <div className="overflow-x-auto overflow-hidden rounded-2xl bg-[var(--panel)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#d9d4c8] text-xs uppercase text-[#5d6b63]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">First activity</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3">Keyboard/mouse</th>
                  <th className="px-4 py-3">Idle</th>
                  <th className="px-4 py-3">Locked</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-sm text-[#5d6b63]">
                      No employees yet. Add employees, then register Windows
                      trackers to collect daily work time.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr
                      key={`${row.employeeId}-${String(row.date)}`}
                      className="border-t border-[#efeae0]"
                    >
                      <td className="px-4 py-3">
                        {row.employee.name}
                        <div className="text-xs text-[#5d6b63]">
                          {row.employee.employeeId} · {row.employee.department}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {String(row.date).slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        {formatTimestamp(row.firstActiveAt)}
                      </td>
                      <td className="px-4 py-3">
                        {formatTimestamp(row.lastActivityAt)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDuration(row.activeSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDuration(row.idleSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDuration(row.lockedSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDuration(row.totalTrackedSeconds)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
