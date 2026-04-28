'use client';

import { useEffect, useState } from 'react';
import { LogEntry, RecordType, BoughtBy, PaymentLog } from '@/types';
import {
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X,
  UtensilsCrossed,
  Calendar,
  Wallet,
  MoreHorizontal,
  FileText
} from 'lucide-react';
import BillGenerator from './BillGenerator';
import { formatBilingualDate } from '@/lib/dateUtils';
import { getLogTypeConfig } from '@/lib/logTypeConfig';

interface LogListProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function LogList({ refreshTrigger, onRefresh }: LogListProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecordType | 'ALL'>('ALL');
  const [settings, setSettings] = useState<any>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; step: number } | null>(null);
  const [showBillGenerator, setShowBillGenerator] = useState(false);
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
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

  const isTip = (paymentLog: PaymentLog): boolean => {
    const remarks = (paymentLog.remarks || '').toLowerCase();
    const notes = (paymentLog.notes || '').toLowerCase();
    return remarks.includes('tip') || notes.includes('tip') || paymentLog.isTip === true;
  };

  // Calculate amount due up to and including a specific log entry
  // Uses both date AND _id to properly handle multiple entries on the same day
  const calculateAmountDueUpToEntry = (currentLogId: string, upToDate: string): number => {
    if (!settings) return 0;

    // Filter logs that are either:
    // 1. On an earlier date, OR
    // 2. On the same date but created before or at the same time (by _id comparison)
    // MongoDB ObjectIds are chronologically sortable as strings
    const logsUpToEntry = allLogs.filter((log: LogEntry) => {
      if (log.date < upToDate) return true;
      if (log.date === upToDate) {
        // Same date: include only entries created before or at the same time
        return log._id! <= currentLogId;
      }
      return false;
    });

    const cookLogs = logsUpToEntry.filter((log: LogEntry) => log.recordType === RecordType.COOK);
    const cookFees = cookLogs.reduce((sum: number, log: LogEntry) => {
      const cookLog = log as any;
      return sum + (cookLog.baseFee || settings.baseFee || 0);
    }, 0);

    const staffGroceries = logsUpToEntry.filter(
      (log: LogEntry) => log.recordType === RecordType.GROCERY && (log as any).boughtBy === BoughtBy.STAFF
    );
    const staffGroceryTotal = staffGroceries.reduce((sum: number, log: LogEntry) => {
      const groceryLog = log as any;
      return sum + (groceryLog.amount || 0);
    }, 0);

    // Exclude payments from the SAME date to show the balance BEFORE settlement
    // Also exclude payments created after the current entry on earlier dates
    const payments = logsUpToEntry.filter(
      (log: LogEntry) => log.recordType === RecordType.PAYMENT && log.date < upToDate
    );
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
      setDeleteConfirm({ id: logId, step: 1 });
      return;
    }

    if (deleteConfirm.step === 1) {
      setDeleteConfirm({ id: logId, step: 2 });
      return;
    }

    try {
      const response = await fetch(`/api/logs/${logId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete log');
      }

      await fetchLogs();
      if (onRefresh) onRefresh();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting log:', err);
      // Ideally show a toast here
    }
  };

  const handleEdit = (log: LogEntry) => {
    setEditingLog(log);
  };

  const handleSaveEdit = async (updatedLog: LogEntry) => {
    try {
      const response = await fetch(`/api/logs/${updatedLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog),
      });

      if (!response.ok) {
        throw new Error('Failed to update log');
      }

      await fetchLogs();
      if (onRefresh) onRefresh();
      setEditingLog(null);
    } catch (err) {
      console.error('Error updating log:', err);
    }
  };

  const formatDate = formatBilingualDate;


  if (loading) {
    return (
      <div className="w-full bg-[var(--card)] rounded-xl border border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
        <div className="animate-pulse">Loading logs...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full bg-[var(--card)] rounded-xl border border-[var(--border)] p-8">
        <div className="flex items-center gap-3 text-[var(--destructive)] mb-4">
          <AlertCircle />
          <div className="font-semibold">Error loading logs</div>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button onClick={fetchLogs} className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md">Retry</button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <button
          onClick={() => setShowBillGenerator(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity font-medium"
        >
          <FileText size={16} />
          Generate Bill
        </button>

        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as RecordType | 'ALL')}
            className="w-full appearance-none pl-4 pr-10 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="ALL">All Records</option>
            {Object.values(RecordType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <div className="absolute right-3 top-2.5 pointer-events-none text-[var(--muted-foreground)]">
            <MoreHorizontal size={14} />
          </div>
        </div>
      </div>
      
      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[var(--foreground)]">No logs found</h3>
          <p className="text-[var(--muted-foreground)]">
            {filter === 'ALL' ? 'Create your first log entry to get started.' : `No ${filter} logs found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => {
            const config = getLogTypeConfig(log.recordType);
            const dateInfo = formatDate(log.date);
            const Icon = config.icon;
            
            return (
              <div
                key={log._id}
                className={`group relative bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all overflow-hidden`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Left Stripe / Icon Area */}
                  <div className={`w-full sm:w-2 ${config.bgClass}`}></div>
                  
                  <div className="flex-1 p-4 sm:p-5 min-w-0">
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`p-2 sm:p-2.5 rounded-full ${config.bgClass} ${config.colorClass} shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold text-[var(--foreground)] break-words">
                              {log.recordType === RecordType.COOK && (log as any).menu}
                              {log.recordType === RecordType.GROCERY && ((log as any).category || 'Grocery')}
                              {log.recordType === RecordType.PAYMENT && 'Payment'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${config.bgClass} ${config.colorClass}`}>
                              {log.recordType}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {dateInfo.gregorian}
                            </span>
                            <span className="opacity-50">•</span>
                            <span>{dateInfo.nepali}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                         <div className="text-base sm:text-xl font-bold text-[var(--foreground)] tabular-nums whitespace-nowrap">
                           {log.recordType === RecordType.COOK && formatCurrency((log as any).baseFee || 0)}
                           {log.recordType === RecordType.GROCERY && formatCurrency((log as any).amount)}
                           {log.recordType === RecordType.PAYMENT && formatCurrency((log as any).amountPaid)}
                         </div>
                         {log.recordType === RecordType.GROCERY && (
                           <div className="text-xs font-medium mt-1 whitespace-nowrap">
                             <span className={(log as any).boughtBy === 'ME' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}>
                               {(log as any).boughtBy}
                             </span>
                             {(log as any).reimbursable && (
                               <span className="ml-1 text-amber-600 dark:text-amber-500">• Reimbursable</span>
                             )}
                           </div>
                         )}
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--muted-foreground)] mb-4">
                      {log.recordType === RecordType.COOK && (log as any).daysFoodLasted && (
                         <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                           <span className="flex items-center gap-1.5">
                             <ClockIcon size={14} />
                             Lasted {(log as any).daysFoodLasted} days
                           </span>
                           <span className="text-[var(--primary)] font-medium tabular-nums">
                             ({formatCurrency((log as any).baseFee / ((log as any).daysFoodLasted))} /day)
                           </span>
                         </div>
                      )}
                      {log.recordType === RecordType.PAYMENT && (log as any).method && (
                        <div className="flex items-center gap-2">
                          <Wallet size={14} />
                          <span className="break-words min-w-0">{(log as any).method}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Remarks Section (Payment Only) */}
                    {log.recordType === RecordType.PAYMENT && (log as any).remarks && (
                      <div className="mb-4 p-3 bg-[var(--muted)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] italic">
                        <span className="font-medium not-italic text-[var(--foreground)] text-xs uppercase tracking-wide mr-2">Remarks:</span>
                        "{(log as any).remarks}"
                      </div>
                    )}
                    
                    {/* Notes Section - Always visible if present */}
                    {log.notes && (
                      <div className="mb-4 p-3 bg-[var(--muted)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] italic">
                        <span className="font-medium not-italic text-[var(--foreground)] text-xs uppercase tracking-wide mr-2">Note:</span>
                        "{log.notes}"
                      </div>
                    )}
                    
                    {/* Amount Due Context (Cook Only) */}
                    {log.recordType === RecordType.COOK && (
                      <div className="mb-4 text-xs font-medium text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded tabular-nums">
                        Amount Due (till date): {formatCurrency(calculateAmountDueUpToEntry(log._id!, log.date))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(log)}
                        className="p-2.5 text-[var(--muted-foreground)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(log._id!)}
                        className={`
                          flex items-center gap-1.5 px-2.5 py-2.5 rounded-md transition-colors text-xs font-medium
                          ${deleteConfirm && deleteConfirm.id === log._id
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}
                        `}
                      >
                        <Trash2 size={16} />
                        {deleteConfirm && deleteConfirm.id === log._id && (
                          <span>{deleteConfirm.step === 1 ? 'Confirm?' : 'Sure?'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-[var(--background)] max-w-lg w-full rounded-xl shadow-2xl p-6 border border-[var(--border)] max-h-[90vh] overflow-y-auto">
             <div className="mb-6">
               <h3 className="text-xl font-bold">Edit Entry</h3>
             </div>
             <EditForm log={editingLog} onSave={handleSaveEdit} onCancel={() => setEditingLog(null)} />
           </div>
        </div>
      )}
      
      {/* Bill Generator Modal */}
      {showBillGenerator && (
        <BillGenerator onClose={() => setShowBillGenerator(false)} />
      )}
    </div>
  );
}

const ClockIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

// Edit Form Component
interface EditFormProps {
  log: LogEntry;
  onSave: (log: LogEntry) => void;
  onCancel: () => void;
}

function EditForm({ log, onSave, onCancel }: EditFormProps) {
  const [formData, setFormData] = useState<any>({ ...log });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          required
        />
      </div>

      {formData.recordType === RecordType.COOK && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Menu</label>
            <input
              type="text"
              value={formData.menu || ''}
              onChange={(e) => setFormData({ ...formData, menu: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Base Fee</label>
            <input
              type="number"
              value={formData.baseFee || 0}
              onChange={(e) => setFormData({ ...formData, baseFee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              required
            />
          </div>
        </>
      )}

      {formData.recordType === RecordType.GROCERY && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount || 0}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bought By</label>
            <select
              value={formData.boughtBy || BoughtBy.ME}
              onChange={(e) => setFormData({ ...formData, boughtBy: e.target.value as BoughtBy })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
            <label className="block text-sm font-medium mb-1">Amount Paid</label>
            <input
              type="number"
              value={formData.amountPaid || 0}
              onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              required
            />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Method</label>
             <input
              type="text"
              value={formData.method || ''}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
             <label className="block text-sm font-medium mb-1">Remarks</label>
             <input
              type="text"
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </>
       )}

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-[var(--primary)] text-[var(--primary-foreground)] py-2 rounded-md font-medium hover:opacity-90">Save</button>
        <button type="button" onClick={onCancel} className="flex-1 border border-[var(--border)] py-2 rounded-md font-medium hover:bg-[var(--accent)]">Cancel</button>
      </div>
    </form>
  );
}
