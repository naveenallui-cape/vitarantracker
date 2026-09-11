# Vitarantracker Backend

Privacy-safe REST and Socket.IO backend for tracking **activity and inactivity state** on **company-owned Windows laptops**.

The companion apps live beside this folder:

- `../dashboard` — Next.js admin dashboard
- `../tracker` — Windows Electron agent

This folder is the API only.

Employees must be informed that activity tracking is enabled on company-owned devices.

## 1. Project overview

Vitarantracker records only:

- whether keyboard activity occurred (not which keys)
- whether mouse activity occurred (not coordinates)
- idle duration
- active / idle / locked / unlocked / offline state
- device heartbeats

It never accepts, stores, or logs:

- keystrokes or typed text
- passwords
- screenshots
- webcam or microphone data
- clipboard contents
- browser history, URLs, or window titles
- file names
- mouse coordinates

Work time is calculated from activity-state transitions. It is **not** proof of continuous productive work and is **not** `login time - logout time`.

There is exactly **one admin**. There is no role or permission system.

## 2. Requirements

- Node.js 20+
- npm
- PostgreSQL 14+
- Windows laptops only for the future tracker (this backend always stores `WINDOWS`)

## 3. Installation

```bash
cd backend
npm install
```

Create `backend/.env` for local or production and set real secrets before starting the server.

## 4. PostgreSQL setup

Create a database and user, then put the connection string in `DATABASE_URL`.

```sql
CREATE USER vitarantracker WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE vitarantracker OWNER vitarantracker;
```

Example:

```env
DATABASE_URL=postgresql://vitarantracker:choose-a-strong-password@localhost:5432/vitarantracker
```

## 5. Environment variables

Create `.env` in this folder. Use the same filename locally and in production, with the values for that environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Admin JWT signing secret (32+ characters) |
| `DEVICE_TOKEN_SECRET` | HMAC secret for device tokens and registration codes (32+ characters) |
| `PORT` | HTTP port (default `4000`) |
| `CORS_ORIGIN` | Comma-separated allowed origins. Empty allows all origins in development |
| `IDLE_THRESHOLD_MINUTES` | Idle threshold advertised to the future tracker (default `5`) |
| `HEARTBEAT_INTERVAL_SECONDS` | Expected heartbeat interval (default `60`) |
| `OFFLINE_GRACE_SECONDS` | Missed-heartbeat grace period before OFFLINE (default `180`) |
| `ADMIN_NAME` | Seeded single admin name |
| `ADMIN_EMAIL` | Seeded single admin email |
| `ADMIN_PASSWORD` | Seeded single admin password (never stored in plaintext) |

Never commit a real `.env` file.

## 6. Prisma migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

`prisma:migrate` runs `prisma migrate dev` and applies the schema to PostgreSQL.

## 7. Prisma seed

```bash
npm run prisma:seed
```

This creates exactly one admin from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The password is hashed with bcrypt. If an admin already exists, the seed updates that record instead of creating a second admin.

## 8. Development server

```bash
npm run start:dev
```

API base URL: `http://localhost:4000/api`

Health: `GET http://localhost:4000/api/health`

## 9. Production build

```bash
npm run prisma:generate
npm run build
```

## 10. Production start

```bash
npm run start:prod
```

Serve this process behind HTTPS (nginx, a load balancer, or a platform TLS terminator). The app trusts `X-Forwarded-*` so rate limiting works behind a proxy.

## 11. API structure

All HTTP routes use the `/api` prefix.

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- ` /api/admin/employees`
- ` /api/admin/devices`
- ` /api/admin/reports`
- `POST /api/devices/register`
- `POST /api/tracker/events`
- `POST /api/tracker/heartbeat`

Errors always look like:

```json
{
  "success": false,
  "message": "Registration code has expired",
  "code": "REGISTRATION_CODE_EXPIRED"
}
```

## 12. Single-admin authentication

1. Seed the admin.
2. `POST /api/auth/login` with email and password.
3. Use `Authorization: Bearer <accessToken>` on every `/api/admin/*` route and `GET /api/auth/me`.

There is no self-registration and no admin management API.

## 13. Employee management

Admin JWT required.

- `GET /api/admin/employees` — pagination, search, sorting, department and status filters
- `POST /api/admin/employees`
- `GET /api/admin/employees/:id`
- `PATCH /api/admin/employees/:id`
- `PATCH /api/admin/employees/:id/status`
- `GET /api/admin/employees/:id/devices`
- `GET /api/admin/employees/:id/work-time`

Search matches employee ID, name, email, and department. Status is `ACTIVE` or `INACTIVE`. Inactive employees cannot register new Windows devices.

## 14. Registration-code flow

`POST /api/admin/employees/:employeeId/device-registration-code`

The API returns the plaintext code once, for example `AB7K-92PX`, and stores only a hash. Previous unused codes for that employee are invalidated. Default expiry is 15 minutes. Codes are one-time use.

## 15. Windows device registration

Used by the future Windows tracker:

`POST /api/devices/register`

```json
{
  "employeeId": "EMP001",
  "registrationCode": "AB7K-92PX",
  "deviceName": "VITARAN-LAPTOP-001",
  "hostname": "RAHUL-PC",
  "agentVersion": "1.0.0"
}
```

