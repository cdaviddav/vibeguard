import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export default function TheMap() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#00ff88',
        primaryTextColor: '#e0e7ff',
        primaryBorderColor: '#1a2332',
        lineColor: '#00ff88',
        secondaryColor: '#141b2d',
        tertiaryColor: '#0a0e27',
      },
    });
  }, []);

  useEffect(() => {
    fetch('/api/map')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setContent(data.content || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (content && mermaidRef.current) {
      // Extract mermaid code from markdown
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
      if (mermaidMatch) {
        const mermaidCode = mermaidMatch[1];
        mermaidRef.current.innerHTML = '';
        const id = 'mermaid-' + Date.now();
        
        // Use render API - works with Mermaid 10.x
        mermaid.render(id, mermaidCode)
          .then((result: { svg: string }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = result.svg;
            }
          })
          .catch((err: Error) => {
            console.error('Mermaid render error:', err);
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = `<div class="text-red-400 p-4">Error rendering diagram: ${err.message}</div>`;
            }
          });
      } else {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '<div class="text-cyber-textMuted p-4">No mermaid diagram found in DIAGRAM.md</div>';
        }
      }
    }
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-textMuted">Loading DIAGRAM.md...</div>
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
    <div className="max-w-6xl">
      <h1 className="text-4xl font-bold mb-6 text-cyber-accent font-mono">The Map</h1>
      <div className="bg-cyber-surface border border-cyber-border rounded-lg p-8">
        <div ref={mermaidRef} className="flex justify-center items-center min-h-[400px] overflow-auto"></div>
      </div>
    </div>
  );
}
