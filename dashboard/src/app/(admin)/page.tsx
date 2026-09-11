import { OverviewClient } from "./overview-client";
import { serverApi } from "@/lib/server-api";
import { todayInWorkTimezone } from "@/lib/work-day";
import type { CompanyOverview, LiveActivity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const date = todayInWorkTimezone();
  let overview: CompanyOverview | null = null;
  let events: LiveActivity[] = [];
  let error = "";

  try {
    const [nextOverview, liveEvents] = await Promise.all([
      serverApi<CompanyOverview>(`/admin/reports/overview?from=${date}&to=${date}`),
      serverApi<LiveActivity[]>("/admin/devices/recent-activity?limit=40"),
    ]);
    overview = nextOverview;
    events = Array.isArray(liveEvents) ? liveEvents : [];
  } catch (reason) {
    error =
      reason instanceof Error ? reason.message : "Could not load company activity";
  }

  return (
    <OverviewClient
      initialOverview={overview}
      initialEvents={events}
      initialError={error}
    />
  );
}
