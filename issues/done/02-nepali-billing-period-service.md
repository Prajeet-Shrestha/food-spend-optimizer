# Issue #2 — Nepali billing-period service + vitest setup

> https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/2

## Parent

https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## What to build

The foundational Nepali-calendar service that bounds the billing cycle, plus the test framework the rest of this work depends on.

Add **vitest** to the project (no test framework exists today) with an `npm test` script. Build a new pure module `lib/nepaliCalendar.ts` exposing:

- `getNepaliBillingPeriod(date)` → `{ monthName, year, monthIndex, dayOfMonth, daysInMonth, startDateGreg, endDateGreg, isLastThreeDays }` — the current Nepali billing period for a given Gregorian date.
- `daysInNepaliMonth(year, monthName)` → number, via the `nepali-date-converter` library's exported `dateConfigMap` (verified: `dateConfigMap['2083']['Jestha'] === 31`). No date-overflow hacks.

Follow the existing default-import pattern for `nepali-date-converter` already used in `lib/dateUtils.ts`. Existing `dateUtils.ts` helpers stay where they are; this is the billing-period-aware layer on top.

## Acceptance criteria

- [ ] vitest installed; `npm test` runs the suite
- [ ] `getNepaliBillingPeriod` returns correct period shape for known dates (2026-05-15 = Jestha 1, 2083)
- [ ] `daysInNepaliMonth` returns correct lengths for 29/30/31/32-day months
- [ ] `isLastThreeDays` is true only on the final 3 days of the Nepali month (boundary-tested)
- [ ] `startDateGreg` / `endDateGreg` correctly bound the Nepali month in Gregorian terms
- [ ] Unit tests cover all the above as black-box behavior (no assertions on internal helpers)

## Blocked by

None - can start immediately