The client cannot send `operatingSystem`. The backend always sets `WINDOWS`.

The request is processed in a database transaction:

1. Validate employee and unused, unexpired code
2. Create the device
3. Mark the code used
4. Create a `DeviceAssignment`
5. Generate a device token, store only the hash
6. Return `{ success, deviceId, deviceToken }` once

## 16. Device authentication

Tracker endpoints require:

```http
Authorization: Bearer DEVICE_TOKEN
```

`DeviceAuthGuard` hashes the token, looks up the device, and rejects missing, invalid, or revoked tokens. Admin APIs never return device tokens.

## 17. Activity tracking architecture

`POST /api/tracker/events`

Allowed `eventType` values: `ACTIVE`, `IDLE`, `LOCKED`, `UNLOCKED`.

`eventId` is unique and makes retries idempotent. Extra fields such as keystrokes, screenshots, URLs, or mouse coordinates are rejected by DTO validation.

## 18. Heartbeat architecture

`POST /api/tracker/heartbeat`

```json
{
  "status": "ACTIVE",
  "agentVersion": "1.0.0",
  "occurredAt": "2026-09-10T09:00:00.000Z"
}
```

Allowed heartbeat statuses: `ACTIVE`, `IDLE`, `LOCKED`.

Expected interval: 60 seconds. A device is **not** marked offline after one missed heartbeat. Offline detection uses `OFFLINE_GRACE_SECONDS` (default 180) and a 30-second scheduled job.

Timestamps more than 5 minutes in the future are rejected. Offline sync may send events up to 30 days old.

## 19. Work-time calculation

`WorkTimeCalculationService` is the source of truth.

Example:

- 09:00 ACTIVE → 10:05 IDLE = 1h 05m
- 10:25 ACTIVE → 13:00 IDLE = 2h 35m
- 13:45 ACTIVE → 18:00 IDLE = 4h 15m
- Total active = 7h 55m

The calculator:

- builds per-device intervals
- splits intervals at UTC midnight
- merges overlapping devices with priority `ACTIVE > LOCKED > IDLE`
- never uses login minus logout
- treats `UNLOCKED` as a return to `ACTIVE`

`DailySummaryService` updates `DailyWorkSummary` incrementally for the affected employee and dates. Admin reports read summaries, not the full event table.

## 20. Laptop replacement

`POST /api/admin/devices/:id/replace`

1. Revoke the old device and rotate its token
2. Close the current assignment (history stays)
3. Generate a new registration code for the same employee
4. The new Windows laptop calls `/api/devices/register`

The old device row is never deleted.

## 21. Device reassignment

`POST /api/admin/devices/:id/reassign`

```json
{
  "newEmployeeId": "EMP002",
  "reason": "Employee transfer"
}
```

The old token is revoked, the current assignment is closed, and a registration code is issued for the new employee. Historical ownership remains on `DeviceAssignment`.

## 22. Device revocation

`POST /api/admin/devices/:id/revoke`

Status becomes `REVOKED`. The token is rotated so it cannot be reused. Tracker event and heartbeat calls fail immediately. Historical activity remains.

A revoked device is never automatically returned to `ACTIVE`.

## 23. Socket.IO events

When the backend accepts an activity event or heartbeat it broadcasts:

`tracker.activity.updated`

```json
{
  "employeeId": "...",
  "deviceId": "...",
  "status": "ACTIVE",
  "timestamp": "..."
}
```

The future admin dashboard can subscribe to this event. The payload never includes tokens, typed text, or other sensitive data.

## 24. Production deployment

1. Provision PostgreSQL.
2. Set strong `JWT_SECRET` and `DEVICE_TOKEN_SECRET` values.
3. Set `CORS_ORIGIN` to the dashboard origin.
4. Run `npm run prisma:generate`, `npx prisma migrate deploy`, and `npm run prisma:seed`.
5. Run `npm run build` and `npm run start:prod`.
6. Terminate TLS in front of the Node process.
7. Inform employees that company-owned Windows laptops are activity-tracked.

## 25. Privacy architecture

| Allowed | Forbidden |
| --- | --- |
| Activity / idle / locked / unlocked state | Keystrokes and typed text |
| Idle duration derived from state changes | Screenshots, webcam, microphone |
| Heartbeat and last-seen timestamps | Clipboard, URLs, window titles |
| Agent version and hostname | Browser history and file names |
| Windows OS (set by backend) | Mouse coordinates |

Passwords, JWTs, device tokens, and registration-code hashes are never written to logs or audit metadata.

---

## npm scripts

| Script | Command |
| --- | --- |
| `npm start` | Start once |
| `npm run start:dev` | Watch mode |
| `npm run start:prod` | Run compiled `dist/main` |
| `npm run build` | Compile TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Seed the single admin |

## Future Windows tracker contract

```
Windows Tracker
      |
      | POST /api/devices/register
      | registration code
      ↓
Vitarantracker Backend
      |
      | returns device token ONCE
      ↓
Windows Tracker
      |
      | Authorization: Bearer DEVICE_TOKEN
      |
      ├── POST /api/tracker/heartbeat
      |
      └── POST /api/tracker/events
              ├── ACTIVE
              ├── IDLE
              ├── LOCKED
              └── UNLOCKED
```

Do not implement the Windows tracker or the admin dashboard in this project.
