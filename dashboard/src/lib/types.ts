export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type DeviceStatus = "ACTIVE" | "OFFLINE" | "REVOKED";
export type ActivityStatus = "ACTIVE" | "IDLE" | "LOCKED" | "OFFLINE";

export type Admin = {
  id: string;
  name: string;
  email: string;
};

export type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Device = {
  id: string;
  employeeId: string;
  deviceName: string;
  hostname: string;
  operatingSystem: "WINDOWS";
  agentVersion: string;
  status: DeviceStatus;
  currentActivityStatus: ActivityStatus;
  lastSeenAt: string | null;
  registeredAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    status: EmployeeStatus;
  };
  deviceAssignments?: DeviceAssignment[];
};

export type DeviceAssignment = {
  id: string;
  deviceId: string;
  employeeId: string;
  assignedAt: string;
  unassignedAt: string | null;
  reason: string | null;
  createdAt: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
  };
};

export type DailyWorkSummary = {
  id: string;
  employeeId: string;
  date: string;
  firstActiveAt: string | null;
  lastActivityAt: string | null;
  activeSeconds: number;
  idleSeconds: number;
  lockedSeconds: number;
  totalTrackedSeconds: number;
};

export type WorkTimeReport = {
  filters: Record<string, string | undefined>;
  rows: Array<DailyWorkSummary & { employee: Employee }>;
  totals: {
    activeSeconds: number;
    idleSeconds: number;
    lockedSeconds: number;
    totalTrackedSeconds: number;
  };
};

export type LiveActivity = {
  employeeId: string;
  deviceId: string;
  status: "ACTIVE" | "IDLE" | "LOCKED" | "UNLOCKED";
  timestamp: string;
};

export type ApiError = {
  success: false;
  message: string;
  code: string;
};
