/**
 * Batch Processor for LLM Calls
 * 
 * Groups similar LLM requests into intelligent batches
 * Reduces roundtrips from N calls to N/batchSize calls
 * 
 * RFC Target: 1000 records with 5 LLM fields = 5000 calls → 200-500 calls with batching
 */

import type { LLMProvider } from '../types/index.ts';

interface BatchRequest {
  prompt: string;
  context?: Record<string, any>;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

interface BatchGroup {
  requests: BatchRequest[];
  fieldName?: string;
  prompt: string;
}

class BatchProcessor {
  private batches = new Map<string, BatchGroup>();
  private batchSize: number;
  private flushInterval: number;
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(batchSize: number = 10, flushInterval: number = 100) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }

  /**
   * Add request to batch
   */
  async add(
    provider: LLMProvider,
    prompt: string,
    context?: Record<string, any>,
    fieldName?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(prompt, context);
      
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, {
          requests: [],
          fieldName,
          prompt,
        });
      }

      const batch = this.batches.get(batchKey)!;
      batch.requests.push({ prompt, context, resolve, reject });

      // Flush if batch is full
      if (batch.requests.length >= this.batchSize) {
        this.flushBatch(provider, batchKey);
      } else {
        // Schedule flush if timer not set
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => {
            this.flushAll(provider);
          }, this.flushInterval);
        }
      }
    });
  }

  /**
   * Get batch key (groups similar requests)
   */
  private getBatchKey(prompt: string, context?: Record<string, any>): string {
    const contextStr = context ? JSON.stringify(context) : 'no-context';
    return `${prompt}:${contextStr}`;
  }

  /**
   * Flush a specific batch
   */
  private async flushBatch(provider: LLMProvider, batchKey: string) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.requests.length === 0) return;

    const requests = batch.requests.splice(0, this.batchSize);
    this.batches.delete(batchKey);

    // Check if provider supports batching
    if (provider.generateBatch && requests.length > 1) {
      // Use batch API
      try {
        const prompts = requests.map(r => r.prompt);
        const results = await provider.generateBatch(prompts, requests[0].context);
        
        // Resolve all requests
        requests.forEach((req, idx) => {
          req.resolve(results[idx] || '');
        });
      } catch (error) {
        // Fallback to individual calls
        requests.forEach(req => {
          provider.generate(req.prompt, req.context)
            .then(req.resolve)
            .catch(req.reject);
        });
      }
    } else {
      // Sequential fallback
      for (const req of requests) {
        try {
          const result = await provider.generate(req.prompt, req.context);
          req.resolve(result);
        } catch (error) {
          req.reject(error as Error);
        }
      }
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(provider: LLMProvider) {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const batchKeys = Array.from(this.batches.keys());
    await Promise.all(batchKeys.map(key => this.flushBatch(provider, key)));
  }

  /**
   * Configure batch size and flush interval
   */
  configure(batchSize?: number, flushInterval?: number) {
    if (batchSize !== undefined) this.batchSize = batchSize;
    if (flushInterval !== undefined) this.flushInterval = flushInterval;
  }
}

// Global batch processor instance
export const batchProcessor = new BatchProcessor();

/**
 * Process LLM generation with batching
 */
export async function generateWithBatching(
  provider: LLMProvider,
  prompt: string,
  context?: Record<string, any>,
  fieldName?: string,
  useBatching: boolean = true
): Promise<string> {
  if (!useBatching) {
    return await provider.generate(prompt, context);
  }

  return await batchProcessor.add(provider, prompt, context, fieldName);
}

/**
 * Flush all pending batches (call before completion)
 */
export async function flushBatches(provider: LLMProvider) {
  await batchProcessor.flushAll(provider);
}

