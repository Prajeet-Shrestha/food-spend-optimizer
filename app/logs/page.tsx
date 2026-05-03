'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LogForm from '@/components/LogForm';
import LogList from '@/components/LogList';
import ExportCsvButton from '@/components/ExportCsvButton';

function LogsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [prefillMenu, setPrefillMenu] = useState<string | undefined>(undefined);

  // Read ?prefillMenu= once on mount, then strip it from the URL so a refresh
  // doesn't re-prefill stale data.
  useEffect(() => {
    const fromQuery = searchParams.get('prefillMenu');
    if (fromQuery) {
      setPrefillMenu(fromQuery);
      router.replace('/logs');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setPrefillMenu(undefined);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Log Management</h1>
          <p className="text-muted-foreground">View and manage all your food expense logs</p>
        </div>
        <ExportCsvButton />
      </div>

      <LogForm
        key={prefillMenu ?? 'fresh'}
        onSuccess={handleLogSuccess}
        defaultMenu={prefillMenu}
      />
      <LogList refreshTrigger={refreshTrigger} onRefresh={handleLogSuccess} />
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="animate-fade-in">Loading…</div>}>
      <LogsPageInner />
    </Suspense>
  );
}
