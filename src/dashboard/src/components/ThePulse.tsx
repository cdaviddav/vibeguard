import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import Pulse from './Pulse';

export default function ThePulse() {
  const [status, setStatus] = useState<'active' | 'idle' | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      // Fetch watcher status
      fetch('/api/status')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch status: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          const newStatus = data.status || 'idle';
          // Only update if status actually changed
          setStatus((prevStatus) => {
            if (prevStatus !== newStatus) {
              return newStatus;
            }
            return prevStatus; // Return previous to prevent re-render
          });
        })
        .catch((err) => {
          console.error('Error fetching status:', err);
        });
    };

    fetchStatus();
    // Poll every 10 seconds, but only update if status changed
    const interval = setInterval(fetchStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl">
      {/* Watcher Status Section */}
      <div className="bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-glassBorder rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Activity 
            size={32} 
            className={status === 'active' ? 'text-vibeguard-success animate-pulse shadow-glow-success' : 'text-vibeguard-textMuted'} 
          />
          <div>
            <h2 className="text-2xl font-semibold text-vibeguard-text font-sans">Watcher Status</h2>
            <p className="text-vibeguard-textMuted text-sm">Live monitoring will be available soon</p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
          status === 'active' 
            ? 'bg-vibeguard-success/10 border border-vibeguard-success/50 shadow-glow-success' 
            : 'bg-vibeguard-glassHover border border-vibeguard-glassBorder'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            status === 'active' ? 'bg-vibeguard-success animate-pulse' : 'bg-vibeguard-textMuted'
          }`}></div>
          <span className="font-semibold capitalize text-vibeguard-text">{status || 'idle'}</span>
        </div>
      </div>

      {/* Pulse Feed Section */}
      <Pulse />
    </div>
  );
}

