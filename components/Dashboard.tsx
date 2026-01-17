'use client';

import { useEffect, useState } from 'react';
import { DashboardMetrics } from '@/types';

interface DashboardProps {
  refreshTrigger?: number;
}

export default function Dashboard({ refreshTrigger }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard metrics');
      }
      
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMetrics();
  }, [refreshTrigger]);
  
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-black dark:text-zinc-50">
          Loading dashboard...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400">
          Error: {error}
        </div>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!metrics) {
    return null;
  }
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'Rs 0.00';
    }
    return `Rs ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
          Food Spend Dashboard
        </h1>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Amount Due - Highlighted */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
            Amount Due to Cook
          </div>
          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
            {formatCurrency(metrics.amountDue)}
          </div>
        </div>
        
        {/* Effective Daily Cost */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
            Effective Cost per Day
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            (Cook + Groceries)
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
            {formatCurrency(metrics.effectiveDailyCost)}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1">
            <div>Cook: {formatCurrency(metrics.avgCookCostPerDay)}/day</div>
            <div>Groceries: {formatCurrency(metrics.avgGroceriesCostPerDay)}/day</div>
          </div>
        </div>
        
        {/* Monthly Savings */}
        <div className={`border rounded-lg p-4 ${
          metrics.savings.monthly >= 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
            : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
        }`}>
          <div className={`text-sm font-medium mb-1 ${
            metrics.savings.monthly >= 0
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
          }`}>
            Monthly Savings Projection
          </div>
          <div className={`text-2xl font-bold ${
            metrics.savings.monthly >= 0
              ? 'text-green-900 dark:text-green-200'
              : 'text-red-900 dark:text-red-200'
          }`}>
            {formatCurrency(metrics.savings.monthly)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Total Food Spend */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Total Food Spend
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">This Month:</span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {formatCurrency(metrics.totalFoodSpend.thisMonth)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">All Time:</span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {formatCurrency(metrics.totalFoodSpend.allTime)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Baseline Comparison */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Baseline Cost (Rs 360-400/day)
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Low:</span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.low)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">High:</span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.high)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Avg:</span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.avg)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Monthly Spend Breakdown */}
      {metrics.monthlyBreakdown && metrics.monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-6 mb-6">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Monthly Food Spend
          </div>
          <div className="space-y-3">
            {metrics.monthlyBreakdown.map((monthData, index) => {
              const maxSpend = Math.max(...metrics.monthlyBreakdown.map(m => m.totalSpend));
              const percentage = (monthData.totalSpend / maxSpend) * 100;
              
              return (
                <div key={`${monthData.year}-${monthData.monthName}`} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[80px]">
                        {monthData.month}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ({monthData.cookCount} cooks, {monthData.groceryCount} groceries)
                      </span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(monthData.totalSpend)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Average */}
            <div className="pt-3 border-t border-zinc-300 dark:border-zinc-600">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Average per Month:
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(
                    metrics.monthlyBreakdown.reduce((sum, m) => sum + m.totalSpend, 0) / 
                    metrics.monthlyBreakdown.length
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Savings Details */}
      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Savings Breakdown
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Daily</div>
            <div className={`text-lg font-semibold ${
              metrics.savings.daily >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(metrics.savings.daily)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Monthly</div>
            <div className={`text-lg font-semibold ${
              metrics.savings.monthly >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(metrics.savings.monthly)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">vs Low</div>
            <div className={`text-lg font-semibold ${
              metrics.savings.vsLow >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(metrics.savings.vsLow)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">vs High</div>
            <div className={`text-lg font-semibold ${
              metrics.savings.vsHigh >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(metrics.savings.vsHigh)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Statistics
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-black dark:text-zinc-50">
              {metrics.stats.totalCookSessions}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Cook Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black dark:text-zinc-50">
              {metrics.stats.totalGroceries}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Grocery Logs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black dark:text-zinc-50">
              {metrics.stats.totalPayments}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Payments</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
          Tracking Period: {new Date(metrics.trackingWindow.startDate).toLocaleDateString()} - {new Date(metrics.trackingWindow.endDate).toLocaleDateString()} ({metrics.trackingWindow.days} days)
        </div>
      </div>
    </div>
  );
}

