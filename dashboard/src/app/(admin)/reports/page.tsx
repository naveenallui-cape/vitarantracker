import { ReportsClient } from "./reports-client";
import { serverApi } from "@/lib/server-api";
import { todayInWorkTimezone } from "@/lib/work-day";
import type { WorkTimeReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const from = todayInWorkTimezone();
  const to = todayInWorkTimezone();
  let report: WorkTimeReport | null = null;
  let error = "";

  try {
    report = await serverApi<WorkTimeReport>(
      `/admin/reports/work-time?from=${from}&to=${to}`,
    );
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load daily work";
  }

  return (
    <ReportsClient
      initialReport={report}
      initialFrom={from}
      initialTo={to}
      initialError={error}
    />
  );
}
