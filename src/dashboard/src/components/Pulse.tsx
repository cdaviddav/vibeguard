import { AnimatePresence } from 'framer-motion';
import { usePulse } from '../hooks/usePulse';
import ProphecyCard from './ProphecyCard';
import { Activity, Loader2, Inbox } from 'lucide-react';

/**
 * Pulse Feed Component - Real-time "Architectural Heartbeat" feed
 * Displays a scrolling feed of Prophecy cards from the Oracle
 */
export default function Pulse() {
  const { prophecies, loading, error, acknowledgeProphecy } = usePulse();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-vg-indigo" />
          <h2 className="text-sm font-medium text-vg-text">Oracle Feed</h2>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.05] text-vg-textMuted font-mono">
          {prophecies.length} active
        </span>
      </div>

      {/* Feed Container */}
      <div className="relative">
        <div className="overflow-y-auto max-h-[600px] pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-md">
              <Loader2 className="w-5 h-5 text-vg-indigo animate-spin mb-2" />
              <p className="text-xs text-vg-textMuted">Loading prophecies...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 bg-vg-errorMuted border border-vg-error/20 rounded-md">
              <p className="text-xs text-vg-error mb-1">Error loading prophecies</p>
              <p className="text-[10px] text-vg-textMuted">{error}</p>
            </div>
          ) : prophecies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-md">
              <Inbox className="w-6 h-6 text-vg-textDim mb-2" />
              <p className="text-xs text-vg-textMuted mb-1">No prophecies detected</p>
              <p className="text-[10px] text-vg-textDim text-center max-w-[200px]">
                The Oracle will surface insights as architectural drift is detected
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {prophecies.map((prophecy) => (
                  <ProphecyCard
                    key={prophecy.id}
                    prophecy={prophecy}
                    onAcknowledge={acknowledgeProphecy}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Fade gradient at bottom when scrollable */}
        {prophecies.length > 3 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-vg-bg to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
