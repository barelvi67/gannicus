/**
 * Generation engine for synthetic data
 * Handles schema analysis, dependency resolution, and data generation
 */

import type {
  Schema,
  GenerateOptions,
  GenerationResult,
  LLMProvider,
  Field,
  LLMField,
  DerivedField,
  GenerationContext,
} from '../types/index.ts';
import { validateSchema } from '../schema/index.ts';
import { createOllamaProvider } from '../providers/index.ts';
import { cache } from '../cache/index.ts';
import { generateWithBatching, flushBatches } from './batch-processor.ts';
import { estimateCost } from '../cost/index.ts';

/**
 * Generate synthetic data from schema
 *
 * @example
 * ```ts
 * const result = await generate(schema, {
 *   count: 100,
 *   provider: { name: 'ollama', model: 'phi3:mini' }
 * })
 * ```
 */
export async function generate<T extends Schema>(
  schema: T,
  options: GenerateOptions
): Promise<GenerationResult<T>> {
  const startTime = Date.now();
  const errors: GenerationResult<T>['errors'] = [];
  let retries = 0;
  let filtered = 0;

  // Call onStart hook
  if (options.hooks?.onStart) {
    await options.hooks.onStart(options);
  }

  // Validate schema
  validateSchema(schema);

  // Create provider
  const provider = createProvider(options.provider);

  // Set random seed if provided
  if (options.seed !== undefined) {
    Math.random = seededRandom(options.seed);
  }

  // Initialize stats
  let llmCallCount = 0;
  let cacheHits = 0;

  // Analyze schema and build generation plan
  const plan = buildGenerationPlan(schema);

  // Generate records
  const data: Record<string, any>[] = [];
  const advanced = options.advanced || {};
  const stopOnError = advanced.stopOnError ?? false;
  const continueOnFieldError = advanced.continueOnFieldError ?? true;

  for (let i = 0; i < options.count; i++) {
    try {
      const context: GenerationContext = {
        schema,
        generatedFields: {},
        recordIndex: i,
      };

      // Call beforeRecord hook
      if (options.hooks?.beforeRecord) {
        await options.hooks.beforeRecord(i, context);
      }

      const record: Record<string, any> = {};

      // Execute generation plan in order
      for (const fieldName of plan.order) {
        try {
          const field = schema[fieldName];
          context.generatedFields = { ...record };

          // Call beforeField hook
          if (options.hooks?.beforeField) {
            await options.hooks.beforeField(fieldName, field, context);
          }

          let value: any;

          // Generate field value
          switch (field.type) {
            case 'static':
              value = field.value;
              break;

            case 'number':
              value = generateNumber(field);
              break;

            case 'enum':
              value = generateEnum(field);
              break;

            case 'llm':
              const cacheBefore = cache.getStats();
              value = await generateLLMWithRetry(
                field,
                provider,
                record,
                options.provider.model || 'default',
                i, // Record index for cache variation
                advanced.maxRetries ?? 0,
                advanced.timeout,
                options.batchSize !== undefined, // Use batching if batchSize specified
                true // useCache
              );
              const cacheAfter = cache.getStats();
              if (cacheAfter.totalHits > cacheBefore.totalHits) {
                cacheHits++;
              }
              llmCallCount++;
              break;

            case 'derived':
              value = generateDerived(field, record);
              break;
          }

          // Call afterField hook
          if (options.hooks?.afterField) {
            value = await options.hooks.afterField(fieldName, value, field, context);
          }

          // Transform field if transformation provided
          if (options.transformations?.transformField) {
            value = await options.transformations.transformField(fieldName, value, record);
          }

          // Validate field if validation provided
          if (options.validations?.validateField) {
            try {
              const isValid = await options.validations.validateField(fieldName, value, record);
              if (isValid === false) {
                throw new Error(`Field ${fieldName} failed validation`);
              }
            } catch (error) {
              if (stopOnError) throw error;
              if (options.hooks?.onError) {
                await options.hooks.onError(error as Error, { ...context, fieldName });
              }
              if (!continueOnFieldError) {
                throw error;
              }
              errors.push({
                recordIndex: i,
                fieldName,
                error: error as Error,
                timestamp: Date.now(),
              });
              continue;
            }
          }

          record[fieldName] = value;
        } catch (error) {
          const err = error as Error;
          if (stopOnError) throw err;
          
          if (options.hooks?.onError) {
            await options.hooks.onError(err, { ...context, fieldName });
          }
          
          if (advanced.errorHandler) {
            try {
              record[fieldName] = await advanced.errorHandler(err, { ...context, fieldName });
            } catch {
              if (!continueOnFieldError) throw err;
              errors.push({
                recordIndex: i,
                fieldName,
                error: err,
                timestamp: Date.now(),
              });
            }
          } else {
            if (!continueOnFieldError) throw err;
            errors.push({
              recordIndex: i,
              fieldName,
              error: err,
              timestamp: Date.now(),
            });
          }
        }
      }

      // Transform record if transformation provided
      let finalRecord = record;
      if (options.transformations?.transformRecord) {
        finalRecord = await options.transformations.transformRecord(record, i);
      }

      // Validate record if validation provided
      if (options.validations?.validateRecord) {
        try {
          const isValid = await options.validations.validateRecord(finalRecord, i);
          if (isValid === false) {
            throw new Error(`Record ${i} failed validation`);
          }
        } catch (error) {
          if (stopOnError) throw error;
          if (options.hooks?.onError) {
            await options.hooks.onError(error as Error, context);
          }
          filtered++;
          continue;
        }
      }

      // Filter record if filter provided
      if (options.transformations?.filterRecord) {
        const shouldInclude = await options.transformations.filterRecord(finalRecord, i);
        if (!shouldInclude) {
          filtered++;
          continue;
        }
      }

      // Call afterRecord hook
      if (options.hooks?.afterRecord) {
        finalRecord = await options.hooks.afterRecord(finalRecord, i, context);
      }

      data.push(finalRecord);

      // Report progress
      if (options.onProgress) {
        options.onProgress(i + 1, options.count);
      }
    } catch (error) {
      if (stopOnError) throw error;
      
      const err = error as Error;
      if (options.hooks?.onError) {
        await options.hooks.onError(err, {
          schema,
          generatedFields: {},
          recordIndex: i,
        });
      }
      
      errors.push({
        recordIndex: i,
        error: err,
        timestamp: Date.now(),
      });
    }
  }

  // Flush any pending batches
  if (options.batchSize !== undefined) {
    await flushBatches(provider);
  }

  const duration = Date.now() - startTime;
  
  // Calculate cost estimate
  const llmFields = plan.order.filter(name => schema[name].type === 'llm').length;
  const costEstimate = estimateCost(
    options.provider.name,
    options.provider.model || 'default',
    data.length,
    llmFields
  );

  const result: GenerationResult<T> = {
    data: data as Record<keyof T, any>[],
    stats: {
      totalRecords: data.length,
      llmCalls: llmCallCount,
      duration,
      provider: options.provider.name,
      model: options.provider.model || 'default',
      errors: errors.length,
      retries,
      filtered,
      cacheHits,
      cacheHitRate: llmCallCount > 0 ? (cacheHits / llmCallCount) * 100 : 0,
    },
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      schema: Object.keys(schema),
      startTime,
      endTime: Date.now(),
      options: {
        count: options.count,
        seed: options.seed,
        provider: options.provider,
      },
      costEstimate,
    },
  };

  // Call onComplete hook
  if (options.hooks?.onComplete) {
    await options.hooks.onComplete(result);
  }

  return result;
}

