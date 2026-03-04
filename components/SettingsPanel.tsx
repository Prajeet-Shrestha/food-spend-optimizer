'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Settings } from '@/lib/config';
import { Settings as SettingsIcon, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettingsPanelProps {
  onUpdate?: () => void;
  embedded?: boolean;
}

export default function SettingsPanel({ onUpdate, embedded = false }: SettingsPanelProps) {
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
  const [isOpen, setIsOpen] = useState(embedded);
  
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
    if (isOpen || embedded) {
      fetchSettings();
    }
  }, [isOpen, embedded]);
  
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
      
      if (!embedded) {
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 2000);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen && !embedded) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-110 z-50 grid place-items-center"
        title="Settings"
      >
        <SettingsIcon size={24} />
      </button>
    );
  }

  const content = (
    <div className={`flex flex-col h-full ${embedded ? '' : 'bg-[var(--background)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh]'}`}>
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Settings</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto ${embedded ? '' : 'p-6'}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <SettingsIcon className="w-8 h-8 animate-spin mb-4 opacity-50" />
            <p>Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Base Configuration */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-base font-semibold mb-4 text-[var(--foreground)] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--primary)]" />
                Cooking Parameters
              </h3>
              
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                    Base Fee per Cook Session (Rs) <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baseFee}
                    onChange={(e) => setSettings({ ...settings, baseFee: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                  />
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    Default fee charged for each cooking session entry.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Baseline Configuration */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-base font-semibold mb-4 text-[var(--foreground)] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--primary)]" />
                Baseline Daily Costs
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                    Low (Rs) <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyLow}
                    onChange={(e) => setSettings({ ...settings, baselineDailyLow: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                    High (Rs) <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyHigh}
                    onChange={(e) => setSettings({ ...settings, baselineDailyHigh: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                    Average (Rs) <span className="text-[var(--destructive)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={settings.baselineDailyAvg}
                    onChange={(e) => setSettings({ ...settings, baselineDailyAvg: Number(e.target.value) })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Used to calculate savings metrics. "Low" and "High" define your budget range.
              </p>
            </div>
            
            {/* Tracking Configuration */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
              <h3 className="text-base font-semibold mb-4 text-[var(--foreground)] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--primary)]" />
                Tracking Period
              </h3>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={settings.trackingStartDate || ''}
                  onChange={(e) => setSettings({ ...settings, trackingStartDate: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                />
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                  Override the tracking window start date. By default, it uses the first log entry.
                </p>
              </div>
            </div>
            
            {/* Status Messages */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div className="text-sm">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 flex items-start gap-3">
                <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                <div className="text-sm">Settings saved successfully!</div>
              </div>
            )}
          </div>
        )}

        <div className={`mt-6 pt-4 border-t border-[var(--border)] ${embedded ? 'sticky bottom-0 bg-[var(--background)]' : ''}`}>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex-1 py-2.5 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
            {!embedded && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      {content}
    </div>
  );
}
