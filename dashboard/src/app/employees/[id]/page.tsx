"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { api, formatDuration, formatTimestamp } from "@/lib/api";
import type { Device, Employee } from "@/lib/types";

type WorkTime = {
  employee: { employeeId: string; name: string; department: string } | null;
  summaries: Array<{
    date: string;
    activeSeconds: number;
    idleSeconds: number;
    lockedSeconds: number;
    totalTrackedSeconds: number;
    firstActiveAt: string | null;
    lastActivityAt: string | null;
  }>;
  totals: {
    activeSeconds: number;
    idleSeconds: number;
    lockedSeconds: number;
    totalTrackedSeconds: number;
  };
};

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [work, setWork] = useState<WorkTime | null>(null);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(
    null,
  );
  const [error, setError] = useState("");

  async function load() {
    const [nextEmployee, nextDevices, nextWork] = await Promise.all([
      api<Employee>(`/admin/employees/${params.id}`),
      api<Device[]>(`/admin/employees/${params.id}/devices`),
      api<WorkTime>(`/admin/employees/${params.id}/work-time`),
    ]);
    setEmployee(nextEmployee);
    setDevices(nextDevices);
    setWork(nextWork);
  }

  useEffect(() => {
    void load().catch((reason: Error) => setError(reason.message));
  }, [params.id]);

  async function generateCode() {
    const result = await api<{ code: string; expiresAt: string }>(
      `/admin/employees/${params.id}/device-registration-code`,
      { method: "POST" },
    );
    setCode(result);
  }

  async function toggleStatus() {
    if (!employee) return;
    await api(`/admin/employees/${employee.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    });
    await load();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;
    const form = new FormData(event.currentTarget);
    await api(`/admin/employees/${employee.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        department: form.get("department"),
        designation: form.get("designation"),
      }),
    });
    await load();
  }

  if (!employee) {
    return (
      <AppShell>
        <p>{error || "Loading..."}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{employee.name}</h1>
          <p className="mt-1 text-sm text-[#5d6b63]">
            {employee.employeeId} · {employee.department}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void generateCode().catch((reason: Error) => setError(reason.message))}
            className="rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm text-white"
          >
            Generate registration code
          </button>
          <button
            onClick={() => void toggleStatus().catch((reason: Error) => setError(reason.message))}
            className="rounded-lg border border-[#d9d4c8] bg-white px-4 py-2 text-sm"
          >
            {employee.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      {code ? (
        <div className="mb-6 rounded-2xl border border-[#1f6f4a] bg-[#e4f3ea] p-5">
          <p className="text-sm font-medium">Give this code to the Windows tracker. It is shown once.</p>
          <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{code.code}</p>
          <p className="mt-1 text-xs text-[#5d6b63]">
            Expires {formatTimestamp(code.expiresAt)}
          </p>
        </div>
      ) : null}
      <form
        onSubmit={(event) => void save(event)}
        className="mb-8 grid gap-3 rounded-2xl bg-[var(--panel)] p-5 sm:grid-cols-2"
      >
        <input name="name" defaultValue={employee.name} className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
        <input name="email" defaultValue={employee.email} className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
        <input name="department" defaultValue={employee.department} className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
        <input name="designation" defaultValue={employee.designation} className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
        <button className="sm:col-span-2 w-fit rounded-lg bg-[#14231c] px-4 py-2 text-sm text-white">
          Save profile
        </button>
      </form>
      <h2 className="mb-3 text-lg font-semibold">Windows devices</h2>
      <div className="mb-8 overflow-hidden rounded-2xl bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#d9d4c8] text-xs uppercase text-[#5d6b63]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-t border-[#efeae0]">
                <td className="px-4 py-3">
                  <a href={`/devices/${device.id}`} className="text-[#1f6f4a]">
                    {device.deviceName}
                  </a>
                  <div className="text-xs text-[#5d6b63]">{device.hostname}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.currentActivityStatus} />
                </td>
                <td className="px-4 py-3">{formatTimestamp(device.lastSeenAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Work time</h2>
      <p className="mb-3 text-sm text-[#5d6b63]">
        Computer activity, not proof of continuous work. Active{" "}
        {formatDuration(work?.totals.activeSeconds ?? 0)} · Idle{" "}
        {formatDuration(work?.totals.idleSeconds ?? 0)} · Locked{" "}
        {formatDuration(work?.totals.lockedSeconds ?? 0)}
      </p>
      <div className="overflow-hidden rounded-2xl bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#d9d4c8] text-xs uppercase text-[#5d6b63]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Idle</th>
              <th className="px-4 py-3">Locked</th>
            </tr>
          </thead>
          <tbody>
            {work?.summaries.map((row) => (
              <tr key={row.date} className="border-t border-[#efeae0]">
                <td className="px-4 py-3">{row.date.slice(0, 10)}</td>
                <td className="px-4 py-3">{formatDuration(row.activeSeconds)}</td>
                <td className="px-4 py-3">{formatDuration(row.idleSeconds)}</td>
                <td className="px-4 py-3">{formatDuration(row.lockedSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
