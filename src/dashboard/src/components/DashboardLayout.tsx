import { ReactNode } from 'react';
import { Brain, Map, Activity } from 'lucide-react';

type View = 'soul' | 'map' | 'pulse';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function DashboardLayout({ children, currentView, onViewChange }: DashboardLayoutProps) {
  const navItems = [
    { id: 'soul' as View, label: 'The Soul', icon: Brain },
    { id: 'map' as View, label: 'The Map', icon: Map },
    { id: 'pulse' as View, label: 'The Pulse', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-vibeguard-bg text-vibeguard-text">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-vibeguard-glass backdrop-blur-xl border-r border-vibeguard-glassBorder">
        <div className="p-6 border-b border-vibeguard-glassBorder">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-vibeguard-primary to-vibeguard-violet bg-clip-text text-transparent font-sans">
            VibeGuard
          </h1>
          <p className="text-sm text-vibeguard-textMuted mt-1">The Librarian</p>
        </div>
        
        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-vibeguard-glassHover text-vibeguard-text font-semibold shadow-glow-primary'
                    : 'text-vibeguard-textMuted hover:text-vibeguard-text'
                }`}
              >
                {/* Left border glow on hover/active */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-full transition-all duration-300 ${
                    isActive
                      ? 'h-full bg-gradient-to-b from-vibeguard-primary to-vibeguard-violet shadow-glow-primary'
                      : 'group-hover:h-3/4 group-hover:bg-vibeguard-primary/50 group-hover:shadow-glow-primary'
                  }`}
                />
                <Icon 
                  size={20} 
                  className={isActive ? 'text-vibeguard-primary' : 'text-vibeguard-textMuted group-hover:text-vibeguard-primary transition-colors'} 
                />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}



