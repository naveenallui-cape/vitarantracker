# Vitarantracker Windows agent

Privacy-safe background agent for **company-owned Windows laptops**.

It reports only:

- ACTIVE / IDLE / LOCKED / UNLOCKED
- heartbeat
- agent version and hostname

It never captures:

- keystrokes or typed text
- mouse coordinates
- screenshots, webcam, microphone
- clipboard, browser history, URLs, or file names

Input is detected with the operating system's last-input time (`powerMonitor.getSystemIdleTime`). The agent does **not** install a keyboard or mouse hook.

Employees must be informed that activity tracking is enabled on company-owned devices. The registration screen requires that acknowledgement.

## Requirements

- Windows 10/11 for production
- Running Vitarantracker backend
- A one-time registration code from the admin dashboard

macOS is not supported. Unpackaged development on macOS may open the UI, but Windows lock/idle APIs are the production path.

## Development

```bash
cd tracker
npm install
npm start
```

## Tests

```bash
npm test
```

## Windows installer

Build on Windows:

```bash
npm run dist:win
```

The installer is written to `tracker/release/`.

## How it works

1. Admin generates a registration code in the dashboard.
2. The employee (or IT) enters employee ID + code in this agent.
3. Backend returns a device token **once**. It is stored with Electron `safeStorage`.
4. Every 5 seconds the agent checks idle time and lock state.
5. State changes go to `POST /api/tracker/events`.
6. Every 60 seconds it sends `POST /api/tracker/heartbeat`.
7. One missed heartbeat does not mark the laptop offline; the backend uses a 180-second grace period.

Idle threshold: 5 minutes (`IDLE_THRESHOLD_MINUTES`).
