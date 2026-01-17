import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { config } from 'dotenv';

export interface GlobalConfig {
  geminiApiKey?: string;
  maxTokens?: number;
  model?: string;
  flashModel?: string;
  proModel?: string;
}

/**
 * Hybrid API key resolution with priority:
 * 1. process.env.GEMINI_API_KEY (direct env var - CI/CD)
 * 2. .env file in project root (via dotenv - Vibe Coding default)
 * 3. ~/.config/vibeguard/config.json (global fallback)
 */
export async function getApiKey(): Promise<string> {
  // Priority 1: Direct environment variable
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Priority 2: .env file in project root
  config(); // Load .env file
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Priority 3: Global config file
  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.geminiApiKey) {
    return globalConfig.geminiApiKey;
  }

  throw new Error(
    'GEMINI_API_KEY not found. Please set it in one of the following ways:\n' +
    '  1. Environment variable: export GEMINI_API_KEY=your-key\n' +
    '  2. .env file: Create .env in project root with GEMINI_API_KEY=your-key\n' +
    '  3. Global config: Create ~/.config/vibeguard/config.json with {"geminiApiKey": "your-key"}'
  );
}

/**
 * Load global config from ~/.config/vibeguard/config.json
 */
export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  try {
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.config', 'vibeguard', 'config.json');

    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as GlobalConfig;
  } catch (error) {
    // File doesn't exist or is invalid - return null
    return null;
  }
}

/**
 * Get max tokens from config (with fallback)
 */
export async function getMaxTokens(): Promise<number> {
  const envValue = process.env.VIBEGUARD_MAX_TOKENS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.maxTokens) {
    return globalConfig.maxTokens;
  }

  return 30000; // Default
}

/**
 * Get model name from config (with fallback)
 * @deprecated Use getFlashModel() or getProModel() instead
 */
export async function getModel(): Promise<string> {
  const envValue = process.env.VIBEGUARD_MODEL;
  if (envValue) {
    return envValue;
  }

  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.model) {
    return globalConfig.model;
  }

  return 'gemini-3-flash-preview'; // Default
}

/**
 * Get Flash model name from config (with fallback)
 */
export async function getFlashModel(): Promise<string> {
  const envValue = process.env.VIBEGUARD_FLASH_MODEL;
  if (envValue) {
    return envValue;
  }

  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.flashModel) {
    return globalConfig.flashModel;
  }

  // Fallback to legacy VIBEGUARD_MODEL if set
  const legacyModel = process.env.VIBEGUARD_MODEL;
  if (legacyModel) {
    return legacyModel;
  }

  const legacyGlobalConfig = await loadGlobalConfig();
  if (legacyGlobalConfig?.model) {
    return legacyGlobalConfig.model;
  }

  return 'gemini-3-flash-preview'; // Default
}

/**
 * Get Pro model name from config (with fallback to Flash if not configured)
 */
export async function getProModel(): Promise<string> {
  const envValue = process.env.VIBEGUARD_PRO_MODEL;
  if (envValue) {
    return envValue;
  }

  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.proModel) {
    return globalConfig.proModel;
  }

  // Fallback to Flash model if Pro is not configured
  return await getFlashModel();
}

