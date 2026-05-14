'use client';

import Link from 'next/link';
import { CalendarCheck, AlertTriangle, PencilLine } from 'lucide-react';
import type { CadenceStatus } from '@/lib/cadence';

interface CadenceStatusBannerProps {
  status: CadenceStatus | null;
  // Count of MISSED check-in records that still have no user-supplied reason.
  missedNeedingReason: number;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function CadenceStatusBanner({
  status,
  missedNeedingReason,
}: CadenceStatusBannerProps) {
  // Nothing to show until the cadence engine has at least one cook to anchor on.
  if (!status || (status.lastCookDate === null && status.nextHardCheckinDate === null)) {
    return null;
  }

  const {
    lastCookDate,
    nextHardCheckinDate,
    isOverdue,
    cooksThisCycle,
    missedThisCycle,
    targetCooks,
  } = status;

  return (
    <div
      className={`card-premium p-6 animate-slide-up ${
        isOverdue ? 'border-amber-500/50 bg-amber-50/40 dark:bg-amber-900/10' : ''
      }`}
      style={{ animationDelay: '275ms' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${
            isOverdue ? 'bg-amber-500/20 text-amber-600' : 'bg-secondary/20 text-secondary'
          }`}
        >
          {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CalendarCheck className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">Cooking cadence</div>
          <div className="text-xs text-muted-foreground">
            {isOverdue ? 'Overdue — a check-in was missed' : 'On track'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Last cook</div>
          <div className="font-semibold text-foreground">
            {lastCookDate ? formatDate(lastCookDate) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Next check-in due</div>
          <div className="font-semibold text-foreground">
            {nextHardCheckinDate ? formatDate(nextHardCheckinDate) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Cooks this cycle</div>
          <div className="font-semibold text-foreground tabular-nums">
            {cooksThisCycle} / {targetCooks}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Missed this cycle</div>
          <div
            className={`font-semibold tabular-nums ${
              missedThisCycle > 0 ? 'text-amber-600' : 'text-foreground'
            }`}
          >
            {missedThisCycle}
          </div>
        </div>
      </div>

      {missedNeedingReason > 0 && (
        <Link
          href="/calendar"
          className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <PencilLine className="w-4 h-4 shrink-0" />
          <span>
            {missedNeedingReason} missed check-in{missedNeedingReason === 1 ? '' : 's'} need
            {missedNeedingReason === 1 ? 's' : ''} a reason — add one from the calendar.
          </span>
        </Link>
      )}
    </div>
  );
}
