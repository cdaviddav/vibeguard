import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export type LLMProvider = 'google' | 'openai' | 'anthropic';
export type ModelProfile = 'Economy' | 'Balanced' | 'High-IQ';

export interface GlobalConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  maxTokens?: number;
  flashModel?: string;
  proModel?: string;
  scanDepth?: number;
}

export interface LocalConfig {
  provider: LLMProvider;
  profile: ModelProfile;
  customRulesPath?: string;
}

/**
 * ConfigManager handles both global and local configuration
 */
export class ConfigManager {
  private static globalConfigPath: string;
  private static localConfigPath: string;

  static {
    // Initialize paths
    const homeDir = os.homedir();
    ConfigManager.globalConfigPath = path.join(homeDir, '.vibeguard', 'config.json');
    
    const repoPath = process.cwd();
    ConfigManager.localConfigPath = path.join(repoPath, '.vibeguard', 'settings.json');
  }

  /**
   * Get global config path
   */
  static getGlobalConfigPath(): string {
    return ConfigManager.globalConfigPath;
  }

  /**
   * Get local config path
   */
  static getLocalConfigPath(): string {
    return ConfigManager.localConfigPath;
  }

  /**
   * Load global config from ~/.vibeguard/config.json
   */
  static async loadGlobalConfig(): Promise<GlobalConfig | null> {
    try {
      const content = await fs.readFile(ConfigManager.globalConfigPath, 'utf-8');
      return JSON.parse(content) as GlobalConfig;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save global config to ~/.vibeguard/config.json
   */
  static async saveGlobalConfig(config: GlobalConfig): Promise<void> {
    const configDir = path.dirname(ConfigManager.globalConfigPath);
    
    // Ensure directory exists
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    await fs.writeFile(
      ConfigManager.globalConfigPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Load local config from .vibeguard/settings.json
   */
  static async loadLocalConfig(): Promise<LocalConfig | null> {
    try {
      const content = await fs.readFile(ConfigManager.localConfigPath, 'utf-8');
      return JSON.parse(content) as LocalConfig;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save local config to .vibeguard/settings.json
   */
  static async saveLocalConfig(config: LocalConfig): Promise<void> {
    const configDir = path.dirname(ConfigManager.localConfigPath);
    
    // Ensure directory exists
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    await fs.writeFile(
      ConfigManager.localConfigPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Check if local config exists
   */
  static async localConfigExists(): Promise<boolean> {
    try {
      await fs.access(ConfigManager.localConfigPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API key for a specific provider
   * Priority: 1. Environment variable, 2. Global config, 3. null
   */
  static async getApiKey(provider: LLMProvider): Promise<string | null> {
    // Priority 1: Environment variables
    if (provider === 'google' && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY;
    }
    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    // Priority 2: Global config
    const globalConfig = await ConfigManager.loadGlobalConfig();
    if (!globalConfig) {
      return null;
    }

    switch (provider) {
      case 'google':
        return globalConfig.geminiApiKey || null;
      case 'openai':
        return globalConfig.openaiApiKey || null;
      case 'anthropic':
        return globalConfig.anthropicApiKey || null;
      default:
        return null;
    }
  }

  /**
   * Get model name based on provider and profile
   */
  static getModelForProfile(provider: LLMProvider, profile: ModelProfile, thinkingLevel: 'flash' | 'pro'): string {
    if (profile === 'Economy') {
      // Economy: Always use Flash models
      switch (provider) {
        case 'google':
          return 'gemini-3-flash-preview';
        case 'openai':
          return 'gpt-4o-mini';
        case 'anthropic':
          return 'claude-3-haiku-20240307';
        default:
          return 'gemini-3-flash-preview';
      }
    } else if (profile === 'Balanced') {
      // Balanced: Flash for summaries, Pro for Oracle/Auto-Fix
      if (thinkingLevel === 'flash') {
        switch (provider) {
          case 'google':
            return 'gemini-3-flash-preview';
          case 'openai':
            return 'gpt-4o-mini';
          case 'anthropic':
            return 'claude-3-haiku-20240307';
          default:
            return 'gemini-3-flash-preview';
        }
      } else {
        switch (provider) {
          case 'google':
            return 'gemini-3-pro-preview';
          case 'openai':
            return 'gpt-4o';
          case 'anthropic':
            return 'claude-3-opus-20240229';
          default:
            return 'gemini-3-pro-preview';
        }
      }
    } else {
      // High-IQ: Always use Pro models
      switch (provider) {
        case 'google':
          return 'gemini-3-pro-preview';
        case 'openai':
          return 'gpt-4o';
        case 'anthropic':
          return 'claude-3-opus-20240229';
        default:
          return 'gemini-3-pro-preview';
      }
    }
  }

  /**
   * Get model display name for logging
   */
  static getModelDisplayName(provider: LLMProvider, modelName: string): string {
    if (provider === 'google') {
      if (modelName.includes('flash')) {
        return 'Gemini 3 Flash';
      } else if (modelName.includes('pro')) {
        return 'Gemini 3 Pro';
      }
      return 'Gemini';
    } else if (provider === 'openai') {
      if (modelName.includes('gpt-4o')) {
        return modelName.includes('mini') ? 'GPT-4o Mini' : 'GPT-4o';
      }
      return 'OpenAI';
    } else if (provider === 'anthropic') {
      if (modelName.includes('haiku')) {
        return 'Claude 3 Haiku';
      } else if (modelName.includes('sonnet')) {
        return 'Claude 3 Sonnet';
      } else if (modelName.includes('opus')) {
        return 'Claude 3 Opus';
      }
      return 'Claude';
    }
    return modelName;
  }
}

