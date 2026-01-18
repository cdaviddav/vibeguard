import { motion } from 'framer-motion';
import { AlertTriangle, Hammer, Zap, Sparkles, X, Loader2 } from 'lucide-react';
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
        // Show success message and acknowledge the prophecy
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
          borderColor: 'border-yellow-500/50',
          glowColor: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
          iconColor: 'text-yellow-500',
        };
      case 'Refactor':
        return {
          icon: Hammer,
          borderColor: 'border-purple-500/50',
          glowColor: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
          iconColor: 'text-purple-500',
        };
      case 'Optimization':
        return {
          icon: Zap,
          borderColor: 'border-emerald-500/50',
          glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          iconColor: 'text-emerald-500',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const handleAcknowledge = () => {
    onAcknowledge(prophecy.id);
  };

  // Format timestamp for display
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
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 0.8,
        filter: 'blur(8px)',
        transition: { duration: 0.3 }
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative bg-slate-950/50 backdrop-blur-md border ${config.borderColor} ${config.glowColor} rounded-lg p-5 mb-4 transition-all hover:bg-slate-950/70`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <h3 className="text-lg font-semibold text-cyber-text font-mono">
            {prophecy.title}
          </h3>
        </div>
        <button
          onClick={handleAcknowledge}
          className="p-1 rounded hover:bg-cyber-border/50 transition-colors group"
          aria-label="Acknowledge prophecy"
        >
          <X className="w-4 h-4 text-cyber-textMuted group-hover:text-cyber-text" />
        </button>
      </div>

      {/* Body: Description */}
      <div className="mb-4">
        <p className="text-sm text-cyber-textMuted leading-relaxed">
          {prophecy.description}
        </p>
      </div>

      {/* Suggested Action */}
      <div className="mt-4 pt-4 border-t border-cyber-border/30">
        <div className="flex items-start gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-cyber-accent mt-0.5" />
          <span className="text-xs font-semibold text-cyber-accent uppercase tracking-wider">
            Suggested Action
          </span>
        </div>
        <code className="block text-xs text-cyber-textSecondary bg-cyber-bg/50 px-3 py-2 rounded border border-cyber-border/30 font-mono whitespace-pre-wrap break-words">
          {prophecy.suggestedAction}
        </code>
      </div>

      {/* Footer: Timestamp */}
      <div className="mt-3 pt-3 border-t border-cyber-border/20">
        <span className="text-xs text-cyber-textMuted/70">
          {formatTimestamp(prophecy.timestamp)}
        </span>
      </div>

      {/* Error Message */}
      {fixError && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/50 rounded text-xs text-red-400">
          {fixError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-cyber-border/30">
        <motion.button
          whileHover={isFixing ? {} : { scale: 1.02 }}
          whileTap={isFixing ? {} : { scale: 0.98 }}
          disabled={isFixing}
          className="flex-1 bg-cyber-accent text-cyber-bg px-4 py-2 rounded font-semibold text-sm hover:bg-cyber-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          onClick={handleFixWithAI}
        >
          {isFixing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fixing...</span>
            </>
          ) : (
            'Fix with AI'
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 rounded font-semibold text-sm border border-cyber-border text-cyber-textMuted hover:border-cyber-accent hover:text-cyber-accent transition-colors"
          onClick={handleAcknowledge}
        >
          Acknowledge
        </motion.button>
      </div>
    </motion.div>
  );
}

