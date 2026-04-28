'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, X, ChefHat, ShoppingBag } from 'lucide-react';
import { LogEntry, RecordType, CookLog, GroceryLog, PaymentLog } from '@/types';
import {
  formatBilingualDate,
  getLocalDateKey,
  getNepaliDayNumber,
  getNepaliRange,
} from '@/lib/dateUtils';
import { getLogTypeConfig } from '@/lib/logTypeConfig';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MAX_CHIPS = 3;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function logAmount(log: LogEntry): number {
  if (log.recordType === RecordType.COOK) return (log as CookLog).baseFee;
  if (log.recordType === RecordType.GROCERY) return (log as GroceryLog).amount;
  return (log as PaymentLog).amountPaid;
}

function logLabel(log: LogEntry): string {
  if (log.recordType === RecordType.COOK) return (log as CookLog).menu;
  if (log.recordType === RecordType.GROCERY) {
    const g = log as GroceryLog;
    return `Rs ${g.amount} · ${g.category || 'Grocery'}`;
  }
  return `Rs ${(log as PaymentLog).amountPaid}`;
}

function formatRs(n: number): string {
  return `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const requestId = useRef(0);

  const monthStart = currentMonth;
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const viewStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const viewDays = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(viewStart, i)),
    [viewStart],
  );
  const viewEnd = viewDays[viewDays.length - 1];

  const todayKey = getLocalDateKey(new Date());

  useEffect(() => {
    const controller = new AbortController();
    const myId = ++requestId.current;
    const from = getLocalDateKey(viewStart);
    const to = getLocalDateKey(viewEnd);

    setLoading(true);
    setError(null);

    fetch(`/api/logs?from=${from}&to=${to}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load logs');
        if (myId !== requestId.current) return;
        setLogs(data.logs ?? []);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (myId !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      })
      .finally(() => {
        if (myId === requestId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [viewStart, viewEnd]);

  const monthStats = useMemo(() => {
    const y = monthStart.getFullYear();
    const m = monthStart.getMonth();
    let cooks = 0;
    let groceries = 0;
    for (const log of logs) {
      const d = new Date(log.date);
      if (d.getFullYear() !== y || d.getMonth() !== m) continue;
      if (log.recordType === RecordType.COOK) cooks++;
      else if (log.recordType === RecordType.GROCERY) groceries++;
    }
    return { cooks, groceries };
  }, [logs, monthStart]);

  const logsByDate = useMemo(() => {
    const map: Record<string, LogEntry[]> = {};
    for (const log of logs) {
      const key = log.date.slice(0, 10);
      (map[key] ||= []).push(log);
    }
    return map;
  }, [logs]);

  // Esc to close modal
  useEffect(() => {
    if (!selectedDateKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedDateKey(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedDateKey]);

  const goPrev = () => setCurrentMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1));
  const goNext = () => setCurrentMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));
  const goToday = () => setCurrentMonth(startOfMonth(new Date()));

  const handleDayClick = (cellDate: Date) => {
    const inMonth = cellDate.getMonth() === monthStart.getMonth();
    const key = getLocalDateKey(cellDate);
    if (!inMonth) {
      setCurrentMonth(startOfMonth(cellDate));
    }
    setSelectedDateKey(key);
  };

  const gregorianTitle = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nepaliSubtitle = getNepaliRange(monthStart, monthEnd);

  const selectedEvents = selectedDateKey ? logsByDate[selectedDateKey] ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            {gregorianTitle}
            {loading && <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">{nepaliSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label="Previous month"
            className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--accent)] transition-colors"
          >
            Today
          </button>
          <button
            onClick={goNext}
            aria-label="Next month"
            className="p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg">
          <AlertCircle size={16} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setCurrentMonth(new Date(monthStart))}
            className="font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Month stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
            <ChefHat size={16} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Cooks this month</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{monthStats.cooks}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
            <ShoppingBag size={16} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Groceries this month</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{monthStats.groceries}</div>
          </div>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`grid grid-cols-7 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden transition-opacity ${
          loading ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        {viewDays.map((cellDate) => {
          const key = getLocalDateKey(cellDate);
          const events = logsByDate[key] ?? [];
          const inMonth = cellDate.getMonth() === monthStart.getMonth();
          const isToday = key === todayKey;
          const visibleChips = events.slice(0, MAX_CHIPS);
          const overflow = events.length - visibleChips.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDayClick(cellDate)}
              aria-label={`${cellDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${events.length} ${events.length === 1 ? 'event' : 'events'}`}
              className={`relative bg-[var(--card)] text-left p-1.5 sm:p-2 min-h-[64px] sm:min-h-[110px] flex flex-col gap-1 hover:bg-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:z-10 ${
                inMonth ? '' : 'opacity-40'
              } ${isToday ? 'ring-2 ring-[var(--primary)] ring-inset z-10' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-sm sm:text-base font-semibold text-[var(--foreground)]">
                  {cellDate.getDate()}
                </span>
                <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">
                  {getNepaliDayNumber(cellDate)}
                </span>
              </div>

              {/* Mobile: dots per event */}
              {events.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 sm:hidden mt-auto">
                  {events.slice(0, 4).map((log) => {
                    const cfg = getLogTypeConfig(log.recordType);
                    return (
                      <span
                        key={log._id}
                        className={`w-2 h-2 rounded-full ${cfg.dotClass}`}
                        aria-hidden="true"
                      />
                    );
                  })}
                  {events.length > 4 && (
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] leading-none">
                      +{events.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Desktop: chips */}
              <div className="hidden sm:flex flex-col gap-1 mt-1">
                {visibleChips.map((log) => {
                  const cfg = getLogTypeConfig(log.recordType);
                  const ChipIcon = cfg.icon;
                  return (
                    <span
                      key={log._id}
                      className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${cfg.bgClass} ${cfg.colorClass}`}
                    >
                      <ChipIcon size={10} className="shrink-0" />
                      <span className="truncate">{logLabel(log)}</span>
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[10px] text-[var(--muted-foreground)] px-1.5">+{overflow} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day-detail modal */}
      {selectedDateKey && (
        <DayDetailModal
          dateKey={selectedDateKey}
          events={selectedEvents}
          onClose={() => setSelectedDateKey(null)}
        />
      )}
    </div>
  );
}

function DayDetailModal({
  dateKey,
  events,
  onClose,
}: {
  dateKey: string;
  events: LogEntry[];
  onClose: () => void;
}) {
  const { gregorian, nepali } = formatBilingualDate(dateKey);
  const total = events.reduce((sum, e) => sum + logAmount(e), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--background)] max-w-lg w-full border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{gregorian}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">{nepali}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No events on this day.</p>
          ) : (
            events.map((log) => {
              const cfg = getLogTypeConfig(log.recordType);
              const Icon = cfg.icon;
              return (
                <div
                  key={log._id}
                  className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg"
                >
                  <div className={`p-2 rounded-full ${cfg.bgClass} ${cfg.colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)] truncate">
                        {log.recordType === RecordType.COOK && (log as CookLog).menu}
                        {log.recordType === RecordType.GROCERY && ((log as GroceryLog).category || 'Grocery')}
                        {log.recordType === RecordType.PAYMENT && 'Payment'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cfg.bgClass} ${cfg.colorClass}`}>
                        {log.recordType}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">{log.notes}</p>
                    )}
                  </div>
                  <div className="font-bold text-[var(--foreground)] whitespace-nowrap">
                    {formatRs(logAmount(log))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {events.length > 1 && (
          <div className="sticky bottom-0 bg-[var(--background)] border-t border-[var(--border)] p-4 flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">
              {events.length} events
            </span>
            <span className="font-bold text-[var(--foreground)]">{formatRs(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
