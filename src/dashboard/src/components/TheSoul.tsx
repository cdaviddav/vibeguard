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
        <div className="text-vibeguard-textMuted">Loading PROJECT_MEMORY.md...</div>
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
    <div className="max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-vibeguard-primary to-vibeguard-violet bg-clip-text text-transparent font-sans">
        The Soul
      </h1>
      <div className="bg-vibeguard-glass backdrop-blur-xl border border-vibeguard-glassBorder rounded-lg p-8 prose prose-invert max-w-none">
        <style>{`
          .prose {
            color: #e4e4e7;
          }
          .prose h1, .prose h2, .prose h3, .prose h4 {
            color: #6366f1;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .prose h1 {
            font-size: 2rem;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 0.5rem;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .prose h2 {
            font-size: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 0.25rem;
          }
          .prose code {
            background-color: rgba(0, 0, 0, 0.3);
            color: #10b981;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.9em;
            font-family: 'JetBrains Mono', monospace;
          }
          .prose pre {
            background-color: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
          }
          .prose pre code {
            background-color: transparent;
            padding: 0;
            color: #10b981;
            font-family: 'JetBrains Mono', monospace;
          }
          .prose a {
            color: #6366f1;
            text-decoration: underline;
            transition: color 0.2s;
          }
          .prose a:hover {
            color: #8b5cf6;
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



