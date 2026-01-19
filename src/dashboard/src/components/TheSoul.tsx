import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Brain, FileText, Clock, Loader2 } from 'lucide-react';

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
        if (data.error) {
          setError(data.error);
          console.error('[TheSoul] API error:', data.error);
        } else {
          const content = data.content || '';
          setContent(content);
          if (content) {
            console.log('[TheSoul] Loaded content, length:', content.length);
          } else {
            console.warn('[TheSoul] Content is empty');
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load PROJECT_MEMORY.md');
        setLoading(false);
      });
  }, []);

  // Parse content to extract sections for bento layout
  const parseContent = (markdown: string) => {
    const sections: { title: string; content: string }[] = [];
    const lines = markdown.split('\n');
    let currentSection = { title: '', content: '' };
    
    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        if (currentSection.title) {
          sections.push({ ...currentSection });
        }
        currentSection = { title: line.replace('## ', ''), content: '' };
      } else if (currentSection.title) {
        currentSection.content += line + '\n';
      }
    });
    
    if (currentSection.title) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const sections = parseContent(content);
  const recentDecisions = sections.find(s => s.title.includes('Recent Decisions'));
  const pinnedFiles = sections.find(s => s.title.includes('Pinned Files'));
  const otherSections = sections.filter(s => !s.title.includes('Recent Decisions') && !s.title.includes('Pinned Files'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-vg-textMuted">
          <Loader2 className="w-5 h-5 animate-spin text-vg-indigo" />
          <span className="text-sm">Loading PROJECT_MEMORY.md...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card border-vg-error/30 shadow-glow-error"
      >
        <h2 className="text-vg-error font-medium text-sm mb-2">Error Loading Soul</h2>
        <p className="text-vg-textMuted text-xs mb-2">{error}</p>
        <p className="text-vg-textMuted text-xs">
          Make sure PROJECT_MEMORY.md exists in the project root.
        </p>
      </motion.div>
    );
  }

  // Check for empty content
  if (!loading && !error && (!content || content.trim().length === 0)) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl"
      >
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <Brain className="w-5 h-5 text-vg-indigo" />
            <h1 className="text-xl font-semibold text-gradient">The Soul</h1>
          </div>
          <p className="text-xs text-vg-textMuted ml-8">
            Persistent project memory • PROJECT_MEMORY.md
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card border-vg-warning/30"
        >
          <h2 className="text-vg-warning font-medium text-sm mb-2">Empty PROJECT_MEMORY.md</h2>
          <p className="text-vg-textMuted text-xs mb-2">
            The PROJECT_MEMORY.md file exists but is empty.
          </p>
          <p className="text-vg-textMuted text-xs">
            Run <code className="px-1.5 py-0.5 bg-vg-bgSecondary rounded text-vg-textSecondary font-mono text-xs">vibeguard init</code> to initialize it.
          </p>
        </motion.div>
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
          <Brain className="w-5 h-5 text-vg-indigo" />
          <h1 className="text-xl font-semibold text-gradient">The Soul</h1>
        </div>
        <p className="text-xs text-vg-textMuted ml-8">
          Persistent project memory • PROJECT_MEMORY.md
        </p>
      </motion.div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Recent Decisions - Large card spanning 8 columns */}
        {recentDecisions && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-8 bento-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-vg-indigo" />
              <h2 className="text-sm font-medium text-vg-text">{recentDecisions.title}</h2>
            </div>
            <div className="prose-vg max-h-[400px] overflow-y-auto pr-2">
              <ReactMarkdown>{recentDecisions.content}</ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* Pinned Files - Smaller card */}
        {pinnedFiles && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-4 bento-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-vg-violet" />
              <h2 className="text-sm font-medium text-vg-text">{pinnedFiles.title}</h2>
            </div>
            <div className="prose-vg">
              <ReactMarkdown>{pinnedFiles.content}</ReactMarkdown>
            </div>
          </motion.div>
        )}

        {/* Other sections in smaller cards */}
        {otherSections.map((section, index) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="col-span-12 md:col-span-6 bento-card"
          >
            <h2 className="text-sm font-medium text-vg-text mb-3">{section.title}</h2>
            <div className="prose-vg">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}

        {/* Full content fallback if no sections parsed */}
        {sections.length === 0 && content && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-12 bento-card"
          >
            <div className="prose-vg">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
