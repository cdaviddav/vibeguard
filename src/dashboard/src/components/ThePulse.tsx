import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function ThePulse() {
  const [status, setStatus] = useState<'active' | 'idle' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/status')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setStatus(data.status || 'idle');
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    };

    fetchStatus();
    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-textMuted">Loading status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <h2 className="text-red-400 font-semibold mb-2">Error</h2>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 text-cyber-accent font-mono">The Pulse</h1>
      
      <div className="bg-cyber-surface border border-cyber-border rounded-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <Activity 
            size={32} 
            className={status === 'active' ? 'text-cyber-accent animate-pulse' : 'text-cyber-textMuted'} 
          />
          <div>
            <h2 className="text-2xl font-semibold">Watcher Status</h2>
            <p className="text-cyber-textMuted">Live monitoring will be available soon</p>
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

        <div className="mt-8 p-4 bg-cyber-bg rounded-lg border border-cyber-border">
          <h3 className="text-lg font-semibold mb-2">Live Logs</h3>
          <p className="text-cyber-textMuted">
            WebSocket connection for live logs will be implemented in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

