import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ConfigManager, LLMProvider, ModelProfile } from './config-manager';
import { getMaxTokens } from './config';
import { TokenTracker, Feature } from '../services/token-tracker';

export interface LLMOptions {
  maxTokens?: number;
  thinkingLevel?: 'flash' | 'pro';
  temperature?: number;
  feature?: Feature; // Feature making the call (Librarian/Oracle/AutoFix)
}

// Legacy TokenUsage interface for backward compatibility
export interface TokenUsage {
  model: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  timestamp: string;
  cost?: number; // Cost in USD (optional, can be calculated later)
}

// Singleton TokenTracker instance
let tokenTracker: TokenTracker | null = null;

function getTokenTracker(): TokenTracker {
  if (!tokenTracker) {
    tokenTracker = new TokenTracker();
  }
  return tokenTracker;
}

/**
 * Estimate token count (rough approximation: ~4 characters per token)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  // This is a simplified estimate; actual tokenization varies
  return Math.ceil(text.length / 4);
}

/**
 * LLM Adapter Interface
 */
interface LLMAdapter {
  generate(prompt: string, systemPrompt: string, options: LLMOptions): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }>;
}

/**
 * Gemini Adapter
 */
class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenerativeAI | null = null;
  private modelCache: Map<string, GenerativeModel> = new Map();

  async initialize(apiKey: string, modelName: string): Promise<GenerativeModel> {
    if (this.modelCache.has(modelName)) {
      return this.modelCache.get(modelName)!;
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(apiKey);
    }

    const model = this.client.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_NONE' as any,
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH' as any,
          threshold: 'BLOCK_NONE' as any,
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
          threshold: 'BLOCK_NONE' as any,
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
          threshold: 'BLOCK_ONLY_HIGH' as any,
        },
      ],
    });

    this.modelCache.set(modelName, model);
    return model;
  }

  async generate(
    prompt: string,
    systemPrompt: string,
    options: LLMOptions
  ): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const apiKey = await ConfigManager.getApiKey('google');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found. Please run `vibeguard init` to configure.');
    }

    const localConfig = await ConfigManager.loadLocalConfig();
    const provider: LLMProvider = localConfig?.provider || 'google';
    const profile: ModelProfile = localConfig?.profile || 'Balanced';
    const thinkingLevel = options.thinkingLevel || 'flash';
    const modelName = ConfigManager.getModelForProfile(provider, profile, thinkingLevel);

    const model = await this.initialize(apiKey, modelName);
    const maxTokens = options.maxTokens || await getMaxTokens();
    const temperature = options.temperature ?? 0.3;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const generationConfig: any = {
      maxOutputTokens: maxTokens,
      temperature,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig,
    });

    const response = result.response;
    const candidates = response.candidates || [];

    if (candidates.length > 0) {
      const finishReason = candidates[0].finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Response blocked by safety filters. Consider adjusting safety settings.');
      }
      if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Response finished with reason: ${finishReason}`);
      }
    }

    const text = response.text();
    if (!text) {
      const finishReason = candidates[0]?.finishReason || 'UNKNOWN';
      throw new Error(`Empty response from Gemini API (finishReason: ${finishReason})`);
    }

    // Extract usage information if available
    // usageMetadata is a property, not a method
    const usageInfo = result.response.usageMetadata;
    const usage = usageInfo ? {
      inputTokens: usageInfo.promptTokenCount || estimateTokens(fullPrompt),
      outputTokens: usageInfo.candidatesTokenCount || estimateTokens(text),
    } : {
      inputTokens: estimateTokens(fullPrompt),
      outputTokens: estimateTokens(text),
    };

    return { text, usage };
  }
}

/**
 * OpenAI Adapter
 */
class OpenAIAdapter implements LLMAdapter {
  async generate(
    prompt: string,
    systemPrompt: string,
    options: LLMOptions
  ): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const apiKey = await ConfigManager.getApiKey('openai');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found. Please run `vibeguard init` to configure.');
    }

    const localConfig = await ConfigManager.loadLocalConfig();
    const provider: LLMProvider = localConfig?.provider || 'openai';
    const profile: ModelProfile = localConfig?.profile || 'Balanced';
    const thinkingLevel = options.thinkingLevel || 'flash';
    const modelName = ConfigManager.getModelForProfile(provider, profile, thinkingLevel);

    const maxTokens = options.maxTokens || await getMaxTokens();
    const temperature = options.temperature ?? 0.3;

    // Use fetch for OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as any;
    const text = data.choices[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from OpenAI API');
    }

    const usage = data.usage ? {
      inputTokens: data.usage.prompt_tokens || estimateTokens(`${systemPrompt}\n\n${prompt}`),
      outputTokens: data.usage.completion_tokens || estimateTokens(text),
    } : {
      inputTokens: estimateTokens(`${systemPrompt}\n\n${prompt}`),
      outputTokens: estimateTokens(text),
    };

    return { text, usage };
  }
}

/**
 * Anthropic Adapter
 */
class AnthropicAdapter implements LLMAdapter {
  async generate(
    prompt: string,
    systemPrompt: string,
    options: LLMOptions
  ): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const apiKey = await ConfigManager.getApiKey('anthropic');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found. Please run `vibeguard init` to configure.');
    }

    const localConfig = await ConfigManager.loadLocalConfig();
    const provider: LLMProvider = localConfig?.provider || 'anthropic';
    const profile: ModelProfile = localConfig?.profile || 'Balanced';
    const thinkingLevel = options.thinkingLevel || 'flash';
    const modelName = ConfigManager.getModelForProfile(provider, profile, thinkingLevel);

    const maxTokens = options.maxTokens || await getMaxTokens();
    const temperature = options.temperature ?? 0.3;

    // Use fetch for Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as any;
    const text = data.content[0]?.text;

    if (!text) {
      throw new Error('Empty response from Anthropic API');
    }

    const usage = data.usage ? {
      inputTokens: data.usage.input_tokens || estimateTokens(`${systemPrompt}\n\n${prompt}`),
      outputTokens: data.usage.output_tokens || estimateTokens(text),
    } : {
      inputTokens: estimateTokens(`${systemPrompt}\n\n${prompt}`),
      outputTokens: estimateTokens(text),
    };

    return { text, usage };
  }
}

/**
 * Get the appropriate adapter based on provider
 */
async function getAdapter(): Promise<LLMAdapter> {
  const localConfig = await ConfigManager.loadLocalConfig();
  const provider: LLMProvider = localConfig?.provider || 'google';

  switch (provider) {
    case 'google':
      return new GeminiAdapter();
    case 'openai':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    default:
      return new GeminiAdapter();
  }
}

/**
 * Generate summary with retry logic (Provider-Agnostic)
 */
export async function generateSummary(
  prompt: string,
  systemPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const thinkingLevel = options.thinkingLevel || 'flash';
  
  const localConfig = await ConfigManager.loadLocalConfig();
  const provider: LLMProvider = localConfig?.provider || 'google';
  const profile: ModelProfile = localConfig?.profile || 'Balanced';
  const modelName = ConfigManager.getModelForProfile(provider, profile, thinkingLevel);
  const modelDisplayName = ConfigManager.getModelDisplayName(provider, modelName);

  // Log model usage
  if (thinkingLevel === 'pro') {
    console.error(`[VibeGuard] Using ${modelDisplayName} for Architectural Pruning...`);
  } else {
    console.error(`[VibeGuard] Using ${modelDisplayName} for Summarization...`);
  }

  const adapter = await getAdapter();
  let lastError: Error | null = null;
  const maxRetries = 3;
  const delays = [1000, 2000, 4000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await adapter.generate(prompt, systemPrompt, options);
      
      // Track token usage with TokenTracker (async, non-blocking)
      if (result.usage && options.feature) {
        const tracker = getTokenTracker();
        // Fire and forget - don't wait for it to complete
        tracker.logUsage({
          feature: options.feature,
          model: modelName,
          provider,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        }).catch(err => {
          // Silently handle errors - tracking shouldn't block execution
          console.warn('[VibeGuard] Token tracking failed:', err);
        });
      }

      return result.text;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., invalid API key, safety blocks)
      if (
        error.message?.includes('API_KEY') || 
        error.message?.includes('401') ||
        error.message?.includes('403') ||
        error.message?.includes('safety') ||
        error.message?.includes('SAFETY') ||
        error.message?.includes('blocked by safety')
      ) {
        throw error;
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw new Error(`Failed to generate summary after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Get token usage history (legacy support)
 * @deprecated Use TokenTracker.getUsageLogs() instead
 */
export async function getTokenUsageHistory(): Promise<TokenUsage[]> {
  const tracker = getTokenTracker();
  const logs = await tracker.getUsageLogs();
  
  // Convert to legacy format
  return logs.map(log => ({
    model: log.model,
    provider: log.provider,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    timestamp: log.timestamp,
    cost: log.cost,
  }));
}
