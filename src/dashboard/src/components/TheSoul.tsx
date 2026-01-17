import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function TheSoul() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/soul')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-textMuted">Loading PROJECT_MEMORY.md...</div>
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
      <h1 className="text-4xl font-bold mb-6 text-cyber-accent font-mono">The Soul</h1>
      <div className="bg-cyber-surface border border-cyber-border rounded-lg p-8 prose prose-invert max-w-none">
        <style>{`
          .prose {
            color: #e0e7ff;
          }
          .prose h1, .prose h2, .prose h3, .prose h4 {
            color: #00ff88;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .prose h1 {
            font-size: 2rem;
            border-bottom: 2px solid #1a2332;
            padding-bottom: 0.5rem;
          }
          .prose h2 {
            font-size: 1.5rem;
            border-bottom: 1px solid #1a2332;
            padding-bottom: 0.25rem;
          }
          .prose code {
            background-color: #141b2d;
            color: #00ff88;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.9em;
          }
          .prose pre {
            background-color: #141b2d;
            border: 1px solid #1a2332;
            border-radius: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
          }
          .prose pre code {
            background-color: transparent;
            padding: 0;
          }
          .prose a {
            color: #00ff88;
            text-decoration: underline;
          }
          .prose ul, .prose ol {
            margin-left: 1.5rem;
          }
          .prose li {
            margin: 0.5rem 0;
          }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

