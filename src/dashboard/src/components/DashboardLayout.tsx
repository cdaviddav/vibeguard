import { ReactNode } from 'react';
import { Brain, Map, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import vibeguardLogo from '../assets/images/vibeguard-shield-logo.png';

type View = 'soul' | 'map' | 'pulse';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function DashboardLayout({ children, currentView, onViewChange }: DashboardLayoutProps) {
  const navItems = [
    { id: 'soul' as View, label: 'The Soul', icon: Brain, description: 'Project Memory' },
    { id: 'map' as View, label: 'The Map', icon: Map, description: 'Architecture' },
    { id: 'pulse' as View, label: 'The Pulse', icon: Activity, description: 'Oracle Feed' },
  ];

  return (
    <div className="min-h-screen bg-vg-bg relative overflow-hidden">
      {/* Ambient gradient background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-white/[0.02] backdrop-blur-2xl border-r border-white/[0.06] z-50">
        {/* Logo Section */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src={vibeguardLogo} 
                alt="VibeGuard Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-semibold text-vg-text tracking-tight">
                VibeGuard
              </h1>
              <p className="text-[10px] text-vg-textMuted uppercase tracking-widest">
                The Librarian
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-3 mt-2">
          <p className="px-3 mb-2 text-[10px] font-medium text-vg-textDim uppercase tracking-widest">
            Views
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-md transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/[0.06] text-vg-text'
                    : 'text-vg-textSecondary hover:text-vg-text hover:bg-white/[0.03]'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-vg-indigo to-vg-violet rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                <Icon 
                  size={16} 
                  className={`transition-colors duration-200 ${
                    isActive 
                      ? 'text-vg-indigo' 
                      : 'text-vg-textMuted group-hover:text-vg-indigoLight'
                  }`}
                />
                <div className="flex flex-col items-start">
                  <span className="text-[13px] font-medium">{item.label}</span>
                  <span className="text-[10px] text-vg-textDim">{item.description}</span>
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Status indicator at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-vg-success" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-vg-success animate-ping opacity-75" />
            </div>
            <span className="text-[11px] text-vg-textMuted">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 min-h-screen relative z-10">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
