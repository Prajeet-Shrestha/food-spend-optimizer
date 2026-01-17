'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Settings } from '@/lib/config';

interface SettingsPanelProps {
  onUpdate?: () => void;
}

export default function SettingsPanel({ onUpdate }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    baseFee: 0,
    baselineDailyLow: 360,
    baselineDailyHigh: 400,
    baselineDailyAvg: 380,
    trackingStartDate: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
      }
      
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }
      
      setSuccess(true);
      if (onUpdate) {
        onUpdate();
      }
      
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-zinc-700 dark:bg-zinc-600 text-white rounded-full shadow-lg hover:bg-zinc-600 dark:hover:bg-zinc-500 transition-colors"
        title="Settings"
      >
        ⚙️ Settings
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
            Settings
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 text-2xl"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-black dark:text-zinc-50">
              Loading settings...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                  Base Fee per Cook Session (Rs) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={settings.baseFee}
                  onChange={(e) => setSettings({ ...settings, baseFee: Number(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  The base cooking fee charged per cooking session
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                    Baseline Daily Low (Rs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyLow}
                    onChange={(e) => setSettings({ ...settings, baselineDailyLow: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                    Baseline Daily High (Rs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyHigh}
                    onChange={(e) => setSettings({ ...settings, baselineDailyHigh: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                    Baseline Daily Avg (Rs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyAvg}
                    onChange={(e) => setSettings({ ...settings, baselineDailyAvg: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                  Tracking Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={settings.trackingStartDate || ''}
                  onChange={(e) => setSettings({ ...settings, trackingStartDate: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Override the tracking window start date. Leave empty to use earliest log date.
                </p>
              </div>
              
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-md text-green-700 dark:text-green-400">
                  Settings saved successfully! Dashboard will update automatically.
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

