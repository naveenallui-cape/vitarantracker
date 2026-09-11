"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { api, listFrom } from "@/lib/api";
import type { Employee, Paginated } from "@/lib/types";

export function EmployeesClient({
  initialEmployees,
  initialError = "",
}: {
  initialEmployees: Employee[];
  initialError?: string;
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(initialError);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const query = new URLSearchParams({ limit: "100" });
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    const result = await api<Paginated<Employee>>(
      `/admin/employees?${query.toString()}`,
    );
    setEmployees(listFrom<Employee>(result));
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Employees</h1>
          <p className="mt-2 text-sm text-[#5d6b63]">
            Register company laptops against an employee, not personal
            accounts.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm font-medium text-white"
        >
          Add employee
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ID, name, email, department"
          className="min-w-64 flex-1 rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <button
          onClick={() =>
            void load().catch((reason: Error) => setError(reason.message))
          }
          className="rounded-lg border border-[#d9d4c8] bg-white px-4 py-2 text-sm"
        >
          Search
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-[#9a3b32]">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl bg-[var(--panel)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#d9d4c8] text-xs uppercase tracking-wide text-[#5d6b63]">
            <tr>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-sm text-[#5d6b63]">
                  No employees yet. Use Add employee to create the first record.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="border-t border-[#efeae0]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="font-medium text-[#1f6f4a]"
                    >
                      {employee.employeeId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{employee.name}</td>
                  <td className="px-4 py-3">{employee.department}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={employee.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showForm ? (
        <CreateEmployeeModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
        />
      ) : null}
    </AppShell>
  );
}

function CreateEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await api("/admin/employees", {
        method: "POST",
        body: JSON.stringify({
          employeeId: form.get("employeeId"),
          name: form.get("name"),
          email: form.get("email"),
          department: form.get("department"),
          designation: form.get("designation"),
        }),
      });
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#14231c]/40 px-4">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-lg rounded-2xl bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Add employee</h2>
        <div className="mt-4 grid gap-3">
          <input name="employeeId" required placeholder="EMP001" className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
          <input name="name" required placeholder="Name" className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
          <input name="department" required placeholder="Department" className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
          <input name="designation" required placeholder="Designation" className="rounded-lg border border-[#d9d4c8] px-3 py-2 text-sm" />
        </div>
        {error ? <p className="mt-3 text-sm text-[#9a3b32]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#1f6f4a] px-4 py-2 text-sm text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
