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
    <div className="min-h-screen bg-cyber-bg text-cyber-text">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-cyber-surface border-r border-cyber-border">
        <div className="p-6 border-b border-cyber-border">
          <h1 className="text-2xl font-bold text-cyber-accent font-mono">
            VibeGuard
          </h1>
          <p className="text-sm text-cyber-textMuted mt-1">The Librarian</p>
        </div>
        
        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyber-accent text-cyber-bg font-semibold'
                    : 'text-cyber-textMuted hover:bg-cyber-border hover:text-cyber-text'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
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



