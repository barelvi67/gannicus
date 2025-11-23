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
} from '../types/index.ts';
import { validateSchema } from '../schema/index.ts';
import { createOllamaProvider } from '../providers/index.ts';

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

  // Analyze schema and build generation plan
  const plan = buildGenerationPlan(schema);

  // Generate records
  const data: Record<string, any>[] = [];

  for (let i = 0; i < options.count; i++) {
    const record: Record<string, any> = {};

    // Report progress
    if (options.onProgress) {
      options.onProgress(i + 1, options.count);
    }

    // Execute generation plan in order
    for (const fieldName of plan.order) {
      const field = schema[fieldName];

      switch (field.type) {
        case 'static':
          record[fieldName] = field.value;
          break;

        case 'number':
          record[fieldName] = generateNumber(field);
          break;

        case 'enum':
          record[fieldName] = generateEnum(field);
          break;

        case 'llm':
          record[fieldName] = await generateLLM(field, provider, record);
          llmCallCount++;
          break;

        case 'derived':
          record[fieldName] = generateDerived(field, record);
          break;
      }
    }

    data.push(record);
  }

  const duration = Date.now() - startTime;

  return {
    data: data as Record<keyof T, any>[],
    stats: {
      totalRecords: options.count,
      llmCalls: llmCallCount,
      duration,
      provider: options.provider.name,
      model: options.provider.model || 'default',
    },
  };
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
 * Generate LLM value with optional coherence
 */
async function generateLLM(
  field: LLMField,
  provider: LLMProvider,
  record: Record<string, any>
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

  return await provider.generate(field.prompt, context);
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
