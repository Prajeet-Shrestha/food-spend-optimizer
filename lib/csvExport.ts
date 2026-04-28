import { LogEntry, RecordType, CookLog, GroceryLog, PaymentLog } from '@/types';
import { formatBilingualDate } from './dateUtils';
import { isTip } from './billCalculations';

const COLUMNS = [
  'Date',
  'Nepali Date',
  'Type',
  'Description',
  'Amount',
  'Bought By',
  'Method',
  'Reimbursable',
  'Is Tip',
  'Notes',
] as const;

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowFor(log: LogEntry): string[] {
  const date = log.date.slice(0, 10);
  const { nepali } = formatBilingualDate(log.date);

  switch (log.recordType) {
    case RecordType.COOK: {
      const c = log as CookLog;
      return [date, nepali, 'COOK', c.menu, String(c.baseFee), '', '', '', '', c.notes ?? ''];
    }
    case RecordType.GROCERY: {
      const g = log as GroceryLog;
      return [
        date, nepali, 'GROCERY',
        g.category || 'Grocery',
        String(g.amount),
        g.boughtBy,
        '',
        g.reimbursable ? 'Yes' : 'No',
        '',
        g.notes ?? '',
      ];
    }
    case RecordType.PAYMENT: {
      const p = log as PaymentLog;
      return [
        date, nepali, 'PAYMENT',
        'Payment',
        String(p.amountPaid),
        '',
        p.method ?? '',
        '',
        isTip(p) ? 'Yes' : 'No',
        [p.remarks, p.notes].filter(Boolean).join(' | '),
      ];
    }
  }
}

export function logsToCsv(logs: LogEntry[]): string {
  const lines: string[] = [];
  lines.push(COLUMNS.map(escapeCell).join(','));
  for (const log of logs) {
    lines.push(rowFor(log).map(escapeCell).join(','));
  }
  // UTF-8 BOM so Excel/Numbers render Devanagari correctly.
  return '﻿' + lines.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
