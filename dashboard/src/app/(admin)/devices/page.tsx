import { DevicesClient } from "./devices-client";
import { listFrom } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Device, Paginated } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  let devices: Device[] = [];
  let error = "";

  try {
    const result = await serverApi<Paginated<Device>>(
      "/admin/devices?limit=100",
    );
    devices = listFrom<Device>(result);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load devices";
  }

  return <DevicesClient initialDevices={devices} initialError={error} />;
}
