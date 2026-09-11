import { EmployeeDetailClient, type WorkTime } from "./employee-detail-client";
import { listFrom } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Device, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 13);
  const from = fromDate.toISOString().slice(0, 10);
  let employee: Employee | null = null;
  let devices: Device[] = [];
  let work: WorkTime | null = null;
  let error = "";

  try {
    const [nextEmployee, nextDevices, nextWork] = await Promise.all([
      serverApi<Employee>(`/admin/employees/${id}`),
      serverApi<Device[]>(`/admin/employees/${id}/devices`),
      serverApi<WorkTime>(
        `/admin/employees/${id}/work-time?from=${from}&to=${to}`,
      ),
    ]);
    employee = nextEmployee;
    devices = listFrom<Device>(nextDevices);
    work = nextWork;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load employee";
  }

  return (
    <EmployeeDetailClient
      employeeId={id}
      initialEmployee={employee}
      initialDevices={devices}
      initialWork={work}
      initialError={error}
    />
  );
}
