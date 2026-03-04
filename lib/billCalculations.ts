import { LogEntry, RecordType, BoughtBy, PaymentLog, CookLog, GroceryLog } from '@/types';
import NepaliDate from 'nepali-date-converter';

export interface BillSummary {
    totalCookFees: number;
    totalStaffGroceries: number;
    totalPayments: number;
    totalTips: number;
    subtotalDue: number;
    finalAmountDue: number;
    itemCount: {
        cooks: number;
        groceries: number;
        payments: number;
    };
}

export interface BillItem {
    id: string;
    date: string;
    gregorianDate: string;
    nepaliDate: string;
    type: RecordType;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    notes?: string;
}

/**
 * Check if a payment is a tip
 */
export const isTip = (paymentLog: PaymentLog): boolean => {
    const remarks = (paymentLog.remarks || '').toLowerCase();
    const notes = (paymentLog.notes || '').toLowerCase();
    return remarks.includes('tip') || notes.includes('tip') || paymentLog.isTip === true;
};

/**
 * Format date to both Gregorian and Nepali
 */
export const formatBillDate = (dateString: string): { gregorian: string; nepali: string } => {
    const date = new Date(dateString);
    const gregorian = date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const nepaliDate = new NepaliDate(date);
    const nepaliMonths = [
        'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
        'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
    const nepali = `${nepaliMonths[nepaliDate.getMonth()]} ${nepaliDate.getDate()}, ${nepaliDate.getYear()}`;

    return { gregorian, nepali };
};

/**
 * Generate unique bill number based on timestamp
 */
export const generateBillNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `BILL-${year}${month}${day}-${hours}${minutes}${seconds}`;
};

/**
 * Filter logs by date range
 */
export const filterLogsForBill = (
    logs: LogEntry[],
    startDate: string,
    endDate: string
): LogEntry[] => {
    return logs.filter(log => log.date >= startDate && log.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically
};

/**
 * Convert logs to bill items with running balance
 */
export const convertLogsToBillItems = (logs: LogEntry[]): BillItem[] => {
    let runningBalance = 0;
    const items: BillItem[] = [];

    logs.forEach(log => {
        const dateInfo = formatBillDate(log.date);
        let debit = 0;
        let credit = 0;
        let description = '';
        let notes = log.notes;

        switch (log.recordType) {
            case RecordType.COOK: {
                const cookLog = log as CookLog;
                debit = cookLog.baseFee;
                description = `Cook Fee - ${cookLog.menu}`;
                if (cookLog.daysFoodLasted) {
                    notes = notes
                        ? `${notes} | Lasted ${cookLog.daysFoodLasted} days`
                        : `Lasted ${cookLog.daysFoodLasted} days`;
                }
                break;
            }
            case RecordType.GROCERY: {
                const groceryLog = log as GroceryLog;
                if (groceryLog.boughtBy === BoughtBy.STAFF) {
                    debit = groceryLog.amount;
                    description = `Grocery - ${groceryLog.category} (Reimbursable)`;
                }
                break;
            }
            case RecordType.PAYMENT: {
                const paymentLog = log as PaymentLog;
                if (!isTip(paymentLog)) {
                    credit = paymentLog.amountPaid;
                    description = 'Payment';
                    if (paymentLog.method) {
                        description += ` - ${paymentLog.method}`;
                    }
                    if (paymentLog.remarks) {
                        notes = notes
                            ? `${notes} | ${paymentLog.remarks}`
                            : paymentLog.remarks;
                    }
                }
                break;
            }
        }

        // Only add items that have debit or credit
        if (debit > 0 || credit > 0) {
            runningBalance += debit - credit;
            items.push({
                id: log._id || '',
                date: log.date,
                gregorianDate: dateInfo.gregorian,
                nepaliDate: dateInfo.nepali,
                type: log.recordType,
                description,
                debit,
                credit,
                balance: runningBalance,
                notes
            });
        }
    });

    return items;
};

/**
 * Calculate bill summary totals
 */
export const calculateBillSummary = (logs: LogEntry[]): BillSummary => {
    let totalCookFees = 0;
    let totalStaffGroceries = 0;
    let totalPayments = 0;
    let totalTips = 0;
    let cookCount = 0;
    let groceryCount = 0;
    let paymentCount = 0;

    logs.forEach(log => {
        switch (log.recordType) {
            case RecordType.COOK: {
                const cookLog = log as CookLog;
                totalCookFees += cookLog.baseFee;
                cookCount++;
                break;
            }
            case RecordType.GROCERY: {
                const groceryLog = log as GroceryLog;
                if (groceryLog.boughtBy === BoughtBy.STAFF) {
                    totalStaffGroceries += groceryLog.amount;
                    groceryCount++;
                }
                break;
            }
            case RecordType.PAYMENT: {
                const paymentLog = log as PaymentLog;
                if (isTip(paymentLog)) {
                    totalTips += paymentLog.amountPaid;
                } else {
                    totalPayments += paymentLog.amountPaid;
                    paymentCount++;
                }
                break;
            }
        }
    });

    const subtotalDue = totalCookFees + totalStaffGroceries;
    const finalAmountDue = subtotalDue - totalPayments;

    return {
        totalCookFees,
        totalStaffGroceries,
        totalPayments,
        totalTips,
        subtotalDue,
        finalAmountDue,
        itemCount: {
            cooks: cookCount,
            groceries: groceryCount,
            payments: paymentCount
        }
    };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
