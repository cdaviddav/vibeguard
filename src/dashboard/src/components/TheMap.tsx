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
        primaryColor: '#6366f1', // Electric Indigo
        primaryTextColor: '#e4e4e7', // VibeGuard text
        primaryBorderColor: 'rgba(255, 255, 255, 0.1)', // Glass border
        lineColor: '#8b5cf6', // Vibrant Violet for connectors
        secondaryColor: '#0a0a0f', // VibeGuard bg
        tertiaryColor: 'rgba(255, 255, 255, 0.05)', // Glass surface
        background: '#0a0a0f',
        mainBkgColor: '#0a0a0f',
        secondBkgColor: 'rgba(255, 255, 255, 0.05)',
        textColor: '#e4e4e7',
        border1: 'rgba(255, 255, 255, 0.1)',
        border2: '#6366f1',
        noteBkgColor: 'rgba(99, 102, 241, 0.1)',
        noteTextColor: '#e4e4e7',
        noteBorderColor: '#6366f1',
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
              mermaidRef.current.innerHTML = '<div class="text-vibeguard-textMuted p-4">No mermaid diagram found in DIAGRAM.md</div>';
        }
      }
    }
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-vibeguard-textMuted">Loading DIAGRAM.md...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-error/30 rounded-lg p-4 shadow-glow-error">
        <h2 className="text-vibeguard-error font-semibold mb-2">Error</h2>
        <p className="text-vibeguard-errorLight">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-vibeguard-primary to-vibeguard-violet bg-clip-text text-transparent font-sans">
        The Map
      </h1>
      <div className="bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-glassBorder rounded-lg p-8">
        <div ref={mermaidRef} className="flex justify-center items-center min-h-[400px] overflow-auto"></div>
      </div>
    </div>
  );
}
