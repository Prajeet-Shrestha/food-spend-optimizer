'use client';

import { useState } from 'react';
import LogForm from '@/components/LogForm';
import LogList from '@/components/LogList';
import ExportCsvButton from '@/components/ExportCsvButton';

export default function LogsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
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
      
      <LogForm onSuccess={handleLogSuccess} />
      <LogList refreshTrigger={refreshTrigger} onRefresh={handleLogSuccess} />
    </div>
  );
}
