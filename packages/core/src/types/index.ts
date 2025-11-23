/**
 * Core types for Gannicus synthetic data generation
 */

/**
 * Supported field types for schema definition
 */
export type FieldType = 'llm' | 'static' | 'number' | 'enum' | 'derived';

/**
 * Base field configuration
 */
export interface BaseField {
  type: FieldType;
  description?: string;
}

/**
 * LLM-generated field
 * Uses LLM provider to generate realistic, context-aware values
 */
export interface LLMField extends BaseField {
  type: 'llm';
  prompt: string;
  coherence?: string[]; // Field names this field should be coherent with
  examples?: string[]; // Example outputs to guide the LLM
}

/**
 * Static value field
 * Always returns the same value
 */
export interface StaticField extends BaseField {
  type: 'static';
  value: any;
}

/**
 * Number field with range
 * Generates random numbers within min/max bounds
 */
export interface NumberField extends BaseField {
  type: 'number';
  min: number;
  max: number;
  decimals?: number; // Number of decimal places (default: 0)
}

/**
 * Enum field with optional weights
 * Selects random value from predefined options
 */
export interface EnumField extends BaseField {
  type: 'enum';
  options: string[] | { value: string; weight?: number }[];
}

/**
 * Derived field computed from other fields
 * Executed after dependencies are generated
 */
export interface DerivedField extends BaseField {
  type: 'derived';
  depends: string[]; // Field names this field depends on
  compute: (context: Record<string, any>) => any;
}

/**
 * Union of all field types
 */
export type Field = LLMField | StaticField | NumberField | EnumField | DerivedField;

/**
 * Schema definition maps field names to field configs
 */
export type Schema = Record<string, Field>;

/**
 * Generation context for a single record
 */
export interface GenerationContext {
  schema: Schema;
  generatedFields: Record<string, any>;
  recordIndex: number;
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  name: string;
  generate(prompt: string, context?: Record<string, any>): Promise<string>;
  generateBatch?(prompts: string[], context?: Record<string, any>): Promise<string[]>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: 'ollama' | 'groq' | 'openai' | 'anthropic';
  model?: string;
  baseURL?: string;
  apiKey?: string;
  options?: Record<string, any>;
}

/**
 * Generation options
 */
export interface GenerateOptions {
  count: number; // Number of records to generate
  provider: ProviderConfig;
  seed?: number; // Random seed for reproducibility
  batchSize?: number; // Batch size for LLM calls (default: 10)
  onProgress?: (progress: number, total: number) => void;
}

/**
 * Generation result
 */
export interface GenerationResult<T extends Schema> {
  data: Record<keyof T, any>[];
  stats: {
    totalRecords: number;
    llmCalls: number;
    duration: number; // milliseconds
    provider: string;
    model: string;
  };
}
