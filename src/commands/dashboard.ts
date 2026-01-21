import express from 'express';
import sirv from 'sirv';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import open from 'open';
import { Watcher } from '../librarian/watcher.js';
import { OracleService } from '../librarian/oracle.js';
import { AutoFixService } from '../librarian/autofix.js';
import { TokenTracker } from '../services/token-tracker.js';
import { DASHBOARD_PATH } from '../cli.js';

export async function handleDashboard() {
  const repoPath = process.cwd();
  const app = express();
  
  // Use port 5000 as specified
  const PORT = 5000;
  
  // Safety check: Verify dashboard assets exist before starting server
  if (!existsSync(DASHBOARD_PATH)) {
    console.error(`Error: Dashboard assets not found at ${DASHBOARD_PATH}`);
    process.exit(1);
  }
  
  // API Endpoints (must come before sirv to avoid route conflicts)
  app.get('/api/soul', async (req, res) => {
    try {
      const soulPath = path.join(repoPath, 'PROJECT_MEMORY.md');
      
      // Check if file exists
      try {
        await fs.access(soulPath);
      } catch {
        return res.status(404).json({ 
          error: 'PROJECT_MEMORY.md not found',
          content: ''
        });
      }
      
      const content = await fs.readFile(soulPath, 'utf-8');
      
      // Return empty content if file is empty
      if (!content || content.trim().length === 0) {
        return res.json({ 
          content: '',
          isEmpty: true 
        });
      }
      
      res.json({ content });
    } catch (error: any) {
      console.error('[Dashboard] Error reading PROJECT_MEMORY.md:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to read PROJECT_MEMORY.md',
        content: ''
      });
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

  app.get('/api/token-usage', async (req, res) => {
    try {
      const tracker = new TokenTracker(repoPath);
      
      // Get summary (total spend, savings, breakdown by feature)
      const summary = await tracker.getSummary();
      
      // Get daily cost breakdown for last 7 days
      const dailyBreakdown = await tracker.getDailyCostBreakdown(7);
      
      res.json({
        summary,
        dailyBreakdown,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get token usage' });
    }
  });
  
  // Use sirv to serve static files (SPA fallback handled by sirv's single option)
  app.use(sirv(DASHBOARD_PATH, { dev: false, single: true }));
  
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


