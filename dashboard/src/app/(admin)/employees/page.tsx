import { EmployeesClient } from "./employees-client";
import { listFrom } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Employee, Paginated } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  let employees: Employee[] = [];
  let error = "";

  try {
    const result = await serverApi<Paginated<Employee>>(
      "/admin/employees?limit=100",
    );
    employees = listFrom<Employee>(result);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Could not load employees";
  }

  return (
    <EmployeesClient initialEmployees={employees} initialError={error} />
  );
}
