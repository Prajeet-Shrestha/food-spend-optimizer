# PRD: Strict cook cadence, missed check-ins, and Nepali-month payment alerts

> Tracking issue: https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## Problem Statement

I pay my cook a fixed fee per cooking session, and I want her to cook on a steady cadence — roughly every 4 days — so that food spend stays predictable and I'm not over- or under-paying across a month. Today the app just tracks logs after the fact; it has no notion of *when she should cook next*, no way to tell me she skipped an expected session, and no month-bounded view of what I owe her.

Concretely, I need:
- A **strict check-in cadence**: after a cook, the next one is expected within 3–4 days. If an expected check-in date passes with no cooking session logged, that check-in is **missed** and recorded durably.
- A **Nepali-month billing cycle**. I pay her at the end of every Nepali month regardless of anything, so I need a payment alert near month-end telling me the total to pay.
- A **Nepali-calendar service** that tells me what day of the Nepali month it currently is, and bounds the billing period — because I'm paying her today and from tomorrow it's the 1st of Jestha, so the timing to start a clean cycle is perfect.

The cadence target is **8 cooking sessions per Nepali month** (8 × 700 NPR base fee = 5600 NPR), which falls out naturally from a ~4-day gap.

## Solution

Introduce a continuous **cadence grid** anchored to actual cooking sessions, a durable **missed check-in** record type, a **Nepali-month billing period** service, and a **payment alert** — all surfaced on the dashboard.

From the user's perspective:
- After each cook, the system knows the next *hard check-in date* (3 or 4 days out, chosen dynamically to stay on track for 8 sessions in the Nepali month).
- If a hard check-in date passes with no cooking session logged, the system records a durable **missed check-in** and shows it on the dashboard and on the cook's bill (as a zero-money memo line).
- The dashboard shows a **cadence status banner**: last cook, next check-in due, whether it's overdue, and how many cooks/misses this billing cycle.
- In the last 3 days of the Nepali month, the dashboard shows a **payment alert banner** with the total owed for the current Nepali month, linking to the log form.
- All existing history, stats, totals, and logs stay fully visible — the new system just doesn't let pre-epoch data influence cadence or the current billing cycle.

### The cadence model (precise)

- **Genesis / epoch**: A new `cadenceStartDate` setting marks where the new system begins. For this rollout it is **Jestha 3, 2083 (2026-05-17)** — the first cook session of the new system. (The cook physically cooked on 2026-05-14 and food lasts ~3 days, so the first new-system session lands 3 days later.) The cadence engine and missed-checkin detection only consider cook logs on/after `cadenceStartDate`; everything before is "logically cleared" but **remains in the database and in all history/stats/logs views**.
- **Continuous grid**: The cadence grid is a single chain that flows across Nepali-month boundaries. It is anchored by every *actual cook* and every *missed hard check-in date*. It never resets at the start of a month.
- **Dynamic step**: After each anchor point, the next hard check-in date is `anchor + clamp(round(remainingDaysInNepaliMonth / remainingSlots), 3, 4)`, where `remainingSlots = 8 - slotsUsedThisNepaliMonth` and a "slot" is consumed by both an actual cook and a missed hard date. This steers toward 8 cooks per Nepali month; the step is mostly 4, tightening to 3 near month-end.
- **Re-anchoring**: An actual cook re-anchors the grid at the cook date. A missed hard date re-anchors the grid at that missed date (and the grid advances from there). A 10-day gap between two cooks therefore produces *multiple* missed records — one per hard date that passed unfilled in between.
- **Early cooks satisfy**: A cook anywhere in `(anchor, hardDate]` satisfies the slot and re-anchors — cooking "early" (before the +3 edge) is not a violation and is not tracked.
- **Missed = permanent**: Once a hard date passes unfilled it is missed forever. A later cook re-anchors the grid going forward but never un-misses a past date.

### Billing & target

- Billing stays **honest**: amount due = sum of actual cook fees + reimbursable staff groceries (post-advance-drawdown) − non-tip payments. The 8-cook / 5600 NPR figure is a **soft cadence target**, not a billing cap — a 9th cook in a month bills normally.
- The **Nepali month** scopes only the cadence target (8), the 5600 ideal, and the payment alert. It never resets the cadence grid.

