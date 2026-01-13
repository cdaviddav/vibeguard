import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getApiKey, getMaxTokens, getModel } from './config';

export interface LLMOptions {
  maxTokens?: number;
  thinkingLevel?: 'high' | 'medium' | 'low';
  temperature?: number;
}

let geminiClient: GoogleGenerativeAI | null = null;
let currentModel: GenerativeModel | null = null;

/**
 * Initialize Gemini client
 */
async function initializeGemini(): Promise<GenerativeModel> {
  if (currentModel) {
    return currentModel;
  }

  const apiKey = await getApiKey();
  const modelName = await getModel();

  geminiClient = new GoogleGenerativeAI(apiKey);
  currentModel = geminiClient.getGenerativeModel({ 
    model: modelName,
  });

  return currentModel;
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
 * Generate summary with retry logic
 */
export async function generateSummary(
  prompt: string,
  systemPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const model = await initializeGemini();
  const maxTokens = options.maxTokens || await getMaxTokens();
  const temperature = options.temperature ?? 0.3;

  // Build the full prompt with system instructions
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  let lastError: Error | null = null;
  const maxRetries = 3;
  const delays = [1000, 2000, 4000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Note: Gemini API may not support thinking_level directly in the current SDK
      // This would need to be set via generation config if available
      const generationConfig: any = {
        maxOutputTokens: maxTokens,
        temperature,
      };

      // If thinking level is supported, add it
      // This is a placeholder for future API support
      if (options.thinkingLevel) {
        // generationConfig.thinkingLevel = options.thinkingLevel;
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., invalid API key)
      if (error.message?.includes('API_KEY') || error.message?.includes('401')) {
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

