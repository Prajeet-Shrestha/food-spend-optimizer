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
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 sm:py-16 text-black dark:text-zinc-50">
          <div className="text-lg sm:text-xl font-medium mb-2">Loading dashboard...</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Please wait</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="p-4 sm:p-5 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-400 mb-4">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm sm:text-base">{error}</div>
        </div>
        <button
          onClick={fetchMetrics}
          className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-zinc-50 text-white dark:text-black rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium text-sm sm:text-base"
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
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black dark:text-zinc-50 mb-1">
          Food Spend Dashboard
        </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
              Track your food expenses and savings
            </p>
          </div>
        <button
          onClick={fetchMetrics}
            className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-black dark:text-zinc-50 rounded-lg transition-colors text-sm font-medium w-full sm:w-auto border border-zinc-300 dark:border-zinc-700"
        >
            Refresh Data
        </button>
        </div>
      </div>
      
      {/* PRIMARY ACTION ZONE - Most Important */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl shadow-lg p-6 sm:p-8 lg:p-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-300 uppercase tracking-wide">
            Action Required
          </span>
        </div>
        <div className="text-sm sm:text-base font-medium text-yellow-800 dark:text-yellow-300 mb-3">
            Amount Due to Cook
          </div>
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
            {formatCurrency(metrics.amountDue)}
          </div>
        <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 mt-2">
          Outstanding balance for cook services
        </div>
        </div>
        
      {/* TIME CONTEXT ZONE - Temporal Information */}
      {(metrics.lastCookTime || metrics.nextCookTime) && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Cook Schedule
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Track your cooking timeline
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Last Cook Time */}
            {metrics.lastCookTime && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-300">
                    Last Cooked
                  </span>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-900 dark:text-orange-200 mb-2">
                  {new Date(metrics.lastCookTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const lastCook = new Date(metrics.lastCookTime!);
                    lastCook.setHours(0, 0, 0, 0);
                    const diffTime = today.getTime() - lastCook.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) {
                      return 'Today';
                    } else if (diffDays === 1) {
                      return 'Yesterday';
                    } else {
                      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                    }
                  })()}
                </div>
              </div>
            )}
            
            {/* Next Cook Time */}
            {metrics.nextCookTime && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-lg p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-purple-800 dark:text-purple-300">
                    Next Cook
                  </span>
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-200 mb-2">
                  {new Date(metrics.nextCookTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextCook = new Date(metrics.nextCookTime!);
                    nextCook.setHours(0, 0, 0, 0);
                    const diffTime = nextCook.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
                    } else if (diffDays === 0) {
                      return 'Today';
                    } else {
                      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERFORMANCE METRICS ZONE - Key Performance Indicators */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Performance Metrics
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Key indicators of your food spending efficiency
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Effective Daily Cost */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">
                Effective Cost per Day
              </span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-900 dark:text-blue-200 mb-3">
            {formatCurrency(metrics.effectiveDailyCost)}
          </div>
            <div className="space-y-2 pt-3 border-t border-blue-200 dark:border-blue-800">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-blue-700 dark:text-blue-300">Cook:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {formatCurrency(metrics.avgCookCostPerDay)}/day
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-blue-700 dark:text-blue-300">Groceries:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {formatCurrency(metrics.avgGroceriesCostPerDay)}/day
                </span>
              </div>
            </div>
        </div>
        
        {/* Monthly Savings */}
          <div className={`border rounded-lg p-5 sm:p-6 ${
            metrics.savings.monthly >= 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <svg className={`w-4 h-4 ${
                metrics.savings.monthly >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className={`text-xs sm:text-sm font-medium ${
            metrics.savings.monthly >= 0
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
          }`}>
                Monthly Savings
              </span>
          </div>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
            metrics.savings.monthly >= 0
              ? 'text-green-900 dark:text-green-200'
              : 'text-red-900 dark:text-red-200'
          }`}>
            {formatCurrency(metrics.savings.monthly)}
            </div>
            <div className={`text-xs sm:text-sm ${
              metrics.savings.monthly >= 0
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }`}>
              {metrics.savings.monthly >= 0 ? 'Savings vs baseline' : 'Over baseline spending'}
            </div>
          </div>
        </div>
      </div>
      
      {/* FINANCIAL OVERVIEW ZONE - Supporting Financial Context */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Financial Overview
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Total spending and baseline comparisons
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Total Food Spend */}
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-5 sm:p-6">
            <div className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Total Food Spend
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">This Month</span>
                <span className="text-lg sm:text-xl font-bold text-black dark:text-zinc-50">
                {formatCurrency(metrics.totalFoodSpend.thisMonth)}
              </span>
            </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">All Time</span>
                <span className="text-lg sm:text-xl font-bold text-black dark:text-zinc-50">
                {formatCurrency(metrics.totalFoodSpend.allTime)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Baseline Comparison */}
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-5 sm:p-6">
            <div className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Baseline Cost (Rs 360-400/day)
          </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Low</span>
                <span className="text-lg sm:text-xl font-bold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.low)}
              </span>
            </div>
              <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">High</span>
                <span className="text-lg sm:text-xl font-bold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.high)}
              </span>
            </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Average</span>
                <span className="text-lg sm:text-xl font-bold text-black dark:text-zinc-50">
                {formatCurrency(metrics.baselineCost.avg)}
              </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TREND ANALYSIS ZONE - Historical Trends */}
      {metrics.monthlyBreakdown && metrics.monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Monthly Trends
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Historical spending breakdown by month
            </p>
          </div>
          <div className="space-y-4 sm:space-y-5">
            {metrics.monthlyBreakdown.map((monthData) => {
              const maxSpend = Math.max(...metrics.monthlyBreakdown.map(m => m.totalSpend));
              const percentage = (monthData.totalSpend / maxSpend) * 100;
              
              return (
                <div key={`${monthData.year}-${monthData.monthName}`} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 min-w-[100px]">
                        {monthData.month}
                      </span>
                      <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                        {monthData.cookCount} cooks • {monthData.groceryCount} groceries
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(monthData.totalSpend)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Average */}
            <div className="pt-4 sm:pt-5 border-t-2 border-zinc-300 dark:border-zinc-600">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300">
                  Average per Month
                </span>
                <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
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

      {/* DETAILED METRICS ZONE - Savings Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Savings Analysis
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Detailed savings breakdown across different metrics
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Daily', value: metrics.savings.daily },
            { label: 'Monthly', value: metrics.savings.monthly },
            { label: 'vs Low Baseline', value: metrics.savings.vsLow },
            { label: 'vs High Baseline', value: metrics.savings.vsHigh },
          ].map((item) => (
            <div key={item.label} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 sm:p-5 border border-zinc-200 dark:border-zinc-700">
              <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                {item.label}
            </div>
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                item.value >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
                {formatCurrency(item.value)}
          </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* REFERENCE ZONE - Supporting Information */}
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-zinc-200 dark:border-zinc-700">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Statistics & Tracking
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
          {[
            { label: 'Cook Sessions', value: metrics.stats.totalCookSessions },
            { label: 'Grocery Logs', value: metrics.stats.totalGroceries },
            { label: 'Payments', value: metrics.stats.totalPayments },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-zinc-900 rounded-lg p-3 sm:p-4 text-center border border-zinc-200 dark:border-zinc-700">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-zinc-50 mb-1">
                {stat.value}
            </div>
              <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                {stat.label}
          </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-zinc-300 dark:border-zinc-700 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
          <span className="font-medium">Tracking Period:</span>{' '}
          {new Date(metrics.trackingWindow.startDate).toLocaleDateString()} - {new Date(metrics.trackingWindow.endDate).toLocaleDateString()}{' '}
          <span className="text-zinc-500 dark:text-zinc-500">({metrics.trackingWindow.days} days)</span>
        </div>
      </div>
    </div>
  );
}
