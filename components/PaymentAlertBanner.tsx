'use client';

import Link from 'next/link';
import { CalendarClock, ArrowRight } from 'lucide-react';
import type { PaymentAlert } from '@/lib/paymentAlert';

interface PaymentAlertBannerProps {
  alert: PaymentAlert;
}

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PaymentAlertBanner({ alert }: PaymentAlertBannerProps) {
  // Only surfaces in the last 3 days of the Nepali month, and clears once the
  // current month's amount due is settled.
  if (!alert.shouldShow || alert.amountDue <= 0) {
    return null;
  }

  const { amountDue, daysUntilMonthEnd } = alert;
  const dayLabel =
    daysUntilMonthEnd === 0
      ? 'The Nepali month ends today'
      : daysUntilMonthEnd === 1
        ? 'The Nepali month ends tomorrow'
        : `The Nepali month ends in ${daysUntilMonthEnd} days`;

  return (
    <div
      className="card-premium p-6 border-amber-500/50 bg-amber-50/40 dark:bg-amber-900/10 animate-slide-up"
      style={{ animationDelay: '260ms' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Payment due this month</div>
            <div className="text-xs text-muted-foreground">
              {dayLabel} — settle up with the cook
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(amountDue)}
          </div>
          <div className="text-xs text-muted-foreground">Current Nepali month</div>
        </div>
      </div>
      <Link
        href="/logs"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium text-sm transition-colors"
      >
        Log a payment
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
