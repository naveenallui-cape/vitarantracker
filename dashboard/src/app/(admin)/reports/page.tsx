import { ReportsClient } from "./reports-client";
import { serverApi } from "@/lib/server-api";
import type { WorkTimeReport } from "@/lib/types";

export const dynamic = "force-dynamic";

function utcDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage() {
  const from = utcDate(0);
  const to = utcDate(0);
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
