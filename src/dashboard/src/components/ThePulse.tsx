import { useEffect, useState } from 'react';
import { Activity, Radio, Zap, DollarSign, TrendingDown, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import Pulse from './Pulse';

interface TokenSummary {
  totalSpend: number;
  totalTokens: number;
  totalSavings: number;
  breakdownByFeature: Record<string, {
    spend: number;
    tokens: number;
    savings: number;
  }>;
}

interface DailyBreakdown {
  date: string;
  cost: number;
  savings: number;
}

export default function ThePulse() {
  const [status, setStatus] = useState<'active' | 'idle' | null>(null);
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/status')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch status: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          const newStatus = data.status || 'idle';
          setStatus((prevStatus) => {
            if (prevStatus !== newStatus) {
              return newStatus;
            }
            return prevStatus;
          });
        })
        .catch((err) => {
          console.error('Error fetching status:', err);
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTokenUsage = () => {
      fetch('/api/token-usage')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch token usage: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setTokenSummary(data.summary);
          setDailyBreakdown(data.dailyBreakdown || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching token usage:', err);
          setLoading(false);
        });
    };

    fetchTokenUsage();
    const interval = setInterval(fetchTokenUsage, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Calculate max cost for chart scaling
  const maxDailyCost = dailyBreakdown.length > 0
    ? Math.max(...dailyBreakdown.map(d => d.cost), 0.01)
    : 0.01;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-vg-indigo" />
          <h1 className="text-xl font-semibold text-gradient">The Pulse</h1>
        </div>
        <p className="text-xs text-vg-textMuted ml-8">
          Real-time Oracle insights • Architectural heartbeat
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Watcher Status - Compact card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-4 bento-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <Radio className="w-4 h-4 text-vg-violet" />
            <h2 className="text-sm font-medium text-vg-text">Watcher Status</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                  status === 'active' 
                    ? 'bg-vg-successMuted' 
                    : 'bg-white/[0.05]'
                }`}>
                  <Zap className={`w-5 h-5 ${
                    status === 'active' ? 'text-vg-success' : 'text-vg-textMuted'
                  }`} />
                </div>
                {status === 'active' && (
                  <div className="absolute inset-0 rounded-md bg-vg-success/20 animate-ping" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-vg-text capitalize">
                  {status || 'Checking...'}
                </p>
                <p className="text-[10px] text-vg-textMuted">
                  {status === 'active' ? 'Monitoring changes' : 'Watcher inactive'}
                </p>
              </div>
            </div>
            
            {/* Status indicator dot */}
            <div className={`w-2.5 h-2.5 rounded-full ${
              status === 'active' 
                ? 'bg-vg-success shadow-glow-success' 
                : 'bg-vg-textDim'
            }`} />
          </div>
        </motion.div>

        {/* Token Analytics - Real metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-12 lg:col-span-8 bento-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <Layers className="w-4 h-4 text-vg-indigo" />
            <h2 className="text-sm font-medium text-vg-text">Token Analytics</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-vg-textMuted">Loading...</p>
            </div>
          ) : tokenSummary ? (
            <div className="space-y-4">
              {/* Metric Cards */}
              <div className="grid grid-cols-4 gap-3">
                {/* Total Spend */}
                <div className="bg-white/[0.03] rounded-lg p-3 border border-vg-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3 h-3 text-vg-textMuted" />
                    <span className="text-[10px] text-vg-textMuted">Total Spend</span>
                  </div>
                  <p className="text-lg font-semibold text-vg-text">
                    {formatCurrency(tokenSummary.totalSpend)}
                  </p>
                </div>

                {/* Total Saved (VibeGuard ROI) */}
                <div className="bg-white/[0.03] rounded-lg p-3 border border-vg-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-3 h-3 text-vg-success" />
                    <span className="text-[10px] text-vg-textMuted">Total Saved</span>
                  </div>
                  <p className="text-lg font-semibold text-vg-success">
                    {formatCurrency(tokenSummary.totalSavings)}
                  </p>
                  <p className="text-[9px] text-vg-textDim mt-1">VibeGuard ROI</p>
                </div>

                {/* Token Efficiency */}
                <div className="bg-white/[0.03] rounded-lg p-3 border border-vg-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3 h-3 text-vg-indigo" />
                    <span className="text-[10px] text-vg-textMuted">Efficiency</span>
                  </div>
                  <p className="text-lg font-semibold text-vg-indigo">
                    {(() => {
                      const totalHighIqCost = tokenSummary.totalSpend + tokenSummary.totalSavings;
                      if (totalHighIqCost > 0) {
                        return `${Math.round((tokenSummary.totalSavings / totalHighIqCost) * 100)}%`;
                      }
                      return '0%';
                    })()}
                  </p>
                  <p className="text-[9px] text-vg-textDim mt-1">vs High-IQ</p>
                </div>

                {/* Total Tokens */}
                <div className="bg-white/[0.03] rounded-lg p-3 border border-vg-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-3 h-3 text-vg-textMuted" />
                    <span className="text-[10px] text-vg-textMuted">Total Tokens</span>
                  </div>
                  <p className="text-lg font-semibold text-vg-text">
                    {formatNumber(tokenSummary.totalTokens)}
                  </p>
                </div>
              </div>

              {/* Daily Cost Chart */}
              {dailyBreakdown.length > 0 && (
                <div>
                  <p className="text-[10px] text-vg-textMuted mb-2">Cost per Day (Last 7 Days)</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {dailyBreakdown.map((day, i) => {
                      const height = (day.cost / maxDailyCost) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-gradient-to-t from-vg-indigo/50 to-vg-violet/30 rounded-sm transition-all duration-300"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          <p className="text-[9px] text-vg-textDim mt-1">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dailyBreakdown.length === 0 && (
                <div className="flex items-center justify-center h-20">
                  <p className="text-[10px] text-vg-textDim">No usage data available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-vg-textMuted">No token usage data</p>
            </div>
          )}
        </motion.div>

        {/* Feature Breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 bento-card"
        >
          <h2 className="text-sm font-medium text-vg-text mb-4">Breakdown by Feature</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-vg-textMuted">Loading...</p>
            </div>
          ) : tokenSummary ? (
            <div className="space-y-3">
              {Object.entries(tokenSummary.breakdownByFeature).map(([feature, data]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="text-xs text-vg-textMuted">{feature}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-vg-text">
                      {formatCurrency(data.spend)}
                    </span>
                    {data.savings > 0 && (
                      <span className="text-[10px] text-vg-success">
                        Saved {formatCurrency(data.savings)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-vg-textMuted">No data</p>
            </div>
          )}
        </motion.div>

        {/* Oracle Pulse Feed - Main card with glow effect */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-12"
        >
          <div className={`bento-card oracle-glow-active border-vg-indigo/20 ${
            status === 'active' ? 'oracle-glow' : ''
          }`}>
            <Pulse />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
