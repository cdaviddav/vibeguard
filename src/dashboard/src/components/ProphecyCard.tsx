import { motion } from 'framer-motion';
import { AlertTriangle, Hammer, Zap, Sparkles, X, Loader2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Prophecy } from '../hooks/usePulse';

interface ProphecyCardProps {
  prophecy: Prophecy;
  onAcknowledge: (id: string) => void;
}

export default function ProphecyCard({ prophecy, onAcknowledge }: ProphecyCardProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const handleFixWithAI = async () => {
    setIsFixing(true);
    setFixError(null);

    try {
      const response = await fetch('/api/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: prophecy.id }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Fix applied successfully!\n\nBranch created: ${data.branchName}\nFiles changed: ${data.filesChanged?.length || 0}\n\nYou can now review the changes and merge the branch.`);
        onAcknowledge(prophecy.id);
      } else {
        setFixError(data.error || 'Failed to apply fix');
      }
    } catch (error: any) {
      setFixError(error.message || 'Failed to apply fix. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  const getTypeConfig = () => {
    switch (prophecy.type) {
      case 'RuleViolation':
        return {
          icon: AlertTriangle,
          accentColor: 'vg-warning',
          bgMuted: 'bg-vg-warningMuted',
          borderColor: 'border-vg-warning/20',
          glowClass: 'shadow-glow-warning',
          label: 'Rule Violation',
        };
      case 'Refactor':
        return {
          icon: Hammer,
          accentColor: 'vg-violet',
          bgMuted: 'bg-vg-violet/10',
          borderColor: 'border-vg-violet/20',
          glowClass: 'shadow-glow-violet',
          label: 'Refactor',
        };
      case 'Optimization':
        return {
          icon: Zap,
          accentColor: 'vg-success',
          bgMuted: 'bg-vg-successMuted',
          borderColor: 'border-vg-success/20',
          glowClass: 'shadow-glow-success',
          label: 'Optimization',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 0.95,
        filter: 'blur(4px)',
        transition: { duration: 0.2 }
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative bg-white/[0.02] backdrop-blur-xl border ${config.borderColor} rounded-md p-4 transition-all duration-200 hover:bg-white/[0.04] group h-full flex flex-col`}
    >
      {/* Type indicator line */}
      <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full bg-${config.accentColor}`} />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3 pl-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-md ${config.bgMuted} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 text-${config.accentColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-medium uppercase tracking-wider text-${config.accentColor}`}>
                {config.label}
              </span>
              <span className="text-[10px] text-vg-textDim">
                {formatTimestamp(prophecy.timestamp)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-vg-text leading-snug">
              {prophecy.title}
            </h3>
          </div>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={() => onAcknowledge(prophecy.id)}
          className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-vg-textMuted" />
        </button>
      </div>

      {/* Description */}
      <div className="pl-3 mb-4">
        <p className="text-xs text-vg-textSecondary leading-relaxed">
          {prophecy.description}
        </p>
      </div>

      {/* Suggested Action */}
      <div className="pl-3 mb-4 flex-grow">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-vg-indigo" />
          <span className="text-[10px] font-medium text-vg-indigo uppercase tracking-wider">
            Suggested Action
          </span>
        </div>
        <code className="block text-[11px] text-vg-cyan bg-black/30 px-3 py-2 rounded-md border border-white/[0.04] font-mono leading-relaxed whitespace-pre-wrap break-words">
          {prophecy.suggestedAction}
        </code>
      </div>

      {/* Error Message */}
      {fixError && (
        <div className="pl-3 mb-3">
          <div className="p-2 bg-vg-errorMuted border border-vg-error/20 rounded-md text-[11px] text-vg-error">
            {fixError}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pl-3 pt-3 border-t border-white/[0.04] mt-auto">
        <motion.button
          whileHover={isFixing ? {} : { scale: 1.01 }}
          whileTap={isFixing ? {} : { scale: 0.99 }}
          disabled={isFixing}
          onClick={handleFixWithAI}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-vg-indigo to-vg-violet text-white px-3 py-2 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-oracle"
        >
          {isFixing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Applying Fix...</span>
            </>
          ) : (
            <>
              <span>Fix with AI</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onAcknowledge(prophecy.id)}
          className="px-3 py-2 rounded-md text-xs font-medium border border-white/[0.08] text-vg-textSecondary hover:border-white/[0.15] hover:text-vg-text transition-all"
        >
          Acknowledge
        </motion.button>
      </div>
    </motion.div>
  );
}
