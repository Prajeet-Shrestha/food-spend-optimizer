import { LogEntry, RecordType, BoughtBy, PaymentLog, CookLog, GroceryLog, AdvanceLog } from '@/types';
import { formatBilingualDate } from './dateUtils';

export interface BillSummary {
    totalCookFees: number;
    totalStaffGroceries: number; // Reimbursable portion only (post-advance drawdown)
    totalPayments: number;
    totalTips: number;
    subtotalDue: number;
    finalAmountDue: number;
    totalAdvancesGivenInPeriod: number;
    totalAdvancesDrawnInPeriod: number;
    itemCount: {
        cooks: number;
        groceries: number;
        payments: number;
        advances: number;
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
    // Signed advance flow: positive = cash given to cook, negative = drawdown
    // against an outstanding advance. Zero/undefined for unrelated rows.
    advance: number;
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

export const formatBillDate = formatBilingualDate;

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
 * Convert logs to bill items with running balance.
 *
 * `perGroceryDrawn` must be computed on the FULL log history (not just the
 * filtered slice passed in here) so prior-period advances correctly cover
 * groceries inside the bill window.
 */
export const convertLogsToBillItems = (
    logs: LogEntry[],
    perGroceryDrawn?: Map<string, number>
): BillItem[] => {
    let runningBalance = 0;
    const items: BillItem[] = [];
    const drawn = perGroceryDrawn ?? new Map<string, number>();

    logs.forEach(log => {
        const dateInfo = formatBillDate(log.date);
        let debit = 0;
        let credit = 0;
        let advance = 0;
        let description = '';
        let notes = log.notes;
        let isMemo = false;

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
                    const drawnFromAdvance = (groceryLog._id && drawn.get(groceryLog._id)) || 0;
                    const reimbursable = groceryLog.amount - drawnFromAdvance;
                    if (drawnFromAdvance > 0) {
                        advance = -drawnFromAdvance;
                    }
                    if (reimbursable > 0) {
                        debit = reimbursable;
                        description = drawnFromAdvance > 0
                            ? `Grocery - ${groceryLog.category} (partial advance)`
                            : `Grocery - ${groceryLog.category} (Reimbursable)`;
                    } else {
                        // Fully covered by advance — emit as memo so the cook can see what happened.
                        isMemo = true;
                        description = `Grocery - ${groceryLog.category} (covered by advance)`;
                    }
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
            case RecordType.ADVANCE: {
                const advanceLog = log as AdvanceLog;
                isMemo = true;
                advance = advanceLog.amountGiven;
                description = `Advance Given`;
                break;
            }
        }

        const hasMoneyMovement = debit > 0 || credit > 0 || advance !== 0;

        if (hasMoneyMovement) {
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
                advance,
                balance: runningBalance,
                notes
            });
        } else if (isMemo) {
            // Memo row with no money movement: balance carries forward unchanged.
            items.push({
                id: log._id || '',
                date: log.date,
                gregorianDate: dateInfo.gregorian,
                nepaliDate: dateInfo.nepali,
                type: log.recordType,
                description,
                debit: 0,
                credit: 0,
                advance: 0,
                balance: runningBalance,
                notes
            });
        }
    });

    return items;
};

/**
 * Calculate bill summary totals.
 *
 * `perGroceryDrawn` should be computed on the FULL log history; staff grocery
 * totals here are the post-drawdown reimbursable amounts.
 */
export const calculateBillSummary = (
    logs: LogEntry[],
    perGroceryDrawn?: Map<string, number>
): BillSummary => {
    let totalCookFees = 0;
    let totalStaffGroceries = 0;
    let totalPayments = 0;
    let totalTips = 0;
    let totalAdvancesGivenInPeriod = 0;
    let totalAdvancesDrawnInPeriod = 0;
    let cookCount = 0;
    let groceryCount = 0;
    let paymentCount = 0;
    let advanceCount = 0;
    const drawn = perGroceryDrawn ?? new Map<string, number>();

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
                    const drawnFromAdvance = (groceryLog._id && drawn.get(groceryLog._id)) || 0;
                    totalStaffGroceries += (groceryLog.amount - drawnFromAdvance);
                    totalAdvancesDrawnInPeriod += drawnFromAdvance;
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
            case RecordType.ADVANCE: {
                const advanceLog = log as AdvanceLog;
                totalAdvancesGivenInPeriod += advanceLog.amountGiven;
                advanceCount++;
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
        totalAdvancesGivenInPeriod,
        totalAdvancesDrawnInPeriod,
        itemCount: {
            cooks: cookCount,
            groceries: groceryCount,
            payments: paymentCount,
            advances: advanceCount
        }
    };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
