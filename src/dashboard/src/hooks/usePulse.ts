import { useState, useEffect, useCallback } from 'react';

export interface Prophecy {
  id: string;
  type: 'RuleViolation' | 'Refactor' | 'Optimization';
  title: string;
  description: string;
  suggestedAction: string;
  timestamp: string; // Maps to createdAt from API
  priority?: 'High' | 'Medium' | 'Low';
}

/**
 * Hook to manage Pulse feed state - fetches data from API
 */
export function usePulse() {
  const [prophecies, setProphecies] = useState<Prophecy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch prophecies from API
  useEffect(() => {
    const fetchProphecies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/pulse');
        if (!response.ok) {
          throw new Error(`Failed to fetch prophecies: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Map API response to component format (createdAt -> timestamp)
        const mappedProphecies: Prophecy[] = (data.prophecies || []).map((p: any) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          description: p.description,
          suggestedAction: p.suggestedAction,
          timestamp: p.createdAt || p.timestamp || new Date().toISOString(),
          priority: p.priority,
        }));
        
        setProphecies(mappedProphecies);
      } catch (err: any) {
        console.error('Error fetching prophecies:', err);
        setError(err.message || 'Failed to load prophecies');
        setProphecies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProphecies();
    // Poll every 10 seconds
    const interval = setInterval(fetchProphecies, 10000);

    return () => clearInterval(interval);
  }, []);

  // Function to acknowledge (remove) a prophecy
  const acknowledgeProphecy = useCallback((id: string) => {
    setProphecies((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Function to add a new prophecy (for testing or real-time updates)
  const addProphecy = useCallback((prophecy: Prophecy) => {
    setProphecies((prev) => [prophecy, ...prev]);
  }, []);

  return {
    prophecies,
    loading,
    error,
    acknowledgeProphecy,
    addProphecy,
  };
}

