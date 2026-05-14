import { ChefHat, ShoppingBag, CreditCard, Wallet, CalendarX, CalendarCheck, type LucideIcon } from 'lucide-react';
import { RecordType } from '@/types';

export interface LogTypeConfig {
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
}

export function getLogTypeConfig(type: RecordType): LogTypeConfig {
  switch (type) {
    case RecordType.COOK:
      return {
        icon: ChefHat,
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        borderClass: 'border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500',
      };
    case RecordType.GROCERY:
      return {
        icon: ShoppingBag,
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
      };
    case RecordType.PAYMENT:
      return {
        icon: CreditCard,
        colorClass: 'text-purple-600',
        bgClass: 'bg-purple-50 dark:bg-purple-900/20',
        borderClass: 'border-purple-200 dark:border-purple-800',
        dotClass: 'bg-purple-500',
      };
    case RecordType.ADVANCE:
      return {
        icon: Wallet,
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50 dark:bg-amber-900/20',
        borderClass: 'border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
      };
    case RecordType.MISSED:
      return {
        icon: CalendarX,
        colorClass: 'text-rose-600',
        bgClass: 'bg-rose-50 dark:bg-rose-900/20',
        borderClass: 'border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500',
      };
    case RecordType.PAID_LEAVE:
      return {
        icon: CalendarCheck,
        colorClass: 'text-teal-600',
        bgClass: 'bg-teal-50 dark:bg-teal-900/20',
        borderClass: 'border-teal-200 dark:border-teal-800',
        dotClass: 'bg-teal-500',
      };
  }
}
