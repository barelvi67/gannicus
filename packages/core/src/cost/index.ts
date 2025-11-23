/**
 * Cost Calculator
 * 
 * Estimates costs for different providers based on token usage
 * Critical for production planning (RFC requirement)
 */

export interface CostEstimate {
  provider: string;
  model: string;
  records: number;
  llmFields: number;
  tokensPerRecord: number;
  totalTokens: number;
  cost: number;
  estimatedTime: number; // seconds
  recordsPerSecond: number;
}

export interface ProviderPricing {
  tokensPerSecond: number;
  costPerMillionTokens: number;
  name: string;
}

// Provider pricing (as of 2025)
const PRICING: Record<string, ProviderPricing> = {
  'ollama': {
    tokensPerSecond: 40, // Conservative estimate
    costPerMillionTokens: 0,
    name: 'Ollama (Local)',
  },
  'groq': {
    tokensPerSecond: 500, // Conservative estimate (can be 800+)
    costPerMillionTokens: 0.27, // $0.27 per 1M tokens
    name: 'Groq',
  },
  'openai': {
    tokensPerSecond: 100, // Conservative estimate
    costPerMillionTokens: 0.60, // GPT-4o-mini output
    name: 'OpenAI',
  },
  'anthropic': {
    tokensPerSecond: 80,
    costPerMillionTokens: 3.00, // Claude Sonnet 4
    name: 'Anthropic',
  },
};

/**
 * Estimate cost for generation
 */
export function estimateCost(
  provider: string,
  model: string,
  records: number,
  llmFields: number,
  tokensPerRecord: number = 50 // Average tokens per LLM field
): CostEstimate {
  const pricing = PRICING[provider] || PRICING['ollama'];
  const totalTokens = records * llmFields * tokensPerRecord;
  const cost = (totalTokens / 1_000_000) * pricing.costPerMillionTokens;
  const estimatedTime = totalTokens / pricing.tokensPerSecond;
  const recordsPerSecond = records / estimatedTime;

  return {
    provider,
    model,
    records,
    llmFields,
    tokensPerRecord,
    totalTokens,
    cost,
    estimatedTime,
    recordsPerSecond,
  };
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const timeStr = estimate.estimatedTime < 60
    ? `${estimate.estimatedTime.toFixed(1)}s`
    : estimate.estimatedTime < 3600
    ? `${(estimate.estimatedTime / 60).toFixed(1)}min`
    : `${(estimate.estimatedTime / 3600).toFixed(1)}hrs`;

  const costStr = estimate.cost === 0
    ? '$0.00'
    : estimate.cost < 0.01
    ? '<$0.01'
    : `$${estimate.cost.toFixed(2)}`;

  return `${estimate.records.toLocaleString()} records: ${timeStr} | ${costStr} | ${estimate.recordsPerSecond.toFixed(1)} rec/s`;
}

/**
 * Compare costs across providers
 */
export function compareProviders(
  records: number,
  llmFields: number,
  tokensPerRecord: number = 50
): CostEstimate[] {
  return Object.keys(PRICING).map(provider => {
    const model = provider === 'groq' ? 'llama3.1:70b' : provider === 'openai' ? 'gpt-4o-mini' : 'default';
    return estimateCost(provider, model, records, llmFields, tokensPerRecord);
  }).sort((a, b) => a.cost - b.cost || a.estimatedTime - b.estimatedTime);
}

