# Issue #4 — Detect missed check-ins and show cadence status on the dashboard

> https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/4

## Parent

https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## What to build

The first end-to-end slice: missed check-ins are detected automatically and shown on the dashboard.

- Add `RecordType.MISSED` (5th log type) and a `MissedCheckinLog` interface extending `BaseLog` with `nepaliMonth` (e.g. `"2083-Jestha"`), `hardCheckinDate` (the missed date), and `detectedAt`. Add it to the `LogEntry` union. Idempotency key is `{ nepaliMonth, hardCheckinDate }`.
- Add `cadenceStartDate?: string` to `Settings` (kept separate from the existing `trackingStartDate` — different concern, do not overload). For this rollout the operational value is `2026-05-17`.
- Add `reconcileMissedCheckins()` — thin, impure orchestration glue in the db layer: reads all logs, calls `detectMissedCheckins()` from the cadence engine, inserts any missing `MISSED` records idempotently.
- Wire `reconcileMissedCheckins()` into `GET /api/dashboard` so it runs on app load. It must back-fill correctly across a multi-week gap in usage (crossing month boundaries).
- Add `cadenceStatus` to `DashboardMetrics` (shape from `getCadenceStatus`).
- Render a **cadence status banner** on the dashboard near `NextCookWidget`: last cook, next check-in due, an overdue flag, and cooks/misses this cycle.

All existing logs, totals, per-day costs, and stats stay fully visible — the epoch only scopes the cadence engine, not history/stats views.

## Acceptance criteria

- [ ] `RecordType.MISSED` + `MissedCheckinLog` exist and are part of the `LogEntry` union
- [ ] `Settings.cadenceStartDate` exists, separate from `trackingStartDate`
- [ ] Opening the dashboard runs reconcile and creates durable `MISSED` records for passed unfilled hard dates
- [ ] Reconcile is idempotent — repeated dashboard loads never create duplicate `MISSED` records
- [ ] Reconcile back-fills correctly after a multi-week usage gap that crosses a month boundary
- [ ] No `MISSED` records are created for dates before `cadenceStartDate`
- [ ] Dashboard shows a cadence status banner with last cook, next check-in due, overdue flag, cooks/misses this cycle
- [ ] Historical logs and all-time stats remain unchanged and fully visible

## Blocked by

- https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/3
