'use client';

import { useState, FormEvent } from 'react';
import { RecordType, BoughtBy } from '@/types';

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
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-black dark:text-zinc-50">
        Add New Log Entry
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Record Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
            Record Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {Object.values(RecordType).map((type) => (
              <label
                key={type}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="recordType"
                  value={type}
                  checked={recordType === type}
                  onChange={(e) => setRecordType(e.target.value as RecordType)}
                  className="mr-2"
                />
                <span className="text-black dark:text-zinc-50">{type}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Date - Common Field */}
        <div>
          <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
          />
        </div>
        
        {/* Cook Log Fields */}
        {recordType === RecordType.COOK && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Menu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
                required
                placeholder="e.g., Dal, Rice, Vegetables"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Base Fee (Rs)
              </label>
              <input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Leave empty to use default"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
          </>
        )}
        
        {/* Grocery Log Fields */}
        {recordType === RecordType.GROCERY && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Meat, Veggies, Saag"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Amount (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Bought By <span className="text-red-500">*</span>
              </label>
              <select
                value={boughtBy}
                onChange={(e) => setBoughtBy(e.target.value as BoughtBy)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              >
                <option value={BoughtBy.STAFF}>STAFF</option>
                <option value={BoughtBy.ME}>ME</option>
              </select>
            </div>
          </>
        )}
        
        {/* Payment Log Fields */}
        {recordType === RecordType.PAYMENT && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Amount Paid (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Payment Method
              </label>
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g., Cash, Bank Transfer"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
                Remarks <span className="text-yellow-600 dark:text-yellow-400">(Recommended)</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., Payment for Jan 1-15 period"
                className="w-full px-3 py-2 border-2 border-yellow-300 dark:border-yellow-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:border-yellow-500 dark:focus:border-yellow-600"
              />
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                Adding remarks helps track payment periods and purposes
              </p>
            </div>
          </>
        )}
        
        {/* Notes - Common Field */}
        <div>
          <label className="block text-sm font-medium mb-2 text-black dark:text-zinc-50">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional additional notes"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        
        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-md text-green-700 dark:text-green-400">
            Log entry created successfully!
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Log Entry'}
        </button>
      </form>
    </div>
  );
}

