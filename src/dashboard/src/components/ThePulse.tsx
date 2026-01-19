import { useEffect, useState } from 'react';
import { Activity, Radio, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Pulse from './Pulse';

export default function ThePulse() {
  const [status, setStatus] = useState<'active' | 'idle' | null>(null);

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

        {/* Token Analytics - Placeholder card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-12 lg:col-span-4 bento-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-vg-text">Token Analytics</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-vg-indigoLight/10 text-vg-indigoLight font-medium">
              Coming Soon
            </span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {/* Mini bar chart placeholder */}
            {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
              <div 
                key={i}
                className="flex-1 bg-gradient-to-t from-vg-indigo/30 to-vg-violet/10 rounded-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <p className="text-[10px] text-vg-textDim mt-3">
            Token usage visualization
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 bento-card"
        >
          <h2 className="text-sm font-medium text-vg-text mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-vg-textMuted">Active Prophecies</span>
              <span className="text-sm font-mono text-vg-text">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vg-textMuted">Last Analysis</span>
              <span className="text-sm font-mono text-vg-textSecondary">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-vg-textMuted">Drift Score</span>
              <span className="text-sm font-mono text-vg-success">Healthy</span>
            </div>
          </div>
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
