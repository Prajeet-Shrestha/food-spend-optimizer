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
    
    return { gregorian, nepali };
  };

  const getLogTypeIcon = (type: RecordType) => {
    switch (type) {
      case RecordType.COOK:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      case RecordType.GROCERY:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case RecordType.PAYMENT:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
    }
  };

  const getLogTypeColors = (type: RecordType) => {
    switch (type) {
      case RecordType.COOK:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-300 dark:border-blue-700',
          text: 'text-blue-800 dark:text-blue-300',
          badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
          icon: 'text-blue-600 dark:text-blue-400'
        };
      case RecordType.GROCERY:
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-300 dark:border-green-700',
          text: 'text-green-800 dark:text-green-300',
          badge: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
          icon: 'text-green-600 dark:text-green-400'
        };
      case RecordType.PAYMENT:
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-300 dark:border-purple-700',
          text: 'text-purple-800 dark:text-purple-300',
          badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
          icon: 'text-purple-600 dark:text-purple-400'
        };
    }
  };
  
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 sm:py-16 text-black dark:text-zinc-50">
          <div className="text-lg sm:text-xl font-medium mb-2">Loading logs...</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Please wait</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="p-4 sm:p-5 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400 mb-4">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm sm:text-base">{error}</div>
        </div>
        <button
          onClick={fetchLogs}
          className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 mb-1">
              Recent Logs
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              View and manage your food expense records
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Filter by Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as RecordType | 'ALL')}
              className="w-full sm:w-48 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="ALL">All Types</option>
              {Object.values(RecordType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 sm:p-12 lg:p-16">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No logs found
            </h3>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              {filter === 'ALL' 
                ? 'Create your first log entry to get started!'
                : `No ${filter} logs found. Try selecting a different filter.`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {logs.map((log) => {
            const colors = getLogTypeColors(log.recordType);
            const dateInfo = formatDate(log.date);
            
            return (
              <div
                key={log._id}
                className={`bg-white dark:bg-zinc-900 rounded-xl shadow-lg border ${colors.border} overflow-hidden transition-all hover:shadow-xl`}
              >
                {/* Card Header */}
                <div className={`${colors.bg} px-5 sm:px-6 py-4 border-b ${colors.border}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                        <div className={colors.icon}>
                          {getLogTypeIcon(log.recordType)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${colors.badge} uppercase tracking-wide`}>
                            {log.recordType}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {dateInfo.gregorian}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {dateInfo.nepali}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEdit(log)}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                        title="Edit"
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(log._id!)}
                        className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                          deleteConfirm?.id === log._id
                            ? (deleteConfirm?.step === 1
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700')
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                        title={
                          deleteConfirm?.id === log._id
                            ? (deleteConfirm?.step === 1
                              ? 'Click again to confirm'
                              : 'Click once more to delete')
                            : 'Delete'
                        }
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          {deleteConfirm?.id === log._id ? (
                            deleteConfirm?.step === 1 ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Confirm?
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Sure?
                              </>
                            )
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="px-5 sm:px-6 py-5 sm:py-6">
                  {log.recordType === RecordType.COOK && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Menu
                        </div>
                        <div className="text-base sm:text-lg font-semibold text-black dark:text-zinc-50">
                          {(log as any).menu}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Base Fee</div>
                          <div className="text-sm sm:text-base font-bold text-black dark:text-zinc-50">
                            {formatCurrency((log as any).baseFee || 0)}
                          </div>
                        </div>
                        {(log as any).daysFoodLasted && (
                          <>
                            <div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Gap</div>
                              <div className={`text-sm sm:text-base font-bold ${
                                (log as any).daysFoodLasted >= 5 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                              }`}>
                                {(log as any).daysFoodLasted} days
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Per-day Cost</div>
                              <div className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency((log as any).baseFee / ((log as any).daysFoodLasted >= 5 ? 4 : (log as any).daysFoodLasted))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {log.recordType === RecordType.GROCERY && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          {(log as any).category || 'Grocery'}
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                          {formatCurrency((log as any).amount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Bought by:</span>
                        <span className="text-sm font-semibold text-black dark:text-zinc-50">
                          {(log as any).boughtBy}
                        </span>
                        {(log as any).reimbursable && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                            Reimbursable
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {log.recordType === RecordType.PAYMENT && (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Amount Paid
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                          {formatCurrency((log as any).amountPaid)}
                        </div>
                      </div>
                      {((log as any).method || (log as any).remarks) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                          {(log as any).method && (
                            <div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Method</div>
                              <div className="text-sm font-semibold text-black dark:text-zinc-50">
                                {(log as any).method}
                              </div>
                            </div>
                          )}
                          {(log as any).remarks && (
                            <div>
                              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Remarks</div>
                              <div className="text-sm font-semibold text-black dark:text-zinc-50">
                                {(log as any).remarks}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {log.notes && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Notes</div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                        {log.notes}
                      </div>
                    </div>
                  )}

                  {/* Amount Due Till This Date - Only for COOK logs */}
                  {log.recordType === RecordType.COOK && (
                    <div className="mt-5 pt-5 border-t-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 -mx-5 sm:-mx-6 px-5 sm:px-6 py-4 rounded-b-xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          Amount Due (till this date)
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                          {formatCurrency(calculateAmountDueUpToDate(log.date))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-zinc-50 mb-1">
                Edit {editingLog.recordType} Log
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Update the log entry details
              </p>
            </div>
            
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          required
        />
      </div>

      {/* Type-specific fields */}
      {formData.recordType === RecordType.COOK && (
        <>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Menu
            </label>
            <input
              type="text"
              value={formData.menu || ''}
              onChange={(e) => setFormData({ ...formData, menu: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Base Fee
            </label>
            <input
              type="number"
              value={formData.baseFee || 0}
              onChange={(e) => setFormData({ ...formData, baseFee: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
              min="0"
            />
          </div>
        </>
      )}

      {formData.recordType === RecordType.GROCERY && (
        <>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Category
            </label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={formData.amount || 0}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Bought By
            </label>
            <select
              value={formData.boughtBy || BoughtBy.ME}
              onChange={(e) => setFormData({ ...formData, boughtBy: e.target.value as BoughtBy })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Amount Paid
            </label>
            <input
              type="number"
              value={formData.amountPaid || 0}
              onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Method
            </label>
            <input
              type="text"
              value={formData.method || ''}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Remarks
            </label>
            <input
              type="text"
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <input
              type="checkbox"
              id="isTip"
              checked={formData.isTip || false}
              onChange={(e) => setFormData({ ...formData, isTip: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isTip" className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              This is a tip
            </label>
          </div>
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          rows={3}
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors font-semibold text-sm sm:text-base"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
