import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getApiKey, getMaxTokens, getFlashModel, getProModel } from './config';

export interface LLMOptions {
  maxTokens?: number;
  thinkingLevel?: 'flash' | 'pro';
  temperature?: number;
}

let geminiClient: GoogleGenerativeAI | null = null;
const modelCache: Map<string, GenerativeModel> = new Map();

/**
 * Initialize Gemini client with a specific model
 */
async function initializeGemini(modelName: string): Promise<GenerativeModel> {
  // Check cache first
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName)!;
  }

  const apiKey = await getApiKey();

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  const model = geminiClient.getGenerativeModel({ 
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

  // Cache the model
  modelCache.set(modelName, model);

  return model;
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
  // Determine thinking level (default to 'flash')
  const thinkingLevel = options.thinkingLevel || 'flash';
  
  // Get appropriate model based on thinking level
  let modelName: string;
  let modelDisplayName: string;
  
  if (thinkingLevel === 'pro') {
    modelName = await getProModel();
    modelDisplayName = 'Gemini 3 Pro';
  } else {
    modelName = await getFlashModel();
    modelDisplayName = 'Gemini 3 Flash';
  }

  // Log model usage
  if (thinkingLevel === 'pro') {
    console.error(`[VibeGuard] Using ${modelDisplayName} for Architectural Pruning...`);
  } else {
    console.error(`[VibeGuard] Using ${modelDisplayName} for Summarization...`);
  }

  const model = await initializeGemini(modelName);
  const maxTokens = options.maxTokens || await getMaxTokens();
  const temperature = options.temperature ?? 0.3;

  // Build the full prompt with system instructions
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  let lastError: Error | null = null;
  const maxRetries = 3;
  const delays = [1000, 2000, 4000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const generationConfig: any = {
        maxOutputTokens: maxTokens,
        temperature,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = result.response;
      
      // Check finishReason to understand why response might be empty
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
        // Provide more context about why the response might be empty
        const finishReason = candidates[0]?.finishReason || 'UNKNOWN';
        throw new Error(`Empty response from Gemini API (finishReason: ${finishReason})`);
      }

      return text;
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

