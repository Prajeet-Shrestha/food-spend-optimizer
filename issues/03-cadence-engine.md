# Issue #3 — Cadence engine (pure scheduling module)

> https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/3

## Parent

https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## What to build

The pure cadence engine — a deep, isolated module holding all the tricky scheduling math. New module `lib/cadence.ts`, pure functions over arrays of log entries:

- `buildCadenceGrid(cookLogs, cadenceStartDate, asOf)` — walks the continuous anchor chain and returns the sequence of anchors and hard check-in dates, marking which hard dates were satisfied vs. missed.
- `detectMissedCheckins(cookLogs, cadenceStartDate, existingMissedLogs, asOf)` — returns the set of missed-checkin records that should exist but don't yet (the diff to write).
- `getCadenceStatus(cookLogs, missedLogs, cadenceStartDate, asOf)` — returns `{ lastCookDate, nextHardCheckinDate, isOverdue, cooksThisCycle, missedThisCycle, targetCooks }`.

Model rules:
- The grid is a single continuous chain flowing across Nepali-month boundaries; it never resets at the start of a month.
- Anchored by every actual cook **and** every missed hard check-in date.
- Dynamic step at each anchor: `clamp(round(remainingDaysInNepaliMonth / remainingSlots), 3, 4)`, where `remainingSlots = 8 - slotsUsedThisNepaliMonth`; both cooks and misses consume a slot.
- An actual cook re-anchors at the cook date; a missed hard date re-anchors at that missed date. A long gap therefore yields one missed record per passed hard date.
- A cook anywhere in `(anchor, hardDate]` satisfies the slot (early cooks are fine, not tracked).
- Only considers cook logs with `date >= cadenceStartDate`. Only hard dates strictly before `asOf` can become misses.

## Acceptance criteria

- [ ] Ideal Jestha 2083 path: first cook Jestha 3 produces cook slots every 4 days (3, 7, 11, 15, 19, 23, 27, 31)
- [ ] Dynamic step tightens to 3 near month-end to stay on the 8-slot target
- [ ] A long gap between two cooks produces one missed record per passed hard date (not a single record)
- [ ] An actual cook re-anchors the grid going forward; a miss re-anchors at the missed date
- [ ] A cook before the +3 edge still satisfies the slot
- [ ] Grid continuity is preserved across a Nepali-month boundary (no reset on the 1st)
- [ ] No misses generated for dates before `cadenceStartDate`
- [ ] Only hard dates strictly in the past become misses; today/future stay open
- [ ] Unit tests cover all the above as black-box behavior

## Blocked by

- https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/2
