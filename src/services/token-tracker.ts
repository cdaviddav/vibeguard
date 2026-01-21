import * as path from 'path';
import * as fs from 'fs/promises';
import writeFileAtomic from 'write-file-atomic';
import { calculateCost, calculateHighIqCost, isFlashModel } from '../utils/pricing.js';
import { LLMProvider } from '../utils/config-manager.js';

export type Feature = 'Librarian' | 'Oracle' | 'AutoFix';

export interface TokenUsageLog {
  timestamp: string;
  feature: Feature;
  model: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  cost: number; // Actual cost in USD
  savings?: number; // Savings if Flash model was used (vs Pro)
}

export interface TokenSummary {
  totalSpend: number; // Total actual spend in USD
  totalTokens: number; // Total tokens processed (input + output)
  totalSavings: number; // Total savings from using Flash models
  breakdownByFeature: Record<Feature, {
    spend: number;
    tokens: number;
    savings: number;
  }>;
}

export class TokenTracker {
  private usageFilePath: string;

  constructor(repoPath: string = process.cwd()) {
    this.usageFilePath = path.join(repoPath, '.vibeguard', 'token-usage.json');
  }

  /**
   * Log token usage for an LLM call
   * Asynchronously writes to file without blocking execution
   */
  async logUsage(params: {
    feature: Feature;
    model: string;
    provider: LLMProvider;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void> {
    try {
      // Calculate actual cost
      const cost = calculateCost(params.model, params.inputTokens, params.outputTokens);
      
      // Calculate savings by comparing actual cost vs hypothetical "High-IQ" model cost
      // High-IQ = Pro/Opus models (most expensive tier)
      let savings: number | undefined = undefined;
      const highIqCost = calculateHighIqCost(params.model, params.provider, params.inputTokens, params.outputTokens);
      if (highIqCost > 0 && highIqCost > cost) {
        savings = highIqCost - cost;
      }

      const logEntry: TokenUsageLog = {
        timestamp: new Date().toISOString(),
        feature: params.feature,
        model: params.model,
        provider: params.provider,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        cost,
        savings,
      };

      // Ensure directory exists
      const usageDir = path.dirname(this.usageFilePath);
      await fs.mkdir(usageDir, { recursive: true });

      // Load existing logs
      let usageLogs: TokenUsageLog[] = [];
      try {
        const content = await fs.readFile(this.usageFilePath, 'utf-8');
        usageLogs = JSON.parse(content) as TokenUsageLog[];
        if (!Array.isArray(usageLogs)) {
          usageLogs = [];
        }
      } catch {
        // File doesn't exist or is invalid - start fresh
        usageLogs = [];
      }

      // Append new entry
      usageLogs.push(logEntry);

      // Keep only last 5000 entries to prevent file from growing too large
      if (usageLogs.length > 5000) {
        usageLogs = usageLogs.slice(-5000);
      }

      // Write atomically to prevent corruption
      await writeFileAtomic(
        this.usageFilePath,
        JSON.stringify(usageLogs, null, 2),
        'utf-8'
      );
    } catch (error) {
      // Don't fail if token tracking fails - log warning but don't throw
      console.warn('[VibeGuard] Failed to track token usage:', error);
    }
  }

  /**
   * Get aggregated summary of token usage
   */
  async getSummary(): Promise<TokenSummary> {
    try {
      const content = await fs.readFile(this.usageFilePath, 'utf-8');
      const usageLogs = JSON.parse(content) as TokenUsageLog[];
      
      if (!Array.isArray(usageLogs)) {
        return this.emptySummary();
      }

      let totalSpend = 0;
      let totalTokens = 0;
      let totalSavings = 0;

      // Initialize breakdown
      const breakdownByFeature: Record<Feature, {
        spend: number;
        tokens: number;
        savings: number;
      }> = {
        Librarian: { spend: 0, tokens: 0, savings: 0 },
        Oracle: { spend: 0, tokens: 0, savings: 0 },
        AutoFix: { spend: 0, tokens: 0, savings: 0 },
      };

      // Aggregate data
      for (const log of usageLogs) {
        const tokens = log.inputTokens + log.outputTokens;
        
        totalSpend += log.cost;
        totalTokens += tokens;
        if (log.savings) {
          totalSavings += log.savings;
        }

        // Update feature breakdown
        if (breakdownByFeature[log.feature]) {
          breakdownByFeature[log.feature].spend += log.cost;
          breakdownByFeature[log.feature].tokens += tokens;
          if (log.savings) {
            breakdownByFeature[log.feature].savings += log.savings;
          }
        }
      }

      return {
        totalSpend,
        totalTokens,
        totalSavings,
        breakdownByFeature,
      };
    } catch {
      // File doesn't exist or is invalid
      return this.emptySummary();
    }
  }

  /**
   * Get all usage logs
   */
  async getUsageLogs(): Promise<TokenUsageLog[]> {
    try {
      const content = await fs.readFile(this.usageFilePath, 'utf-8');
      const logs = JSON.parse(content) as TokenUsageLog[];
      return Array.isArray(logs) ? logs : [];
    } catch {
      return [];
    }
  }

  /**
   * Get daily cost breakdown for the last N days
   */
  async getDailyCostBreakdown(days: number = 7): Promise<Array<{ date: string; cost: number; savings: number }>> {
    try {
      const logs = await this.getUsageLogs();
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Filter logs within date range
      const recentLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= cutoffDate;
      });

      // Group by date
      const dailyMap = new Map<string, { cost: number; savings: number }>();

      for (const log of recentLogs) {
        const date = new Date(log.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { cost: 0, savings: 0 });
        }

        const dayData = dailyMap.get(date)!;
        dayData.cost += log.cost;
        if (log.savings) {
          dayData.savings += log.savings;
        }
      }

      // Convert to array and sort by date
      const dailyBreakdown = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return dailyBreakdown;
    } catch {
      return [];
    }
  }

  /**
   * Get empty summary structure
   */
  private emptySummary(): TokenSummary {
    return {
      totalSpend: 0,
      totalTokens: 0,
      totalSavings: 0,
      breakdownByFeature: {
        Librarian: { spend: 0, tokens: 0, savings: 0 },
        Oracle: { spend: 0, tokens: 0, savings: 0 },
        AutoFix: { spend: 0, tokens: 0, savings: 0 },
      },
    };
  }
}

