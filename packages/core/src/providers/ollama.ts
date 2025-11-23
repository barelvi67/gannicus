/**
 * Ollama provider for local LLM inference
 * Uses recommended models configuration for optimal performance
 * Default model: qwen2.5:7b (best for production/Faker replacement)
 */

import type { LLMProvider, ProviderConfig } from '../types/index.ts';
import { getDefaultModel, getModelById, getModelForUseCase, type RecommendedModel } from '../models/index.ts';

export interface OllamaProviderConfig {
  /** Model name (e.g., 'qwen2.5:7b'). If not provided, uses recommended default */
  model?: string;
  /** Ollama server URL */
  baseURL?: string; // Default: http://localhost:11434
  /** Temperature for generation. If not provided, uses recommended value for the model */
  temperature?: number;
  /** Enable streaming responses */
  stream?: boolean; // Default: false
  /** Additional Ollama API options */
  options?: Record<string, any>;
  /** Auto-select model by use case: 'development' (fastest), 'production' (best quality), 'fastest', 'bestQuality' */
  useCase?: 'development' | 'production' | 'fastest' | 'bestQuality';
}

/**
 * Ollama provider implementation
 * Uses local Ollama instance for zero-cost generation
 */
export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private model: string;
  private baseURL: string;
  private temperature: number;

  constructor(config: OllamaProviderConfig = {}) {
    // Determine model and temperature from config or recommendations
    let recommendedModel: RecommendedModel | undefined;
    
    if (config.useCase) {
      recommendedModel = getModelForUseCase(config.useCase);
    } else if (config.model) {
      recommendedModel = getModelById(config.model);
    } else {
      recommendedModel = getDefaultModel();
    }
    
    this.model = config.model || recommendedModel.id;
    this.baseURL = config.baseURL || 'http://localhost:11434';
    // For development, use higher temperature for more variation
    // For production, use recommended temperature for consistency
    const baseTemp = config.temperature ?? (recommendedModel?.temperature?.recommended ?? 0.7);
    this.temperature = config.useCase === 'development' 
      ? Math.max(baseTemp, 0.5) // Minimum 0.5 for development (more variation)
      : baseTemp;
  }

  /**
   * Generate single value from prompt
   */
  async generate(prompt: string, context?: Record<string, any>): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, context);

    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: this.temperature,
          num_predict: 100, // Limit response length
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { response: string };
    return this.extractValue(data.response);
  }

  /**
   * Generate batch of values from prompts
   * Ollama doesn't have native batching, so we parallelize requests
   */
  async generateBatch(prompts: string[], context?: Record<string, any>): Promise<string[]> {
    // Ollama doesn't support true batching, but we can parallelize
    const batchSize = 5; // Conservative parallel limit
    const results: string[] = [];

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((prompt) => this.generate(prompt, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build full prompt with context for coherence
   */
  private buildPrompt(basePrompt: string, context?: Record<string, any>): string {
    if (!context || Object.keys(context).length === 0) {
      return this.wrapPrompt(basePrompt);
    }

    // Include context for coherence
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return this.wrapPrompt(`Given the following context:\n${contextStr}\n\nGenerate: ${basePrompt}`);
  }

  /**
   * Wrap prompt with instructions for concise output
   */
  private wrapPrompt(prompt: string): string {
    return `${prompt}

IMPORTANT: Respond with ONLY the requested value. No explanation, no quotes, no extra text. Just the value itself.`;
  }

  /**
   * Extract clean value from LLM response
   * Removes quotes, explanations, and extra whitespace
   */
  private extractValue(response: string): string {
    let cleaned = response.trim();

    // Remove common LLM chattiness
    cleaned = cleaned.replace(/^(Here is|Here's|The answer is|Result:)\s*/i, '');
    cleaned = cleaned.replace(/[.!?]$/, ''); // Remove trailing punctuation

    // Remove wrapping quotes if present
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // Take first line if multiline
    if (cleaned.includes('\n')) {
      cleaned = cleaned.split('\n')[0];
    }

    return cleaned.trim();
  }

  /**
   * Check if Ollama is running and model is available
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) {
        return {
          ok: false,
          message: `Ollama server returned ${response.status}`,
        };
      }

      // Check if model is pulled
      const data = (await response.json()) as { models?: { name: string }[] };
      const models = data.models || [];
      const hasModel = models.some((m) => m.name.includes(this.model.split(':')[0]));

      if (!hasModel) {
        return {
          ok: false,
          message: `Model "${this.model}" not found. Run: ollama pull ${this.model}`,
        };
      }

      return { ok: true, message: 'Ollama ready' };
    } catch (error) {
      return {
        ok: false,
        message: `Cannot connect to Ollama at ${this.baseURL}. Is it running?`,
      };
    }
  }
}

/**
 * Create Ollama provider from config
 */
export function createOllamaProvider(config: ProviderConfig): OllamaProvider {
  return new OllamaProvider({
    model: config.model,
    baseURL: config.baseURL,
    options: config.options,
  });
}
