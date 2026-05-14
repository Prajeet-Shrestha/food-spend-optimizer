# Issue #5 — Render missed check-ins on the bill, logs list, and calendar

> https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/5

## Parent

https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## What to build

Surface `MISSED` records across the cook-facing and history views.

- On the bill: `RecordType.MISSED` renders as a **zero-money memo row** (same memo-row pattern already used for `ADVANCE`), with a description like `"Missed check-in — Jestha 9"`. It carries no debit/credit and does not change the running balance.
- In `LogList`: `MISSED` entries render alongside other log types.
- In `CalendarView`: `MISSED` entries render on their date.
- Billing math stays honest and unchanged: amount due remains the sum of actual cook fees + reimbursable staff groceries − non-tip payments. The 8-cook / 5600 NPR figure is a soft target, not a cap — a 9th cook in a month bills normally.

`MISSED` records are system-generated only — no write/edit/delete endpoint or UI.

## Acceptance criteria

- [ ] `MISSED` appears on the bill as a zero-money memo row with a readable description, not affecting the running balance
- [ ] `MISSED` entries render in `LogList`
- [ ] `MISSED` entries render in `CalendarView`
- [ ] Bill amount due is unchanged by the presence of `MISSED` rows (honest sum of actual cooks)
- [ ] A 9th cook in a Nepali month bills normally (no 5600 cap)
- [ ] No UI path to create, edit, or delete a `MISSED` record

## Blocked by

- https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/4
