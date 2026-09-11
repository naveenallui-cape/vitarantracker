import { DeviceDetailClient } from "./device-detail-client";
import { listFrom } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Device, DeviceAssignment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let device: Device | null = null;
  let history: DeviceAssignment[] = [];
  let error = "";

  try {
    const [nextDevice, nextHistory] = await Promise.all([
      serverApi<Device>(`/admin/devices/${id}`),
      serverApi<DeviceAssignment[]>(`/admin/devices/${id}/history`),
    ]);
    device = nextDevice;
    history = listFrom<DeviceAssignment>(nextHistory);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load device";
  }

  return (
    <DeviceDetailClient
      deviceId={id}
      initialDevice={device}
      initialHistory={history}
      initialError={error}
    />
  );
}
