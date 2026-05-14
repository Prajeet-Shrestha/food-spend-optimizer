# Issue #6 — Nepali-month payment alert

> https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/6

## Parent

https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/1

## What to build

The end-of-month payment reminder, scoped to the Nepali billing cycle.

- New module `lib/paymentAlert.ts`: `getPaymentAlert(logs, billingPeriod)` → `{ shouldShow, amountDue, daysUntilMonthEnd }`. `shouldShow` is true only in the last 3 days of the Nepali month. `amountDue` reuses the existing `calculateAmountDue` logic run on logs filtered to the current Nepali billing period.
- Add `paymentAlert` to `DashboardMetrics`.
- Render a **payment alert banner** on the dashboard: shows the current-Nepali-month amount due, links to the existing log form, informational only.
- The banner is purely informational — it never auto-creates a payment record. Once the user logs the payment, current-month amount due drops to ~0 and the banner naturally clears.
- The existing all-time `amountDue` dashboard card is unchanged — only the alert is Nepali-month-scoped.

## Acceptance criteria

- [ ] `lib/paymentAlert.ts` exists with `getPaymentAlert` returning the documented shape
- [ ] `shouldShow` is true only on the last 3 days of the Nepali month
- [ ] `amountDue` equals current-Nepali-month cook fees + reimbursable staff groceries (post-advance-drawdown) − non-tip payments
- [ ] Dashboard shows the payment alert banner during the trigger window, with a link to the log form
- [ ] The banner clears once a payment is logged that zeroes current-month amount due
- [ ] No payment record is ever auto-created
- [ ] The existing all-time `amountDue` card is unaffected

## Blocked by

- https://github.com/Prajeet-Shrestha/food-spend-optimizer/issues/4
