import { LiveClient } from "./live-client";
import { listFrom } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Device, LiveActivity, Paginated } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  let devices: Device[] = [];
  let events: LiveActivity[] = [];
  let error = "";

  try {
    const [deviceResult, liveEvents] = await Promise.all([
      serverApi<Paginated<Device>>("/admin/devices?limit=100"),
      serverApi<LiveActivity[]>("/admin/devices/recent-activity?limit=40"),
    ]);
    devices = listFrom<Device>(deviceResult);
    events = Array.isArray(liveEvents) ? liveEvents : [];
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load activity";
  }

  return (
    <LiveClient
      initialDevices={devices}
      initialEvents={events}
      initialError={error}
    />
  );
}
