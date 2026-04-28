'use client';

import { useEffect, useState } from 'react';
import { DashboardMetrics } from '@/types';
import { RefreshCw, TrendingUp, TrendingDown, Clock, Calendar, DollarSign, PieChart, Activity } from 'lucide-react';

interface DashboardProps {
  refreshTrigger?: number;
}

export default function Dashboard({ refreshTrigger }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchMetrics = async () => {
    try {
      setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchMetrics();
  }, [refreshTrigger]);
  
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="card-premium p-8 animate-pulse">
          <div className="h-8 bg-muted rounded-lg w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-premium p-6 animate-pulse">
              <div className="h-6 bg-muted rounded w-2/3 mb-4"></div>
              <div className="h-10 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="card-premium p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
            >
              Retry
            </button>
          </div>
        </div>
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
  
  const formatRelativeDate = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-right">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Track your food expenses and savings</p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-border text-foreground rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      
      {/* Amount Due - Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-700/80 to-orange-800/80 p-8 text-foreground shadow-md animate-scale-in border border-border">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-accent"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Required</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Amount Due to Cook</div>
          <div className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-3 tabular-nums break-all">{formatCurrency(metrics.amountDue)}</div>
          <div className="text-sm text-muted-foreground">Outstanding balance for cook services</div>
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Effective Daily Cost */}
        <div className="card-premium p-6 group animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/20 flex items-center justify-center text-secondary">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Day</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tabular-nums">{formatCurrency(metrics.effectiveDailyCost)}</div>
          <div className="text-sm text-muted-foreground mb-4">Effective Daily Cost</div>
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cook</span>
              <span className="font-semibold text-foreground">{formatCurrency(metrics.avgCookCostPerDay)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Groceries</span>
              <span className="font-semibold text-foreground">{formatCurrency(metrics.avgGroceriesCostPerDay)}</span>
            </div>
          </div>
        </div>
        
        {/* Monthly Savings */}
        <div className="card-premium p-6 group animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center ${
              metrics.savings.monthly >= 0
                ? 'bg-primary/20 text-primary'
                : 'bg-destructive/20 text-destructive'
            }`}>
              {metrics.savings.monthly >= 0 ? (
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month</div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mb-2 tabular-nums ${
            metrics.savings.monthly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(metrics.savings.monthly)}
          </div>
          <div className="text-sm text-muted-foreground">
            {metrics.savings.monthly >= 0 ? 'Savings vs baseline' : 'Over baseline spending'}
          </div>
        </div>
        
        {/* Total Food Spend */}
        <div className="card-premium p-6 group animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 flex items-center justify-center text-accent">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tabular-nums">{formatCurrency(metrics.totalFoodSpend.thisMonth)}</div>
          <div className="text-sm text-muted-foreground mb-4">This Month's Spend</div>
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">All Time</span>
              <span className="font-semibold text-foreground">{formatCurrency(metrics.totalFoodSpend.allTime)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cook Schedule */}
      {(metrics.lastCookTime || metrics.nextCookTime) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.lastCookTime && (
            <div className="card-premium p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 flex items-center justify-center text-accent">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Last Cooked</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeDate(metrics.lastCookTime)}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {new Date(metrics.lastCookTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          )}
          
          {metrics.nextCookTime && (
            <div className="card-premium p-6 animate-slide-up" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary/20 flex items-center justify-center text-secondary">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Next Cook</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeDate(metrics.nextCookTime)}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {new Date(metrics.nextCookTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Monthly Trends */}
      {metrics.monthlyBreakdown && metrics.monthlyBreakdown.length > 0 && (
        <div className="card-premium p-6 lg:p-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Monthly Trends</h2>
              <p className="text-sm text-muted-foreground">Historical spending breakdown</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {metrics.monthlyBreakdown.map((monthData, index) => {
              const maxSpend = Math.max(...metrics.monthlyBreakdown.map(m => m.totalSpend));
              const percentage = (monthData.totalSpend / maxSpend) * 100;
              
              return (
                <div key={`${monthData.year}-${monthData.monthName}`} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground min-w-[100px]">{monthData.month}</span>
                      <span className="text-xs text-muted-foreground">
                        {monthData.cookCount} cooks • {monthData.groceryCount} groceries
                      </span>
                    </div>
                    <span className="text-base font-bold text-foreground">{formatCurrency(monthData.totalSpend)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t-2 border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground">Average per Month</span>
                <span className="text-lg font-bold text-primary">
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
      
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="card-premium p-4 text-center">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 tabular-nums">{metrics.stats.totalCookSessions}</div>
          <div className="text-xs text-muted-foreground">Cook Sessions</div>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 tabular-nums">{metrics.stats.totalGroceries}</div>
          <div className="text-xs text-muted-foreground">Grocery Logs</div>
        </div>
        <div className="card-premium p-4 text-center">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 tabular-nums">{metrics.stats.totalPayments}</div>
          <div className="text-xs text-muted-foreground">Payments</div>
        </div>
      </div>
    </div>
  );
}
