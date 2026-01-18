import { AnimatePresence } from 'framer-motion';
import { usePulse } from '../hooks/usePulse';
import ProphecyCard from './ProphecyCard';

/**
 * Pulse Feed Component - Real-time "Architectural Heartbeat" feed
 * Displays a scrolling feed of Prophecy cards from the Oracle
 */
export default function Pulse() {
  const { prophecies, loading, error, acknowledgeProphecy } = usePulse();

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-vibeguard-primary to-vibeguard-violet bg-clip-text text-transparent font-sans">
          The Pulse
        </h1>
        <p className="text-sm text-vibeguard-textMuted">
          Real-time Architectural Heartbeat • {prophecies.length} active prophecy{prophecies.length !== 1 ? 'ies' : ''}
        </p>
      </div>

      {/* Scrolling Feed Container */}
      <div className="relative">
        <div className="overflow-y-auto max-h-[calc(100vh-12rem)] pr-2">
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-glassBorder rounded-lg">
              <div className="text-center">
                <p className="text-vibeguard-textMuted">Loading prophecies...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-error/30 rounded-lg shadow-glow-error">
              <div className="text-center">
                <p className="text-vibeguard-error mb-2">Error loading prophecies</p>
                <p className="text-sm text-vibeguard-errorLight">{error}</p>
              </div>
            </div>
          ) : prophecies.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-glassBorder rounded-lg">
              <div className="text-center">
                <p className="text-vibeguard-textMuted mb-2">No prophecies detected</p>
                <p className="text-sm text-vibeguard-textMuted/70">
                  The Oracle will surface insights as architectural drift is detected
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {prophecies.map((prophecy) => (
                <ProphecyCard
                  key={prophecy.id}
                  prophecy={prophecy}
                  onAcknowledge={acknowledgeProphecy}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

