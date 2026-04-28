import { ChefHat, ShoppingBag, CreditCard, type LucideIcon } from 'lucide-react';
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
  }
}
