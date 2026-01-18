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
          setStatus(data.status || 'idle');
        })
        .catch((err) => {
          console.error('Error fetching status:', err);
        });
    };

    fetchStatus();
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl">
      {/* Watcher Status Section */}
      <div className="bg-cyber-surface border border-cyber-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Activity 
            size={32} 
            className={status === 'active' ? 'text-cyber-accent animate-pulse' : 'text-cyber-textMuted'} 
          />
          <div>
            <h2 className="text-2xl font-semibold">Watcher Status</h2>
            <p className="text-cyber-textMuted text-sm">Live monitoring will be available soon</p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
          status === 'active' 
            ? 'bg-green-900/20 border border-green-500' 
            : 'bg-cyber-border border border-cyber-border'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-cyber-textMuted'
          }`}></div>
          <span className="font-semibold capitalize">{status || 'idle'}</span>
        </div>
      </div>

      {/* Pulse Feed Section */}
      <Pulse />
    </div>
  );
}

