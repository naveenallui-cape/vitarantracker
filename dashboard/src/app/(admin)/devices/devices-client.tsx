"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { api, formatTimestamp, listFrom } from "@/lib/api";
import type { Device, Paginated } from "@/lib/types";

export function DevicesClient({
  initialDevices,
  initialError = "",
}: {
  initialDevices: Device[];
  initialError?: string;
}) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(initialError);

  async function load() {
    const query = new URLSearchParams({ limit: "100" });
    if (status) query.set("status", status);
    if (search) query.set("search", search);
    const result = await api<Paginated<Device>>(`/admin/devices?${query}`);
    setDevices(listFrom<Device>(result));
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">Windows devices</h1>
      <p className="mt-2 mb-6 text-sm text-[#5d6b63]">
        Device tokens are never displayed. Revoked laptops keep their history.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search device, hostname, employee"
          className="min-w-64 flex-1 rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="OFFLINE">OFFLINE</option>
          <option value="REVOKED">REVOKED</option>
        </select>
        <button
          onClick={() => void load().catch((reason: Error) => setError(reason.message))}
          className="rounded-lg border border-[#d9d4c8] bg-white px-4 py-2 text-sm"
        >
          Filter
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#d9d4c8] text-xs uppercase text-[#5d6b63]">
            <tr>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">OS</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-sm text-[#5d6b63]">
                  No Windows devices registered yet.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="border-t border-[#efeae0]">
                  <td className="px-4 py-3">
                    <Link href={`/devices/${device.id}`} className="font-medium text-[#1f6f4a]">
                      {device.deviceName}
                    </Link>
                    <div className="text-xs text-[#5d6b63]">{device.hostname}</div>
                  </td>
                  <td className="px-4 py-3">
                    {device.employee?.name}
                    <div className="text-xs text-[#5d6b63]">
                      {device.employee?.employeeId}
                    </div>
                  </td>
                  <td className="px-4 py-3">Windows</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge kind="activity" status={device.currentActivityStatus} />
                  </td>
                  <td className="px-4 py-3">{formatTimestamp(device.lastSeenAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