## User Stories

1. As the household payer, I want the system to know the next expected cooking date after each cook, so that I have a clear cadence to hold the cook to.
2. As the household payer, I want the next check-in date to be 3 or 4 days after the last cook, so that food spending stays steady and predictable.
3. As the household payer, I want the 3-vs-4 day step chosen automatically so the month trends toward 8 cooking sessions, so that I don't have to count or plan manually.
4. As the household payer, I want the cadence to adapt to Nepali months of different lengths (29–32 days), so that the 8-session target holds regardless of month length.
5. As the household payer, I want a hard check-in date that passes with no cooking session logged to be recorded as a missed check-in, so that skipped sessions are tracked.
6. As the household payer, I want missed check-ins stored durably (not just computed transiently), so that there is a permanent accountability record.
7. As the household payer, I want a long gap between two cooks to produce one missed record per passed hard date (not a single record), so that the count of missed sessions is accurate.
8. As the household payer, I want an actual cook to re-anchor the cadence grid going forward, so that the schedule recovers naturally after a miss.
9. As the household payer, I want a cook that happens before the 3-day edge to still count as satisfying that check-in, so that cooking early is never penalized.
10. As the household payer, I want a missed check-in to be permanent even if the cook cooks later, so that the record reflects what actually happened.
11. As the household payer, I want missed check-ins to appear on the cook's bill as a zero-money memo line, so that the cook can see why the bill is lower than the 8-session ideal.
12. As the household payer, I want missed check-ins to appear in the logs list and calendar view, so that they show up alongside other activity.
13. As the household payer, I want a dashboard banner showing my cadence status (last cook, next check-in due, overdue flag, cooks and misses this cycle), so that I can see at a glance whether the cook is on track.
14. As the household payer, I want the cadence banner to clearly flag when the next check-in is overdue, so that I can follow up with the cook.
15. As the household payer, I want each Nepali month to target 8 cooking sessions worth 5600 NPR, so that my monthly food payroll is predictable.
16. As the household payer, I want a 9th cook in a month to still bill normally, so that billing always reflects what actually happened.
17. As the household payer, I want a payment alert in the last 3 days of the Nepali month, so that I'm reminded to pay the cook before the month ends.
18. As the household payer, I want the payment alert to show the total owed for the current Nepali month, so that I know exactly how much to hand over.
19. As the household payer, I want the payment alert amount to be the current-Nepali-month amount due (cook fees + reimbursable staff groceries − non-tip payments), so that the figure matches the billing model I already use.
20. As the household payer, I want the payment alert to link to the log form, so that I can record the payment quickly once I've paid.
21. As the household payer, I want the payment alert to disappear after I log the payment, so that I'm not nagged about something already done.
22. As the household payer, I want the payment alert to be informational only and never auto-create a payment record, so that I stay in control of what gets logged.
23. As the household payer, I want a Nepali-calendar service that tells me the current day of the Nepali month, so that I always know where I am in the billing cycle.
24. As the household payer, I want the service to give me the Nepali month's start and end Gregorian dates, so that logs can be filtered to the current billing period.
25. As the household payer, I want the service to report how many days are in the current Nepali month, so that the dynamic cadence step is computed correctly.
26. As the household payer, I want a `cadenceStartDate` setting that marks when the new system begins, so that older data doesn't distort the new cadence and billing cycle.
27. As the household payer, I want all my historical logs, totals, per-day costs, and stats to remain fully visible after the epoch is set, so that I don't lose any reporting history.
28. As the household payer, I want the cadence engine to ignore cook logs before `cadenceStartDate`, so that the new cadence chain starts cleanly at the epoch.
29. As the household payer, I want no missed check-in records generated for dates before the epoch, so that the missed history starts clean.
30. As the household payer, I want missed check-ins detected automatically when I open the app, so that I don't need a background job or manual trigger.
31. As the household payer, I want missed-checkin detection to be safe to run repeatedly without creating duplicates, so that opening the app many times never corrupts the record.
32. As the household payer, I want detection to back-fill correctly even if I don't open the app for weeks and cross a month boundary, so that the record stays accurate after a gap in usage.
33. As the household payer, I want only hard check-in dates strictly in the past to become misses, so that today's or a future check-in is never prematurely marked missed.
34. As the household payer, I want the cadence grid to flow continuously across Nepali-month boundaries, so that the schedule doesn't artificially reset on the 1st of each month.

