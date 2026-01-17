'use client';

import { useEffect, useState } from 'react';
import { LogEntry, RecordType, BoughtBy, PaymentLog } from '@/types';
import NepaliDate from 'nepali-date-converter';

interface LogListProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function LogList({ refreshTrigger, onRefresh }: LogListProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]); // Keep all logs for calculations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecordType | 'ALL'>('ALL');
  const [settings, setSettings] = useState<any>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; step: number } | null>(null);
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch filtered logs for display
      const params = new URLSearchParams();
      if (filter !== 'ALL') {
        params.append('type', filter);
      }
      
      const response = await fetch(`/api/logs?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      setLogs(data.logs);
      
      // Also fetch all logs (without filter) for amount calculations
      const allResponse = await fetch(`/api/logs`);
      const allData = await allResponse.json();
      if (allResponse.ok) {
        setAllLogs(allData.logs || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };
  
  useEffect(() => {
    fetchLogs();
    fetchSettings();
  }, [filter, refreshTrigger]);
  
  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Check if a payment is a tip
   */
  const isTip = (paymentLog: PaymentLog): boolean => {
    const remarks = (paymentLog.remarks || '').toLowerCase();
    const notes = (paymentLog.notes || '').toLowerCase();
    return remarks.includes('tip') || notes.includes('tip') || paymentLog.isTip === true;
  };

  /**
   * Calculate amount due up to a specific date (inclusive)
   */
  const calculateAmountDueUpToDate = (upToDate: string): number => {
    if (!settings) return 0;

    // Get all logs up to and including the specified date (use allLogs, not filtered logs)
    const logsUpToDate = allLogs.filter((log: LogEntry) => log.date <= upToDate);

    // Calculate cook fees
    const cookLogs = logsUpToDate.filter((log: LogEntry) => log.recordType === RecordType.COOK);
    const cookFees = cookLogs.reduce((sum: number, log: LogEntry) => {
      const cookLog = log as any;
      return sum + (cookLog.baseFee || settings.baseFee || 0);
    }, 0);

    // Calculate staff groceries
    const staffGroceries = logsUpToDate.filter(
      (log: LogEntry) => log.recordType === RecordType.GROCERY && (log as any).boughtBy === BoughtBy.STAFF
    );
    const staffGroceryTotal = staffGroceries.reduce((sum: number, log: LogEntry) => {
      const groceryLog = log as any;
      return sum + (groceryLog.amount || 0);
    }, 0);

    // Calculate non-tip payments
    const payments = logsUpToDate.filter((log: LogEntry) => log.recordType === RecordType.PAYMENT);
    const nonTipPaymentTotal = payments
      .filter((log: LogEntry) => !isTip(log as PaymentLog))
      .reduce((sum: number, log: LogEntry) => {
        const paymentLog = log as any;
        return sum + (paymentLog.amountPaid || 0);
      }, 0);

    return cookFees + staffGroceryTotal - nonTipPaymentTotal;
  };

  const handleDelete = async (logId: string) => {
    if (!deleteConfirm || deleteConfirm.id !== logId) {
      // First confirmation
      setDeleteConfirm({ id: logId, step: 1 });
      return;
    }

    if (deleteConfirm.step === 1) {
      // Second confirmation
      setDeleteConfirm({ id: logId, step: 2 });
      return;
    }

    // Execute delete
    try {
      const response = await fetch(`/api/logs/${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete log');
      }

      // Refresh logs
      await fetchLogs();
      if (onRefresh) onRefresh();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Failed to delete log. Please try again.');
    }
  };

  const handleEdit = (log: LogEntry) => {
    setEditingLog(log);
  };

  const handleSaveEdit = async (updatedLog: LogEntry) => {
    try {
      const response = await fetch(`/api/logs/${updatedLog._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLog),
      });

      if (!response.ok) {
        throw new Error('Failed to update log');
      }

      // Refresh logs
      await fetchLogs();
      if (onRefresh) onRefresh();
      setEditingLog(null);
    } catch (err) {
      console.error('Error updating log:', err);
      alert('Failed to update log. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Format Gregorian date
    const gregorian = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Convert to Nepali date (BS)
    const nepaliDate = new NepaliDate(date);
    const nepaliMonths = [
      'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
      'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
    const nepaliMonth = nepaliMonths[nepaliDate.getMonth()];
    const nepaliDay = nepaliDate.getDate();
    const nepaliYear = nepaliDate.getYear();
    const nepali = `${nepaliMonth} ${nepaliDay}, ${nepaliYear}`;
    
    return (
      <div className="text-sm">
        <span className="font-medium">{gregorian}</span> | <span className="text-xs text-zinc-500 dark:text-zinc-400">{nepali}</span>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-black dark:text-zinc-50">
          Loading logs...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400">
          Error: {error}
        </div>
        <button
          onClick={fetchLogs}
          className="mt-4 px-4 py-2 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
          Recent Logs
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as RecordType | 'ALL')}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
        >
          <option value="ALL">All Types</option>
          {Object.values(RecordType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
          No logs found. Create your first log entry above!
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    log.recordType === RecordType.COOK
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      : log.recordType === RecordType.GROCERY
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  }`}>
                    {log.recordType}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(log.date)}
                  </span>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(log)}
                    className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Edit"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(log._id!)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      deleteConfirm?.id === log._id
                        ? (deleteConfirm?.step === 1
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')
                        : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                    title={
                      deleteConfirm?.id === log._id
                        ? (deleteConfirm?.step === 1
                          ? 'Click again to confirm'
                          : 'Click once more to delete')
                        : 'Delete'
                    }
                  >
                    {deleteConfirm?.id === log._id
                      ? (deleteConfirm?.step === 1
                        ? '⚠️ Confirm?'
                        : '🗑️ Sure?')
                      : '🗑️ Delete'}
                  </button>
                </div>
              </div>
              
              {log.recordType === RecordType.COOK && (
                <div className="space-y-1">
                  <div className="font-medium text-black dark:text-zinc-50">
                    Menu: {(log as any).menu}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Base Fee: {formatCurrency((log as any).baseFee || 0)}
                    {(log as any).daysFoodLasted && (
                      <>
                        <span className="ml-2" style={{color: (log as any).daysFoodLasted >= 5? 'red': 'green'}}>
                          • Gap: {(log as any).daysFoodLasted} days
                        </span>
                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                          • Per-day cost: {formatCurrency((log as any).baseFee / ((log as any).daysFoodLasted >= 5? 4:(log as any).daysFoodLasted))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {log.recordType === RecordType.GROCERY && (
                <div className="space-y-1">
                  <div className="font-medium text-black dark:text-zinc-50">
                    {(log as any).category && `${(log as any).category} • `}
                    {formatCurrency((log as any).amount)}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Bought by: {(log as any).boughtBy}
                    {(log as any).reimbursable && (
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                        (Reimbursable)
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {log.recordType === RecordType.PAYMENT && (
                <div className="space-y-1">
                  <div className="font-medium text-black dark:text-zinc-50">
                    {formatCurrency((log as any).amountPaid)}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {(log as any).method && `Method: ${(log as any).method} • `}
                    {(log as any).remarks && `Remarks: ${(log as any).remarks}`}
                  </div>
                </div>
              )}
              
              {log.notes && (
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 italic">
                  {log.notes}
                </div>
              )}

              {/* Amount Due Till This Date - Only for COOK logs, at the bottom */}
              {log.recordType === RecordType.COOK && (
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 bg-yellow-50 dark:bg-yellow-900/10 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Amount to be Paid (till this date):
                    </span>
                    <span className="text-lg font-bold text-yellow-900 dark:text-yellow-200">
                      {formatCurrency(calculateAmountDueUpToDate(log.date))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-black dark:text-zinc-50 mb-4">
              Edit {editingLog.recordType} Log
            </h3>
            
            <EditForm
              log={editingLog}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Form Component
interface EditFormProps {
  log: LogEntry;
  onSave: (log: LogEntry) => void;
  onCancel: () => void;
}

function EditForm({ log, onSave, onCancel }: EditFormProps) {
  const [formData, setFormData] = useState<any>({
    ...log,
    date: log.date,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
          required
        />
      </div>

      {/* Type-specific fields */}
      {formData.recordType === RecordType.COOK && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Menu
            </label>
            <input
              type="text"
              value={formData.menu || ''}
              onChange={(e) => setFormData({ ...formData, menu: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Base Fee
            </label>
            <input
              type="number"
              value={formData.baseFee || 0}
              onChange={(e) => setFormData({ ...formData, baseFee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
              min="0"
            />
          </div>
        </>
      )}

      {formData.recordType === RecordType.GROCERY && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={formData.amount || 0}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Bought By
            </label>
            <select
              value={formData.boughtBy || BoughtBy.ME}
              onChange={(e) => setFormData({ ...formData, boughtBy: e.target.value as BoughtBy })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
            >
              <option value={BoughtBy.ME}>ME</option>
              <option value={BoughtBy.STAFF}>STAFF</option>
            </select>
          </div>
        </>
      )}

      {formData.recordType === RecordType.PAYMENT && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Amount Paid
            </label>
            <input
              type="number"
              value={formData.amountPaid || 0}
              onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Method
            </label>
            <input
              type="text"
              value={formData.method || ''}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isTip"
              checked={formData.isTip || false}
              onChange={(e) => setFormData({ ...formData, isTip: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isTip" className="text-sm text-zinc-700 dark:text-zinc-300">
              This is a tip
            </label>
          </div>
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
          rows={2}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-zinc-300 dark:bg-zinc-700 text-black dark:text-zinc-50 rounded-md hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

