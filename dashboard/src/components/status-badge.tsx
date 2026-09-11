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

export function StatusBadge({
  status,
}: {
  status: ActivityStatus | DeviceStatus | EmployeeStatus | "UNLOCKED";
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}
