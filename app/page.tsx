'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import LogForm from '@/components/LogForm';
import LogList from '@/components/LogList';
import SettingsPanel from '@/components/SettingsPanel';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleLogSuccess = () => {
    // Trigger refresh of dashboard and log list
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleSettingsUpdate = () => {
    // Trigger refresh when settings are updated
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <Dashboard refreshTrigger={refreshTrigger} />
        <LogForm onSuccess={handleLogSuccess} />
        <LogList refreshTrigger={refreshTrigger} onRefresh={handleLogSuccess} />
        <SettingsPanel onUpdate={handleSettingsUpdate} />
      </div>
    </div>
  );
}
