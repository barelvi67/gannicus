/**
 * Fast Mode for Development
 * 
 * Optimized generation mode that prioritizes speed over quality
 * Uses intelligent caching, batching, and smallest models for rapid iteration
 * 
 * RFC-aligned: Designed for development where speed > quality
 */

import type { Schema, GenerateOptions } from '../types/index.ts';
import { generate } from './index.ts';
import { getModelForUseCase } from '../models/index.ts';
import { cache, getCacheStats as getCacheStatsInternal } from '../cache/index.ts';
import { batchProcessor } from './batch-processor.ts';

/**
 * Fast generation mode for development
 * - Uses smallest/fastest model (llama3.2:3b)
 * - Aggressive caching enabled
 * - Batching enabled (batchSize: 10)
 * - Optimized for speed over quality
 */
export async function generateFast<T extends Schema>(
  schema: T,
  options: Omit<GenerateOptions, 'provider' | 'batchSize'> & {
    provider?: GenerateOptions['provider'];
    useCache?: boolean;
    useBatching?: boolean;
  }
) {
  const fastModel = getModelForUseCase('development');
  
  // Configure batch processor for fast mode
  if (options.useBatching !== false) {
    batchProcessor.configure(10, 50); // Small batches, fast flush
  }

  const result = await generate(schema, {
    ...options,
    batchSize: options.useBatching !== false ? 10 : undefined,
    provider: options.provider || {
      name: 'ollama',
      model: fastModel.id,
    },
  });

  return result;
}

/**
 * Clear the development cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return getCacheStatsInternal();
}


