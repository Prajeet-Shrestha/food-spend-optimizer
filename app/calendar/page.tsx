'use client';

import CalendarView from '@/components/CalendarView';

export default function CalendarPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Calendar</h1>
          <p className="text-muted-foreground">Your logs across the month, in English and Nepali dates</p>
        </div>
      </div>

      <CalendarView />
    </div>
  );
}
