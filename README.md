# Vitarantracker

Privacy-safe activity tracking for **company-owned Windows laptops**.

This repository has three parts:

| Folder | What it is |
| --- | --- |
| `backend/` | NestJS + PostgreSQL API, Socket.IO, work-time |
| `dashboard/` | Next.js admin dashboard |
| `tracker/` | Electron Windows background agent |

The system records activity/inactivity state only. It does not collect keystrokes, typed text, screenshots, clipboard, URLs, or mouse coordinates.

Employees must be informed that tracking is enabled on company-owned devices.

## Quick start

1. Configure PostgreSQL and `backend/.env`.
2. `cd backend && npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed && npm run start:dev`
3. `cd dashboard && npm install && npm run dev`
4. On a Windows laptop, `cd tracker && npm install && npm start`

Admin UI: http://localhost:3000  
API: http://localhost:4000/api
