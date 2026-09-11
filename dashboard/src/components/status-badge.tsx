import type { ActivityStatus, DeviceStatus, EmployeeStatus } from "@/lib/types";

const STYLES: Record<string, string> = {
  ACTIVE: "bg-[#e4f3ea] text-[#1f6f4a]",
  IDLE: "bg-[#f7edd8] text-[#8a5a12]",
  LOCKED: "bg-[#eceff3] text-[#44515a]",
  UNLOCKED: "bg-[#e4f3ea] text-[#1f6f4a]",
  OFFLINE: "bg-[#f8e4e1] text-[#9a3b32]",
  REVOKED: "bg-[#f3e4e4] text-[#7a2e2e]",
  INACTIVE: "bg-[#eceff3] text-[#44515a]",
};

const ACTIVITY_LABELS: Record<string, string> = {
  ACTIVE: "Keyboard/mouse",
  IDLE: "Idle",
  LOCKED: "Locked",
  UNLOCKED: "Keyboard/mouse",
  OFFLINE: "Offline",
};

export function StatusBadge({
  status,
  kind,
}: {
  status: ActivityStatus | DeviceStatus | EmployeeStatus | "UNLOCKED";
  kind?: "activity";
}) {
  const label = kind === "activity" ? (ACTIVITY_LABELS[status] ?? status) : status;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </span>
  );
}