/**
 * Build generation plan with dependency resolution
 * Returns ordered list of fields to generate
 */
function buildGenerationPlan(schema: Schema): { order: string[] } {
  const fields = Object.keys(schema);
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(fieldName: string, path: Set<string> = new Set()) {
    if (visited.has(fieldName)) return;
    if (path.has(fieldName)) {
      throw new Error(`Circular dependency detected: ${Array.from(path).join(' -> ')} -> ${fieldName}`);
    }

    const field = schema[fieldName];
    path.add(fieldName);

    // Visit dependencies first
    if (field.type === 'derived') {
      for (const dep of field.depends) {
        visit(dep, new Set(path));
      }
    }

    // Visit coherence dependencies for LLM fields
    if (field.type === 'llm' && field.coherence) {
      for (const dep of field.coherence) {
        visit(dep, new Set(path));
      }
    }

    visited.add(fieldName);
    order.push(fieldName);
  }

  // Visit all fields
  for (const fieldName of fields) {
    visit(fieldName);
  }

  return { order };
}

/**
 * Generate random number within range
 */
function generateNumber(field: Field & { type: 'number' }): number {
  const range = field.max - field.min;
  const value = Math.random() * range + field.min;

  if (field.decimals !== undefined) {
    return Number(value.toFixed(field.decimals));
  }

  return Math.floor(value);
}

