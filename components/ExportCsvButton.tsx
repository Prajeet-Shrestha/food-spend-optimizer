'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { logsToCsv, downloadCsv } from '@/lib/csvExport';
import { getLocalDateKey } from '@/lib/dateUtils';

export default function ExportCsvButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');

      const csv = logsToCsv(data.logs ?? []);
      const filename = `food-logs-${getLocalDateKey(new Date())}.csv`;
      downloadCsv(filename, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {loading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <span className="text-xs text-[var(--destructive)]">{error}</span>
      )}
    </div>
  );
}
