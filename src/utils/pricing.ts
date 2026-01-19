/**
 * Pricing map for 2026 model generation
 * Source of Truth for cost calculations
 */

export type Provider = 'google' | 'openai';
export type ModelFamily = 'gemini-3-pro' | 'gemini-3-flash' | 'gpt-5' | 'gpt-5-mini';

export interface PricingTier {
  inputPricePer1M: number;  // USD per 1M input tokens
  outputPricePer1M: number; // USD per 1M output tokens
}

export interface ModelPricing {
  family: ModelFamily;
  provider: Provider;
  pricing: PricingTier;
}

/**
 * Pricing map for 2026 models
 */
export const PRICING_MAP: Record<string, ModelPricing> = {
  // Gemini 3 Pro
  'gemini-3-pro': {
    family: 'gemini-3-pro',
    provider: 'google',
    pricing: {
      inputPricePer1M: 2.00,
      outputPricePer1M: 12.00,
    },
  },
  'gemini-3-pro-preview': {
    family: 'gemini-3-pro',
    provider: 'google',
    pricing: {
      inputPricePer1M: 2.00,
      outputPricePer1M: 12.00,
    },
  },

  // Gemini 3 Flash
  'gemini-3-flash': {
    family: 'gemini-3-flash',
    provider: 'google',
    pricing: {
      inputPricePer1M: 0.50,
      outputPricePer1M: 3.00,
    },
  },
  'gemini-3-flash-preview': {
    family: 'gemini-3-flash',
    provider: 'google',
    pricing: {
      inputPricePer1M: 0.50,
      outputPricePer1M: 3.00,
    },
  },

  // GPT-5
  'gpt-5': {
    family: 'gpt-5',
    provider: 'openai',
    pricing: {
      inputPricePer1M: 1.25,
      outputPricePer1M: 10.00,
    },
  },
  'gpt-4o': {
    // Map gpt-4o to gpt-5 pricing (closest equivalent)
    family: 'gpt-5',
    provider: 'openai',
    pricing: {
      inputPricePer1M: 1.25,
      outputPricePer1M: 10.00,
    },
  },

  // GPT-5 Mini
  'gpt-5-mini': {
    family: 'gpt-5-mini',
    provider: 'openai',
    pricing: {
      inputPricePer1M: 0.25,
      outputPricePer1M: 2.00,
    },
  },
  'gpt-4o-mini': {
    // Map gpt-4o-mini to gpt-5-mini pricing (closest equivalent)
    family: 'gpt-5-mini',
    provider: 'openai',
    pricing: {
      inputPricePer1M: 0.25,
      outputPricePer1M: 2.00,
    },
  },
};

/**
 * Get pricing for a model by name
 */
export function getPricing(modelName: string): ModelPricing | null {
  // Normalize model name (case-insensitive, handle variations)
  const normalized = modelName.toLowerCase().trim();
  return PRICING_MAP[normalized] || null;
}

/**
 * Calculate cost for a given token usage
 */
export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getPricing(modelName);
  if (!pricing) {
    // Unknown model - return 0 to avoid false costs
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.pricing.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.pricing.outputPricePer1M;
  return inputCost + outputCost;
}

/**
 * Check if a model is a "Flash" tier model (economical)
 */
export function isFlashModel(modelName: string): boolean {
  const pricing = getPricing(modelName);
  if (!pricing) return false;
  
  return pricing.family === 'gemini-3-flash' || pricing.family === 'gpt-5-mini';
}

/**
 * Get the equivalent "Pro" model for savings calculation
 * Returns the Pro model family for the same provider
 */
export function getProModelFamily(modelName: string): ModelFamily | null {
  const pricing = getPricing(modelName);
  if (!pricing) return null;

  if (pricing.provider === 'google') {
    return 'gemini-3-pro';
  } else if (pricing.provider === 'openai') {
    return 'gpt-5';
  }
  
  return null;
}

/**
 * Calculate hypothetical cost if run on Pro model instead of Flash
 * Returns 0 if model is already Pro or unknown
 */
export function calculateProCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const proFamily = getProModelFamily(modelName);
  if (!proFamily) return 0;

  // Find a Pro model with the same provider
  const pricing = getPricing(modelName);
  if (!pricing) return 0;

  const proModelName = pricing.provider === 'google' 
    ? 'gemini-3-pro' 
    : 'gpt-5';
  
  return calculateCost(proModelName, inputTokens, outputTokens);
}

