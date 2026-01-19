import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { config } from 'dotenv';
import { ConfigManager, GlobalConfig as ConfigManagerGlobalConfig } from './config-manager';

export interface GlobalConfig {
  geminiApiKey?: string;
  maxTokens?: number;
  model?: string;
  flashModel?: string;
  proModel?: string;
  scanDepth?: number;
}

/**
 * Global constants for architectural scanning
 */
export const MAX_SCAN_DEPTH = 15;

/**
 * Hybrid API key resolution with priority:
 * 1. process.env.GEMINI_API_KEY (direct env var - CI/CD)
 * 2. .env file in project root (via dotenv - Vibe Coding default)
 * 3. New ConfigManager (checks local config for provider, then global config)
 * 4. Legacy global config file (~/.config/vibeguard/config.json)
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

  // Priority 3: New ConfigManager (if local config exists, use it)
  try {
    const localConfig = await ConfigManager.loadLocalConfig();
    if (localConfig) {
      const apiKey = await ConfigManager.getApiKey(localConfig.provider);
      if (apiKey) {
        return apiKey;
      }
    } else {
      // Try Google provider as fallback
      const apiKey = await ConfigManager.getApiKey('google');
      if (apiKey) {
        return apiKey;
      }
    }
  } catch {
    // ConfigManager might not be set up yet, continue to legacy fallback
  }

  // Priority 4: Legacy global config file
  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.geminiApiKey) {
    return globalConfig.geminiApiKey;
  }

  throw new Error(
    'GEMINI_API_KEY not found. Please set it in one of the following ways:\n' +
    '  1. Environment variable: export GEMINI_API_KEY=your-key\n' +
    '  2. .env file: Create .env in project root with GEMINI_API_KEY=your-key\n' +
    '  3. Run `vibeguard init` to configure via interactive wizard\n' +
    '  4. Global config: Create ~/.vibeguard/config.json with {"geminiApiKey": "your-key"}'
  );
}

/**
 * Load global config from ~/.vibeguard/config.json (new) or ~/.config/vibeguard/config.json (legacy)
 */
export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  // Try new ConfigManager first
  try {
    const newConfig = await ConfigManager.loadGlobalConfig();
    if (newConfig) {
      return newConfig as GlobalConfig;
    }
  } catch {
    // Continue to legacy path
  }

  // Legacy path: ~/.config/vibeguard/config.json
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

  return 50000; // Default aligned with 18.01.2026 decision for Oracle reasoning
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

/**
 * Get the maximum directory depth for architectural scans
 */
export async function getScanDepth(): Promise<number> {
  const envValue = process.env.VIBEGUARD_SCAN_DEPTH;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  const globalConfig = await loadGlobalConfig();
  if (globalConfig?.scanDepth) {
    return globalConfig.scanDepth;
  }

  return MAX_SCAN_DEPTH;
}