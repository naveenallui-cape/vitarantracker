"use client";

import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { api, formatTimestamp, listFrom } from "@/lib/api";
import type { Device, DeviceAssignment } from "@/lib/types";

export function DeviceDetailClient({
  deviceId,
  initialDevice,
  initialHistory,
  initialError = "",
}: {
  deviceId: string;
  initialDevice: Device | null;
  initialHistory: DeviceAssignment[];
  initialError?: string;
}) {
  const [device, setDevice] = useState<Device | null>(initialDevice);
  const [history, setHistory] = useState<DeviceAssignment[]>(initialHistory);
  const [error, setError] = useState(initialError);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [showReassign, setShowReassign] = useState(false);

  async function load() {
    const [nextDevice, nextHistory] = await Promise.all([
      api<Device>(`/admin/devices/${deviceId}`),
      api<DeviceAssignment[]>(`/admin/devices/${deviceId}/history`),
    ]);
    setDevice(nextDevice);
    setHistory(listFrom<DeviceAssignment>(nextHistory));
  }

  async function revoke() {
    await api(`/admin/devices/${deviceId}/revoke`, { method: "POST" });
    await load();
  }

  async function replace() {
    const result = await api<{
      revokedDeviceId: string;
      registrationCode: { code: string; expiresAt: string };
    }>(`/admin/devices/${deviceId}/replace`, { method: "POST" });
    setCode(result.registrationCode);
    await load();
  }

  if (!device) {
    return <p>{error || "Device not found."}</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">{device.deviceName}</h1>
      <p className="mt-1 text-sm text-[#5d6b63]">
        {device.hostname} · Windows · agent {device.agentVersion}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={device.status} />
        <StatusBadge kind="activity" status={device.currentActivityStatus} />
      </div>
      {error ? <p className="mt-4 text-sm text-[#9a3b32]">{error}</p> : null}
      {code ? (
        <div className="mt-6 rounded-2xl border border-[#1f6f4a] bg-[#e4f3ea] p-5">
          <p className="text-sm">New Windows registration code, shown once.</p>
          <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{code.code}</p>
          <p className="mt-1 text-xs">Expires {formatTimestamp(code.expiresAt)}</p>
        </div>
      ) : null}
      <dl className="mt-6 grid gap-3 rounded-2xl bg-[var(--panel)] p-5 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-xs uppercase text-[#5d6b63]">Employee</dt>
          <dd>{device.employee?.name} ({device.employee?.employeeId})</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[#5d6b63]">Registered</dt>
          <dd>{formatTimestamp(device.registeredAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[#5d6b63]">Last seen</dt>
          <dd>{formatTimestamp(device.lastSeenAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-[#5d6b63]">Revoked</dt>
          <dd>{formatTimestamp(device.revokedAt)}</dd>
        </div>
      </dl>
      {device.status !== "REVOKED" ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => void revoke().catch((reason: Error) => setError(reason.message))}
            className="rounded-lg border border-[#9a3b32] px-4 py-2 text-sm text-[#9a3b32]"
          >
            Unlink device
          </button>
          <button
            onClick={() => void replace().catch((reason: Error) => setError(reason.message))}
            className="rounded-lg bg-[#14231c] px-4 py-2 text-sm text-white"
          >
            Replace laptop
          </button>
          <button
            onClick={() => setShowReassign(true)}
            className="rounded-lg border border-[#d9d4c8] bg-white px-4 py-2 text-sm"
          >
            Reassign
          </button>
        </div>
      ) : null}
      <h2 className="mt-8 mb-3 text-lg font-semibold">Ownership history</h2>
      <div className="overflow-hidden rounded-2xl bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#d9d4c8] text-xs uppercase text-[#5d6b63]">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Unassigned</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-[#efeae0]">
                <td className="px-4 py-3">
                  {row.employee?.name} ({row.employee?.employeeId})
                </td>
                <td className="px-4 py-3">{formatTimestamp(row.assignedAt)}</td>
                <td className="px-4 py-3">{formatTimestamp(row.unassignedAt)}</td>
                <td className="px-4 py-3">{row.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showReassign ? (
        <ReassignModal
          onClose={() => setShowReassign(false)}
          onSubmit={async (newEmployeeId, reason) => {
            const result = await api<{
              registrationCode: { code: string; expiresAt: string };
            }>(`/admin/devices/${deviceId}/reassign`, {
              method: "POST",
              body: JSON.stringify({ newEmployeeId, reason }),
            });
            setCode(result.registrationCode);
            setShowReassign(false);
            await load();
          }}
        />
      ) : null}
    </>
  );
}

function ReassignModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (employeeId: string, reason: string) => Promise<void>;
}) {
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await onSubmit(String(form.get("newEmployeeId")), String(form.get("reason") ?? ""));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reassign failed");
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#14231c]/40 px-4">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold">Reassign Windows laptop</h2>
        <p className="mt-2 text-sm text-[#5d6b63]">
          Historical ownership stays. The old token is revoked immediately.
        </p>
        <input
          name="newEmployeeId"
          required
          placeholder="EMP002 or employee UUID"
          className="mt-4 w-full rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm"
        />
        <input
          name="reason"
          placeholder="Employee transfer"
          className="mt-3 w-full rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm"
        />
        {error ? <p className="mt-3 text-sm text-[#9a3b32]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">
            Cancel
          </button>
          <button className="rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm text-white">
            Reassign
          </button>
        </div>
      </form>
    </div>
  );
}