## Implementation Decisions

### Modules

- **`lib/nepaliCalendar.ts`** (new, deep, pure) — Nepali-calendar service.
  - `getNepaliBillingPeriod(date: Date)` returns the current Nepali billing period: `{ monthName, year, monthIndex, dayOfMonth, daysInMonth, startDateGreg, endDateGreg, isLastThreeDays }`.
  - `daysInNepaliMonth(year, monthName)` — clean lookup against the `nepali-date-converter` library's exported `dateConfigMap` (verified: `dateConfigMap['2083']['Jestha'] === 31`). No date-overflow hacks.
  - Follows the existing default-import pattern for `nepali-date-converter` already used in `lib/dateUtils.ts` (the library is ESM with a default export; Next's build handles the interop).
  - Existing `dateUtils.ts` calendar helpers stay where they are; `nepaliCalendar.ts` is the billing-period-aware layer.

- **`lib/cadence.ts`** (new, deep, pure) — the cadence engine. Pure functions over arrays of log entries:
  - `buildCadenceGrid(cookLogs, cadenceStartDate, asOf)` — walks the continuous anchor chain and returns the sequence of anchors and hard check-in dates, marking which hard dates were satisfied vs. missed.
  - `detectMissedCheckins(cookLogs, cadenceStartDate, existingMissedLogs, asOf)` — returns the set of missed-checkin records that should exist but don't yet (the diff to write).
  - `getCadenceStatus(cookLogs, missedLogs, cadenceStartDate, asOf)` — returns `{ lastCookDate, nextHardCheckinDate, isOverdue, cooksThisCycle, missedThisCycle, targetCooks }` for the dashboard banner.
  - The dynamic step is `clamp(round(remainingDaysInNepaliMonth / remainingSlots), 3, 4)`, recomputed at every anchor point; both cooks and misses consume a slot.
  - Only considers cook logs with `date >= cadenceStartDate`. Only hard dates strictly before `asOf` can become misses.

- **`lib/paymentAlert.ts`** (new, own module, pure) — `getPaymentAlert(logs, billingPeriod)` returns `{ shouldShow, amountDue, daysUntilMonthEnd }`. `shouldShow` is true in the last 3 days of the Nepali month. `amountDue` reuses the existing `calculateAmountDue` logic run on logs filtered to the current Nepali billing period.

- **`reconcileMissedCheckins()`** (new, thin, impure) — orchestration glue in the db layer. Reads all logs, calls `detectMissedCheckins()`, and inserts any missing `MISSED` records idempotently. Idempotency key is `{ nepaliMonth, hardCheckinDate }`. Invoked from `GET /api/dashboard`.

### Schema / type changes

- `RecordType` enum gains a `MISSED` member (5th log type alongside `COOK`, `GROCERY`, `PAYMENT`, `ADVANCE`).
- New `MissedCheckinLog` interface extending `BaseLog`: fields include `nepaliMonth` (string, e.g. `"2083-Jestha"`), `hardCheckinDate` (the missed date — also the idempotency key together with `nepaliMonth`), and `detectedAt`. Added to the `LogEntry` union.
- `Settings` gains `cadenceStartDate?: string` (ISO date). For this rollout it is set to `2026-05-17`. Kept separate from the existing `trackingStartDate` (which drives the stats tracking window — a different concern, not overloaded).
- `DashboardMetrics` gains `cadenceStatus` (shape from `getCadenceStatus`) and `paymentAlert` (shape from `getPaymentAlert`).

### API contracts

- `GET /api/dashboard` runs `reconcileMissedCheckins()` before computing metrics, then returns `DashboardMetrics` including `cadenceStatus` and `paymentAlert`. If the user hasn't opened the app for weeks, reconcile back-fills every missed hard date from the epoch up to today.
- `MISSED` records flow through the existing read path of `GET /api/logs` and render in `LogList` and `CalendarView` with no new endpoint. No write/edit endpoint for `MISSED` — they are system-generated only.
- The logs page stays a pure view; reconcile runs on the dashboard read only.

### Billing integration

- `convertLogsToBillItems` / `calculateBillSummary` in `lib/billCalculations.ts` handle `RecordType.MISSED` as a zero-money memo row (same memo-row pattern already used for `ADVANCE`), with a description like `"Missed check-in — Jestha 9"`.
- Billing math is otherwise unchanged: amount due remains the honest sum of actual cooks + reimbursable groceries − non-tip payments. No 5600 cap.

### UI

- Dashboard renders a **cadence status banner** (near `NextCookWidget`) from `cadenceStatus`, and a **payment alert banner** from `paymentAlert` (shown only in the last 3 Nepali-month days).
- `LogList` and `CalendarView` gain rendering for the `MISSED` log type.

### Rollout

- The `cadenceStartDate` setting is set to `2026-05-17` (Jestha 3, 2083) at rollout. The user logs a payment on 2026-05-14 that settles all prior dues, so the all-time `amountDue` card naturally reads ~0 entering Jestha — no special-casing needed.

## Testing Decisions

A good test here exercises **external behavior only** — given a set of log entries and a reference date, assert the returned grid / missed-record diff / status / billing-period shape. Tests must not assert on internal helpers or intermediate state; they should treat each module as a black box with a stable interface. There is **no test framework in the repo today**, so this introduces **vitest** (the natural fit for a TypeScript / Next.js project) plus an `npm test` script. There is no prior art for tests in this codebase — these are the first.

Modules to be tested:

- **`lib/nepaliCalendar.ts`** — `getNepaliBillingPeriod` and `daysInNepaliMonth`. Cases: known Gregorian↔Nepali conversions (2026-05-15 = Jestha 1, 2083), month lengths for 29/30/31/32-day months, `isLastThreeDays` boundary behavior, billing-period start/end dates.
- **`lib/cadence.ts`** — the core engine. Cases: the ideal 8-cook Jestha path (first cook Jestha 3 → cooks every 4 days), the dynamic step tightening to 3 near month-end, a long gap producing multiple missed records, early cooks satisfying a slot, re-anchoring after a miss, continuity across a Nepali-month boundary, no misses generated before `cadenceStartDate`, and only past hard dates becoming misses.

The UI components, the `GET /api/dashboard` route, the `reconcileMissedCheckins()` glue, and `lib/paymentAlert.ts` are **not** unit-tested in this PRD — they are either thin orchestration or shallow modules whose logic is covered transitively by the two deep modules above.

## Out of Scope

- Real push / email / SMS notifications. "Notify" in this PRD means a dashboard banner shown on app load — no background jobs, no scheduler, no external delivery.
- A hard billing cap at 5600 NPR. Billing stays honest (sum of actual cooks); 8/5600 is a soft target only.
- Editing or manually deleting `MISSED` records — they are system-generated and managed solely by the idempotent reconcile.
- Migrating or deleting historical data. The epoch is a logical boundary; all old logs remain in the DB and visible in history/stats/logs.
- Changing the existing all-time `amountDue` dashboard card to be Nepali-month-scoped. It stays all-time; only the payment alert is month-scoped.
- Reconcile on the `/api/logs` route. Detection runs on the dashboard read only.
- Tests for UI, API routes, the reconcile glue, and `lib/paymentAlert.ts`.

## Further Notes

- **Verified during design**: `nepali-date-converter` exports `dateConfigMap`, giving days-per-month directly. Jestha 2083 is **31 days** — so the naive `[1,5,9,13,17,21,25,28]` (30-day-assuming) schedule is already wrong for the very first real month, which is exactly why the dynamic-step design is necessary.
- **First-cycle worked example** (Jestha 2083, 31 days, first cook Jestha 3): cooks land Jestha 3, 7, 11, 15, 19, 23, 27, 31 — eight sessions, all 4-day gaps. The trailing gap into Ashadh 1 is only 1 day, so the dynamic step would tighten one mid-cycle gap to 3 to re-snug the chain to the calendar — the intended dynamic-step behavior.
- The "every 4 days, snug it up twice" mental model the user described is an *approximation* of the dynamic-step rule; the formula is the source of truth.
- Billing and cadence are **decoupled**: the cook physically cooked on 2026-05-14 and that anchors food-lasting reality, but for the new system the genesis cook log is Jestha 3 — pre-epoch sessions don't anchor the new cadence chain.
