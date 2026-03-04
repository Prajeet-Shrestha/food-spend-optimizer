'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="animate-fade-in">
      <Dashboard refreshTrigger={refreshTrigger} />
    </div>
  );
}
