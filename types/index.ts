export enum RecordType {
  COOK = 'COOK',
  GROCERY = 'GROCERY',
  PAYMENT = 'PAYMENT',
}

export enum BoughtBy {
  STAFF = 'STAFF',
  ME = 'ME',
}

// Base fields shared by all log types
export interface BaseLog {
  _id?: string;
  recordType: RecordType;
  date: string; // ISO date string
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Cook Log
export interface CookLog extends BaseLog {
  recordType: RecordType.COOK;
  menu: string;
  baseFee: number; // Snapshot from settings at time of creation
  daysFoodLasted?: number; // Derived: calculated from previous cook date
}

// Grocery Log
export interface GroceryLog extends BaseLog {
  recordType: RecordType.GROCERY;
  category: string;
  amount: number;
  boughtBy: BoughtBy;
  reimbursable: boolean; // Derived: boughtBy === BoughtBy.STAFF
  linkedCookId?: string; // Optional link to a cook log
}

// Payment Log
export interface PaymentLog extends BaseLog {
  recordType: RecordType.PAYMENT;
  amountPaid: number;
  method?: string;
  remarks?: string;
  isTip?: boolean; // Flag to explicitly mark tips
}

// Union type for all log entries
export type LogEntry = CookLog | GroceryLog | PaymentLog;

// Dashboard metrics
export interface DashboardMetrics {
  amountDue: number;
  totalFoodSpend: {
    thisMonth: number;
    allTime: number;
  };
  monthlyBreakdown: Array<{
    month: string; // e.g., "Nov 2025"
    year: number;
    monthName: string;
    totalSpend: number;
    cookCount: number;
    groceryCount: number;
  }>;
  effectiveDailyCost: number;
  avgCookCostPerDay: number; // Added: breakdown of cook cost
  avgGroceriesCostPerDay: number; // Added: breakdown of groceries cost
  baselineCost: {
    low: number;
    high: number;
    avg: number;
  };
  savings: {
    daily: number;
    monthly: number;
    vsLow: number;
    vsHigh: number;
  };
  trackingWindow: {
    startDate: string;
    endDate: string;
    days: number;
  };
  stats: {
    totalCookSessions: number;
    totalGroceries: number;
    totalPayments: number;
  };
}

