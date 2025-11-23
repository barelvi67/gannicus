/**
 * vLLM Provider for Linux/CUDA
 * 
 * High-performance LLM inference runtime
 * Requires: Linux, CUDA/NVIDIA GPU
 * 
 * Performance: 120-160 req/sec, 50-80ms TTFT
 * Perfect for: Production workloads on Linux servers with NVIDIA GPUs
 * 
 * Setup: pip install vllm
 * Server: python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen2.5-7B-Instruct --port 8000
 * 
 * Note: vLLM requires CUDA and Linux. Will not work on macOS or Windows (without WSL2).
 */

import type { LLMProvider, ProviderConfig } from '../types/index.ts';

export interface VLLMProviderConfig {
  /** Model name (e.g., 'Qwen/Qwen2.5-7B-Instruct') */
  model: string;
  /** vLLM server endpoint (default: http://localhost:8000) */
  endpoint?: string;
  /** API key (optional, usually not required for self-hosted) */
  apiKey?: string;
  /** Temperature for generation (default: 0.7) */
  temperature?: number;
  /** Enable structured output (JSON mode) - default: true */
  structuredOutput?: boolean;
}

/**
 * vLLM provider implementation
 * Uses OpenAI-compatible API for high-performance inference
 */
export class VLLMProvider implements LLMProvider {
  name = 'vllm';
  private model: string;
  private endpoint: string;
  private apiKey?: string;
  private temperature: number;
  private structuredOutput: boolean;

  constructor(config: VLLMProviderConfig) {
    if (!config.model) {
      throw new Error('vLLM provider requires a model name');
    }

    this.model = config.model;
    this.endpoint = config.endpoint || 'http://localhost:8000';
    this.apiKey = config.apiKey;
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

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const body: Record<string, any> = {
      model: this.model,
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: this.temperature,
    };

    // vLLM supports structured outputs natively
    if (this.structuredOutput) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
      throw new Error(`vLLM API error: ${response.status} - ${errorMessage}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('vLLM API returned empty response');
    }

    return this.extractValue(content);
  }

  /**
   * Generate batch of values from prompts
   * vLLM supports native batching for excellent performance
   */
  async generateBatch(prompts: string[], context?: Record<string, any>): Promise<string[]> {
    // vLLM can handle high concurrency
    const batchSize = 50; // vLLM handles batching natively
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
   * Check if vLLM server is running and accessible
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `vLLM server returned ${response.status}`,
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data || [];
      const hasModel = models.some((m) => 
        m.id === this.model || 
        m.id.includes(this.model) ||
        m.id.toLowerCase().includes(this.model.toLowerCase().split('/').pop() || '')
      );

      if (!hasModel && models.length > 0) {
        return {
          ok: false,
          message: `Model "${this.model}" not found. Available models: ${models.map((m) => m.id).join(', ') || 'none'}`,
        };
      }

      if (models.length === 0) {
        return {
          ok: false,
          message: 'vLLM server responding but no models loaded',
        };
      }

      return { ok: true, message: 'vLLM ready' };
    } catch (error) {
      const platform = process.platform;
      if (platform === 'darwin') {
        return {
          ok: false,
          message: 'vLLM requires Linux/CUDA (not available on macOS). Use MLX for Apple Silicon.',
        };
      } else if (platform === 'win32') {
        return {
          ok: false,
          message: 'vLLM requires Linux/CUDA. Use WSL2 for Windows support.',
        };
      }
      return {
        ok: false,
        message: `Cannot connect to vLLM at ${this.endpoint}. Is it running? Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }
}

/**
 * Create vLLM provider from config
 */
export function createVLLMProvider(config: ProviderConfig): VLLMProvider {
  if (!config.model) {
    throw new Error('vLLM provider requires a model name');
  }

  return new VLLMProvider({
    model: config.model,
    endpoint: config.baseURL,
    apiKey: config.apiKey,
    temperature: config.options?.temperature,
    structuredOutput: config.options?.structuredOutput,
  });
}

