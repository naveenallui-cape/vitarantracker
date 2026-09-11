# Vitarantracker Admin Dashboard

Next.js admin UI for the Vitarantracker backend. It is for a **single admin** and shows only activity/inactivity state from company-owned Windows laptops.

This dashboard never displays device tokens, passwords, keystrokes, typed text, screenshots, URLs, or mouse coordinates.

## Requirements

- Node.js 20+
- Running Vitarantracker backend (`http://localhost:4000` by default)

## Setup

```bash
cd dashboard
npm install
npm run dev
```

Create `dashboard/.env` for local or production. Use the same filename on the server with production URLs.

Open [http://localhost:3000](http://localhost:3000).

Sign in with the seeded admin email and password from the backend `.env`.

## Environment

| Variable | Purpose |
| --- | --- |
| `API_URL` | Backend origin used by the server-side proxy |
| `NEXT_PUBLIC_API_URL` | Same origin, used if `API_URL` is unset |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO origin for live activity |

The admin JWT is stored in an httpOnly cookie. The browser never talks to the Nest API with a token in JavaScript except for Socket.IO live events, which contain only `employeeId`, `deviceId`, `status`, and `timestamp`.

## Screens

- Live activity and Socket.IO feed
- Employees: create, search, edit, activate/deactivate, registration codes
- Windows devices: revoke, replace, reassign, ownership history
- Work-time reports and CSV export

## Production

```bash
npm run build
npm start
```

Set `CORS_ORIGIN=https://your-dashboard-origin` on the backend.