/**
 * Generate random enum value with optional weights
 */
function generateEnum(field: Field & { type: 'enum' }): string {
  const options = field.options;

  // Simple equal probability
  if (typeof options[0] === 'string') {
    const idx = Math.floor(Math.random() * options.length);
    return options[idx] as string;
  }

  // Weighted selection
  const totalWeight = options.reduce((sum, opt) => {
    return sum + (typeof opt === 'object' ? opt.weight || 1 : 1);
  }, 0);

  let random = Math.random() * totalWeight;

  for (const opt of options) {
    const weight = typeof opt === 'object' ? opt.weight || 1 : 1;
    if (random < weight) {
      return typeof opt === 'string' ? opt : opt.value;
    }
    random -= weight;
  }

  // Fallback (shouldn't reach here)
  return typeof options[0] === 'string' ? options[0] : options[0].value;
}

/**
 * Generate LLM value with optional coherence and retry logic
 */
async function generateLLMWithRetry(
  field: LLMField,
  provider: LLMProvider,
  record: Record<string, any>,
  model: string,
  recordIndex: number,
  maxRetries: number = 0,
  timeout?: number,
  useBatching: boolean = false,
  useCache: boolean = true
): Promise<string> {
  // Build context from coherence fields
  let context: Record<string, any> | undefined;

  if (field.coherence && field.coherence.length > 0) {
    context = {};
    for (const dep of field.coherence) {
      if (record[dep] !== undefined) {
        context[dep] = record[dep];
      }
    }
  }

  // Add record index to context for cache variation (ensures unique values)
  // Only add if no coherence context exists, or if we want to force variation
  if (!context) {
    context = { _recordIndex: recordIndex };
  } else {
    context._recordIndex = recordIndex;
  }

  // Try cache first
  if (useCache) {
    const cached = cache.get(provider.name, model, field.prompt, context);
    if (cached) {
      return cached;
    }
  }

  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let result: string;
      
      // Build prompt with variation instruction for better diversity
      const variationPrompt = field.prompt.includes('different') || field.prompt.includes('unique')
        ? field.prompt
        : `${field.prompt}. Make it unique and different from previous generations.`;

      if (useBatching) {
        result = await generateWithBatching(provider, variationPrompt, context, field.prompt, true);
      } else {
        if (timeout) {
          result = await Promise.race([
            provider.generate(field.prompt, context),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
            ),
          ]);
        } else {
          result = await provider.generate(variationPrompt, context);
        }
      }

      // Cache result (with record index in context for uniqueness)
      if (useCache) {
        cache.set(provider.name, model, field.prompt, result, context);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate LLM value');
}

/**
 * Generate derived value from computation
 */
function generateDerived(field: DerivedField, record: Record<string, any>): any {
  return field.compute(record);
}

/**
 * Create provider instance from config
 */
function createProvider(config: GenerateOptions['provider']): LLMProvider {
  switch (config.name) {
    case 'ollama':
      return createOllamaProvider(config);
    default:
      throw new Error(`Provider "${config.name}" not supported in v0.1`);
  }
}

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
