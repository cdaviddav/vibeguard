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
    let isMounted = true;
    
    const fetchProphecies = async () => {
      try {
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
        
        // Only update state if prophecies have actually changed
        // Compare by creating a signature of IDs and timestamps
        setProphecies((prev) => {
          // Create a map of current prophecies by ID for quick lookup
          const prevMap = new Map(prev.map(p => [p.id, p]));
          const newMap = new Map(mappedProphecies.map(p => [p.id, p]));
          
          // Check if there are any differences
          const hasNewProphecies = mappedProphecies.some(p => !prevMap.has(p.id));
          const hasRemovedProphecies = prev.some(p => !newMap.has(p.id));
          const hasChangedProphecies = mappedProphecies.some(p => {
            const prevP = prevMap.get(p.id);
            return prevP && (
              prevP.title !== p.title ||
              prevP.description !== p.description ||
              prevP.suggestedAction !== p.suggestedAction ||
              prevP.type !== p.type ||
              prevP.priority !== p.priority
            );
          });
          
          // Only update if there are actual changes
          if (hasNewProphecies || hasRemovedProphecies || hasChangedProphecies) {
            return mappedProphecies;
          }
          
          // No changes, return previous state to prevent re-render
          return prev;
        });
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching prophecies:', err);
          setError(err.message || 'Failed to load prophecies');
        }
      }
    };

    // Initial fetch with loading state
    setLoading(true);
    fetchProphecies().finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });
    
    // Poll every 10 seconds, but only update if data changed
    const interval = setInterval(fetchProphecies, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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

