import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
import { Map, Loader2, AlertCircle, Maximize2 } from 'lucide-react';

export default function TheMap() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Premium dark theme for Mermaid diagrams
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        // Base colors - matching our premium palette
        primaryColor: '#6366f1',
        primaryTextColor: '#fafafa',
        primaryBorderColor: 'rgba(99, 102, 241, 0.3)',
        lineColor: '#6366f1',
        secondaryColor: '#111113',
        tertiaryColor: 'rgba(255, 255, 255, 0.03)',
        
        // Background
        background: '#09090b',
        mainBkg: '#111113',
        secondBkg: 'rgba(255, 255, 255, 0.03)',
        
        // Text
        textColor: '#a1a1aa',
        
        // Borders
        border1: 'rgba(255, 255, 255, 0.08)',
        border2: 'rgba(99, 102, 241, 0.3)',
        
        // Notes
        noteBkgColor: 'rgba(99, 102, 241, 0.1)',
        noteTextColor: '#a1a1aa',
        noteBorderColor: 'rgba(99, 102, 241, 0.2)',
        
        // Flowchart specific
        nodeBorder: 'rgba(99, 102, 241, 0.3)',
        clusterBkg: 'rgba(255, 255, 255, 0.02)',
        clusterBorder: 'rgba(255, 255, 255, 0.06)',
        
        // Font
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
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
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
      if (mermaidMatch) {
        const mermaidCode = mermaidMatch[1];
        mermaidRef.current.innerHTML = '';
        const id = 'mermaid-' + Date.now();
        
        mermaid.render(id, mermaidCode)
          .then((result: { svg: string }) => {
            if (mermaidRef.current) {
              // Inject custom styles into the SVG
              const styledSvg = result.svg.replace(
                '<style>',
                `<style>
                  .node rect, .node circle, .node ellipse, .node polygon, .node path {
                    stroke-width: 1px !important;
                  }
                  .edgePath .path {
                    stroke-width: 1.5px !important;
                  }
                  .label {
                    font-family: 'Inter', system-ui, sans-serif !important;
                  }
                `
              );
              mermaidRef.current.innerHTML = styledSvg;
            }
          })
          .catch((err: Error) => {
            console.error('Mermaid render error:', err);
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-4">
                  <p class="text-vg-error text-xs mb-1">Error rendering diagram</p>
                  <p class="text-vg-textDim text-[10px]">${err.message}</p>
                </div>
              `;
            }
          });
      } else {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-4">
              <p class="text-vg-textMuted text-xs">No mermaid diagram found in DIAGRAM.md</p>
            </div>
          `;
        }
      }
    }
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-vg-textMuted">
          <Loader2 className="w-5 h-5 animate-spin text-vg-indigo" />
          <span className="text-sm">Loading DIAGRAM.md...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card border-vg-error/20"
      >
        <div className="flex items-center gap-2 text-vg-error mb-2">
          <AlertCircle className="w-4 h-4" />
          <h2 className="text-sm font-medium">Error Loading Map</h2>
        </div>
        <p className="text-xs text-vg-textMuted">{error}</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <Map className="w-5 h-5 text-vg-indigo" />
          <h1 className="text-xl font-semibold text-gradient">The Map</h1>
        </div>
        <p className="text-xs text-vg-textMuted ml-8">
          Architecture visualization • DIAGRAM.md
        </p>
      </motion.div>

      {/* Diagram Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`bento-card relative ${isFullscreen ? 'fixed inset-4 z-50 m-0' : ''}`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-vg-text">Architecture Diagram</h2>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Maximize2 className="w-4 h-4 text-vg-textMuted" />
          </button>
        </div>
        
        {/* Diagram Container */}
        <div 
          ref={mermaidRef} 
          className={`flex justify-center items-center overflow-auto bg-black/20 rounded-md border border-white/[0.04] ${
            isFullscreen ? 'h-[calc(100%-60px)]' : 'min-h-[400px]'
          }`}
        />
      </motion.div>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-vg-bg/90 backdrop-blur-sm z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
