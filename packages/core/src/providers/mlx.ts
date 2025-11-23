/**
 * MLX Provider for Apple Silicon (M1/M2/M3/M4)
 * 
 * Optimized for macOS with Metal acceleration
 * Uses MLX framework - Apple's native ML framework for Apple Silicon
 * 
 * Performance: Significantly faster than Ollama on Apple Silicon
 * Perfect for: macOS production workloads, leveraging M4 Pro GPU
 * 
 * Setup: pip install mlx-lm
 * Server: python -m mlx_lm.server --model mlx-community/Llama-3.2-3B-Instruct
 * 
 * Valid models: mlx-community/Llama-3.2-3B-Instruct, mlx-community/QwQ-32B-Preview, etc.
 */

import type { LLMProvider, ProviderConfig } from '../types/index.ts';

export interface MLXProviderConfig {
  /** Model name (e.g., 'mlx-community/QwQ-32B-Preview' or 'mlx-community/Llama-3.2-3B-Instruct') */
  model: string;
  /** MLX server endpoint (default: http://localhost:8080) */
  endpoint?: string;
  /** Temperature for generation (default: 0.7) */
  temperature?: number;
  /** Enable structured output (JSON mode) - default: true */
  structuredOutput?: boolean;
}

/**
 * MLX provider implementation
 * Uses OpenAI-compatible API for Apple Silicon-optimized inference
 */
export class MLXProvider implements LLMProvider {
  name = 'mlx';
  private model: string;
  private endpoint: string;
  private temperature: number;
  private structuredOutput: boolean;

  constructor(config: MLXProviderConfig) {
    if (!config.model) {
      throw new Error('MLX provider requires a model name');
    }

    this.model = config.model;
    this.endpoint = config.endpoint || 'http://localhost:8080';
    this.temperature = config.temperature ?? 0.7;
    this.structuredOutput = config.structuredOutput !== false; // Default: true
  }

  /**
   * Generate single value from prompt
   * Uses OpenAI-compatible chat completions API
   */
  async generate(prompt: string, context?: Record<string, any>): Promise<string> {
    const fullPrompt = this.buildPrompt(prompt, context);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const body: Record<string, any> = {
      model: this.model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: this.temperature,
    };

    // MLX supports structured outputs
    if (this.structuredOutput) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout (MLX can be slower)

    let response: Response;
    try {
      response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      const errorMessage = error.length > 200 ? error.substring(0, 200) + '...' : error;
      throw new Error(`MLX API error: ${response.status} - ${errorMessage}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('MLX API returned empty response');
    }

    return this.extractValue(content);
  }

  /**
   * Generate batch of values from prompts
   * MLX can handle high concurrency on Apple Silicon
   */
  async generateBatch(prompts: string[], context?: Record<string, any>): Promise<string[]> {
    // MLX can handle high concurrency on Apple Silicon
    const batchSize = 30; // Good balance for M4 Pro
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

    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return this.wrapPrompt(`Given the following context:\n${contextStr}\n\nGenerate: ${basePrompt}`);
  }

  /**
   * Wrap prompt with instructions for concise output
   */
  private wrapPrompt(prompt: string): string {
    if (this.structuredOutput) {
      return `${prompt}

IMPORTANT: Respond with ONLY a JSON object containing a single "value" field with the requested value. Example: {"value": "your answer here"}. No explanation, no extra text.`;
    }

    return `${prompt}

IMPORTANT: Respond with ONLY the requested value. No explanation, no quotes, no extra text. Just the value itself.`;
  }

  /**
   * Extract clean value from LLM response
   * Handles both JSON structured output and plain text
   */
  private extractValue(response: string): string {
    let cleaned = response.trim();

    // Try to parse as JSON first (structured output mode)
    if (this.structuredOutput) {
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.value !== undefined) {
          return String(parsed.value);
        }
        const firstValue = Object.values(parsed)[0];
        if (firstValue !== undefined) {
          return String(firstValue);
        }
      } catch {
        // Not JSON, continue with text extraction
      }
    }

    // Remove common LLM chattiness
    cleaned = cleaned.replace(/^(Here is|Here's|The answer is|Result:)\s*/i, '');
    cleaned = cleaned.replace(/[.!?]$/, '');

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
   * Check if MLX server is running and accessible
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `MLX server returned ${response.status}`,
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data || [];
      
      // More flexible model matching - check if any model matches or if server is responding
      const modelNameParts = this.model.split('/').pop()?.toLowerCase() || '';
      const hasModel = models.length > 0 && (
        models.some((m) => 
          m.id === this.model || 
          m.id.includes(this.model) ||
          m.id.toLowerCase().includes(modelNameParts)
        ) || models.length === 1 // If only one model, assume it's the one we want
      );

      if (!hasModel && models.length > 0) {
        // Server is running but model name doesn't match exactly - still OK
        console.log(`  ⚠️  Model name mismatch, but server is running. Available: ${models.map((m) => m.id).join(', ')}`);
        // Continue anyway - server is working
      }

      return { ok: true, message: 'MLX ready' };
    } catch (error) {
      return {
        ok: false,
        message: `Cannot connect to MLX at ${this.endpoint}. Is it running? Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }
}

/**
 * Create MLX provider from config
 */
export function createMLXProvider(config: ProviderConfig): MLXProvider {
  if (!config.model) {
    throw new Error('MLX provider requires a model name');
  }

  return new MLXProvider({
    model: config.model,
    endpoint: config.baseURL,
    temperature: config.options?.temperature,
    structuredOutput: config.options?.structuredOutput,
  });
}

