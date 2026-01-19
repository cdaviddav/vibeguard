import express from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import open from 'open';
import { Watcher } from '../librarian/watcher';
import { OracleService } from '../librarian/oracle';
import { AutoFixService } from '../librarian/autofix';
import { getTokenUsageHistory } from '../utils/llm';

export async function handleDashboard() {
  const repoPath = process.cwd();
  const app = express();
  
  // Find available port starting from 3000
  const PORT = await findFreePort(3000);
  
  // Serve static files from dist/dashboard
  const dashboardPath = path.join(repoPath, 'dist', 'dashboard');
  
  // Check if dashboard is built
  try {
    await fs.access(dashboardPath);
  } catch (error) {
    console.error('❌ Dashboard not built. Please run `npm run build:dashboard` first.');
    process.exit(1);
  }
  
  app.use(express.static(dashboardPath));
  
  // API Endpoints
  app.get('/api/soul', async (req, res) => {
    try {
      const soulPath = path.join(repoPath, 'PROJECT_MEMORY.md');
      const content = await fs.readFile(soulPath, 'utf-8');
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to read PROJECT_MEMORY.md' });
    }
  });
  
  app.get('/api/map', async (req, res) => {
    try {
      const mapPath = path.join(repoPath, 'DIAGRAM.md');
      const content = await fs.readFile(mapPath, 'utf-8');
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to read DIAGRAM.md' });
    }
  });
  
  app.get('/api/status', async (req, res) => {
    try {
      const watcher = new Watcher(repoPath);
      const statePath = path.join(repoPath, '.vibeguard', 'state.json');
      
      let status: 'active' | 'idle' = 'idle';
      
      try {
        const stateContent = await fs.readFile(statePath, 'utf-8');
        const state = JSON.parse(stateContent);
        
        // Check if watcher is active by looking for watcher process or state
        // For now, we'll check if there's a recent state file update
        const stats = await fs.stat(statePath);
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;
        
        // If state file was modified recently, assume watcher might be active
        // This is a simple heuristic - in a real scenario, we'd track the process
        if (stats.mtimeMs > fiveMinutesAgo || state.isProcessing) {
          status = 'active';
        }
      } catch (error) {
        // State file doesn't exist - watcher is idle
        status = 'idle';
      }
      
      res.json({ status });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get watcher status' });
    }
  });

  app.get('/api/pulse', async (req, res) => {
    try {
      const oracle = new OracleService(repoPath);
      const prophecies = await oracle.getProphecies();
      
      // Sort by priority and creation date (newest first)
      const sortedProphecies = prophecies.sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      res.json({
        prophecies: sortedProphecies,
        count: sortedProphecies.length,
        highPriorityCount: sortedProphecies.filter(p => p.priority === 'High').length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get oracle prophecies' });
    }
  });

  app.post('/api/fix', express.json(), async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Prophecy ID is required' });
      }

      const autofix = new AutoFixService(repoPath);
      const result = await autofix.applyFix(id);

      if (result.success) {
        res.json({
          success: true,
          branchName: result.branchName,
          filesChanged: result.filesChanged || [],
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to apply fix',
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to apply fix' });
    }
  });

  app.get('/api/tokens', async (req, res) => {
    try {
      const usageHistory = await getTokenUsageHistory();
      
      // Calculate totals by model
      const modelStats: Record<string, { inputTokens: number; outputTokens: number; count: number }> = {};
      
      for (const usage of usageHistory) {
        const key = `${usage.provider}:${usage.model}`;
        if (!modelStats[key]) {
          modelStats[key] = { inputTokens: 0, outputTokens: 0, count: 0 };
        }
        modelStats[key].inputTokens += usage.inputTokens;
        modelStats[key].outputTokens += usage.outputTokens;
        modelStats[key].count += 1;
      }
      
      res.json({
        history: usageHistory,
        stats: modelStats,
        total: usageHistory.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get token usage' });
    }
  });
  
  // SPA fallback - serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(dashboardPath, 'index.html'));
  });
  
  // Start server
  const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n🚀 VibeGuard Dashboard running at ${url}\n`);
    console.log('Press Ctrl+C to stop the server.\n');
    
    // Open browser automatically
    open(url).catch((error) => {
      console.warn(`Could not open browser automatically: ${error.message}`);
      console.log(`Please open ${url} manually in your browser.`);
    });
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down dashboard server...');
    server.close(() => {
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down dashboard server...');
    server.close(() => {
      process.exit(0);
    });
  });
}

/**
 * Find the first available port starting from the given port
 */
async function findFreePort(startPort: number): Promise<number> {
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo)?.port || startPort;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next port
        findFreePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

