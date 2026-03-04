'use client';

import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { BillTemplate } from './BillTemplate';
import { 
  filterLogsForBill, 
  convertLogsToBillItems, 
  calculateBillSummary,
  generateBillNumber,
  formatBillDate
} from '@/lib/billCalculations';
import { LogEntry } from '@/types';
import { FileText, Download, X, Calendar, Loader2 } from 'lucide-react';

interface BillGeneratorProps {
  onClose: () => void;
}

export default function BillGenerator({ onClose }: BillGeneratorProps) {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('Bishnu Maya Thapa');
  const [billTitle, setBillTitle] = useState('Full Receipt');

  useEffect(() => {
    fetchLogs();
    initializeDates();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      setAllLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const initializeDates = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const handleGeneratePDF = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Filter logs for the selected date range
      const filteredLogs = filterLogsForBill(allLogs, startDate, endDate);

      if (filteredLogs.length === 0) {
        setError('No logs found in the selected date range');
        return;
      }

      // Convert logs to bill items
      const billItems = convertLogsToBillItems(filteredLogs);

      if (billItems.length === 0) {
        setError('No billable items found in the selected date range');
        return;
      }

      // Calculate summary
      const summary = calculateBillSummary(filteredLogs);

      // Generate bill number
      const billNumber = generateBillNumber();

      // Format dates
      const periodStartFormatted = formatBillDate(startDate);
      const periodEndFormatted = formatBillDate(endDate);
      const generatedDate = formatBillDate(new Date().toISOString().split('T')[0]);

      // Create PDF document
      const pdfDoc = (
        <BillTemplate
          billNumber={billNumber}
          generatedDate={`${generatedDate.gregorian} (${generatedDate.nepali})`}
          periodStart={`${periodStartFormatted.gregorian} (${periodStartFormatted.nepali})`}
          periodEnd={`${periodEndFormatted.gregorian} (${periodEndFormatted.nepali})`}
          items={billItems}
          summary={summary}
          staffName={staffName}
          billTitle={billTitle}
        />
      );

      // Generate PDF blob
      const blob = await pdf(pdfDoc).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bill-${billNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close modal after successful generation
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const getLogCount = () => {
    if (!startDate || !endDate) return 0;
    const filtered = filterLogsForBill(allLogs, startDate, endDate);
    const items = convertLogsToBillItems(filtered);
    return items.length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--background)] max-w-2xl w-full border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--muted)] border border-[var(--border)]">
              <FileText className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Generate Bill</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Create PDF bill for staff settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            disabled={generating}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Bill Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Bill Title
            </label>
            <input
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Enter bill title (e.g., Food Spend Optimizer)"
              disabled={generating}
            />
          </div>

          {/* Staff Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Staff Name
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Enter staff member name"
              disabled={generating}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                disabled={generating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2 flex items-center gap-2">
                <Calendar size={14} />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                disabled={generating}
              />
            </div>
          </div>

          {/* Preview Info */}
          {startDate && endDate && !loading && (
            <div className="p-4 bg-[var(--muted)] border border-[var(--border)]">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Billable Items:</span>
                  <span className="font-medium text-[var(--foreground)]">{getLogCount()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Period:</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
              <span className="ml-2 text-[var(--muted-foreground)]">Loading logs...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--background)] border-t border-[var(--border)] p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors font-medium"
            disabled={generating}
          >
            Cancel
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={generating || loading || !startDate || !endDate || getLogCount() === 0}
            className="flex-1 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
