'use client';

import { useState } from 'react';
import SettingsPanel from '@/components/SettingsPanel';

export default function SettingsPage() {
  const handleSettingsUpdate = () => {
    // Settings updated successfully
  };
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your food spend tracking preferences</p>
      </div>
      
      <SettingsPanel onUpdate={handleSettingsUpdate} embedded={true} />
    </div>
  );
}
