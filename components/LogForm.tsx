'use client';

import { useState, FormEvent } from 'react';
import { RecordType, BoughtBy } from '@/types';
import { ChefHat, ShoppingBag, CreditCard } from 'lucide-react';

interface LogFormProps {
  onSuccess?: () => void;
}

export default function LogForm({ onSuccess }: LogFormProps) {
  const [recordType, setRecordType] = useState<RecordType>(RecordType.COOK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Common fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Cook log fields
  const [menu, setMenu] = useState('');
  const [baseFee, setBaseFee] = useState('');
  
  // Grocery log fields
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [boughtBy, setBoughtBy] = useState<BoughtBy>(BoughtBy.STAFF);
  
  // Payment log fields
  const [amountPaid, setAmountPaid] = useState('');
  const [method, setMethod] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const body: any = {
        recordType,
        date,
        notes: notes || undefined,
      };
      
      if (recordType === RecordType.COOK) {
        body.menu = menu;
        if (baseFee) {
          body.baseFee = Number(baseFee);
        }
      } else if (recordType === RecordType.GROCERY) {
        body.category = category;
        body.amount = Number(amount);
        body.boughtBy = boughtBy;
      } else if (recordType === RecordType.PAYMENT) {
        body.amountPaid = Number(amountPaid);
        body.method = method || undefined;
        body.remarks = remarks || undefined;
      }
      
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create log');
      }
      
      // Reset form
      setMenu('');
      setBaseFee('');
      setCategory('');
      setAmount('');
      setBoughtBy(BoughtBy.STAFF);
      setAmountPaid('');
      setMethod('');
      setRemarks('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const getTypeStyles = (type: RecordType) => {
    if (recordType === type) {
      switch(type) {
        case RecordType.COOK: return 'bg-blue-100 text-blue-700 border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500';
        case RecordType.GROCERY: return 'bg-emerald-100 text-emerald-700 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500';
        case RecordType.PAYMENT: return 'bg-purple-100 text-purple-700 border-purple-500 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500';
      }
    }
    return 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]';
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Record Type Selector */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { type: RecordType.COOK, icon: ChefHat, label: 'Cook' },
            { type: RecordType.GROCERY, icon: ShoppingBag, label: 'Grocery' },
            { type: RecordType.PAYMENT, icon: CreditCard, label: 'Payment' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setRecordType(item.type)}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-lg border-2 transition-all ${getTypeStyles(item.type)}`}
            >
              <item.icon className="mb-1 w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Date - Common Field */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
          />
        </div>
        
        {/* Cook Log Fields */}
        {recordType === RecordType.COOK && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Menu <span className="text-[var(--destructive)]">*</span>
              </label>
              <input
                type="text"
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
                required
                placeholder="e.g., Dal, Rice, Vegetables"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Base Fee (Rs)
              </label>
              <input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Leave empty to use default"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
          </div>
        )}
        
        {/* Grocery Log Fields */}
        {recordType === RecordType.GROCERY && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Meat, Veggies"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Amount (Rs) <span className="text-[var(--destructive)]">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Bought By <span className="text-[var(--destructive)]">*</span>
              </label>
              <select
                value={boughtBy}
                onChange={(e) => setBoughtBy(e.target.value as BoughtBy)}
                required
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              >
                <option value={BoughtBy.STAFF}>STAFF</option>
                <option value={BoughtBy.ME}>ME</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Payment Log Fields */}
        {recordType === RecordType.PAYMENT && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Amount Paid (Rs) <span className="text-[var(--destructive)]">*</span>
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Payment Method
              </label>
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g., Cash, Esewa"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Salary Jan"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
              />
            </div>
          </div>
        )}
        
        {/* Notes - Common Field */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional additional notes"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-md text-green-700 dark:text-green-400 text-sm">
            Log entry created successfully!
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Log Entry'}
        </button>
      </form>
    </div>
  );
}
