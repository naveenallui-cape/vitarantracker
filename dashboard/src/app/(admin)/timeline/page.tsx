import { TimelineClient } from "./timeline-client";
import { serverApi } from "@/lib/server-api";
import { todayInWorkTimezone } from "@/lib/work-day";
import type { DayTimeline } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const date = todayInWorkTimezone();
  let timeline: DayTimeline | null = null;
  let error = "";

  try {
    timeline = await serverApi<DayTimeline>(
      `/admin/reports/timeline?from=${date}&to=${date}`,
    );
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load timeline";
  }

  return (
    <TimelineClient
      initialTimeline={timeline}
      initialDate={date}
      initialError={error}
    />
  );
}
