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
  name: 'ollama' | 'sglang' | 'mlx' | 'vllm' | 'groq' | 'openai' | 'anthropic';
  model?: string;
  baseURL?: string;
  apiKey?: string;
  options?: Record<string, any>;
}

/**
 * Hooks for customizing generation behavior
 */
export interface GenerationHooks {
  /** Called before generating a record */
  beforeRecord?: (index: number, context: GenerationContext) => void | Promise<void>;
  
  /** Called after generating a record */
  afterRecord?: (record: Record<string, any>, index: number, context: GenerationContext) => Record<string, any> | Promise<Record<string, any>>;
  
  /** Called before generating a field */
  beforeField?: (fieldName: string, field: Field, context: GenerationContext) => void | Promise<void>;
  
  /** Called after generating a field */
  afterField?: (fieldName: string, value: any, field: Field, context: GenerationContext) => any | Promise<any>;
  
  /** Called when an error occurs during generation */
  onError?: (error: Error, context: GenerationContext & { fieldName?: string }) => void | Promise<void>;
  
  /** Called when generation starts */
  onStart?: (options: GenerateOptions) => void | Promise<void>;
  
  /** Called when generation completes */
  onComplete?: (result: GenerationResult<any>) => void | Promise<void>;
}

/**
 * Transformation functions for post-processing
 */
export interface Transformations {
  /** Transform entire record after generation */
  transformRecord?: (record: Record<string, any>, index: number) => Record<string, any> | Promise<Record<string, any>>;
  
  /** Transform specific field value */
  transformField?: (fieldName: string, value: any, record: Record<string, any>) => any | Promise<any>;
  
  /** Filter records - return false to exclude */
  filterRecord?: (record: Record<string, any>, index: number) => boolean | Promise<boolean>;
}

/**
 * Validation functions
 */
export interface Validations {
  /** Validate entire record - throw or return false to reject */
  validateRecord?: (record: Record<string, any>, index: number) => boolean | Promise<boolean> | void | Promise<void>;
  
  /** Validate specific field value - throw or return false to reject */
  validateField?: (fieldName: string, value: any, record: Record<string, any>) => boolean | Promise<boolean> | void | Promise<void>;
}

/**
 * Advanced generation options
 */
export interface AdvancedOptions {
  /** Maximum retries for failed LLM calls */
  maxRetries?: number;
  
  /** Timeout for LLM calls in milliseconds */
  timeout?: number;
  
  /** Concurrency limit for parallel LLM calls */
  concurrency?: number;
  
  /** Stop generation on first error (default: false, continues) */
  stopOnError?: boolean;
  
  /** Continue generation even if some fields fail (default: true) */
  continueOnFieldError?: boolean;
  
  /** Custom error handler */
  errorHandler?: (error: Error, context: any) => any | Promise<any>;
}

/**
 * Generation options - Extremely configurable and programmatic
 */
export interface GenerateOptions {
  /** Number of records to generate */
  count: number;
  
  /** LLM provider configuration */
  provider: ProviderConfig;
  
  /** Random seed for reproducibility */
  seed?: number;
  
  /** Batch size for LLM calls (default: 1, sequential) */
  batchSize?: number;
  
  /** Progress callback */
  onProgress?: (progress: number, total: number) => void;
  
  /** Hooks for customizing generation behavior */
  hooks?: GenerationHooks;
  
  /** Transformations for post-processing */
  transformations?: Transformations;
  
  /** Validations for data quality */
  validations?: Validations;
  
  /** Advanced options */
  advanced?: AdvancedOptions;
}

/**
 * Generation statistics
 */
export interface GenerationStats {
  totalRecords: number;
  llmCalls: number;
  duration: number; // milliseconds
  provider: string;
  model: string;
  errors?: number;
  retries?: number;
  filtered?: number;
  cacheHits?: number;
  cacheHitRate?: number;
}

/**
 * Generation result - Rich metadata for programmatic use
 */
export interface GenerationResult<T extends Schema> {
  /** Generated records */
  data: Record<keyof T, any>[];
  
  /** Generation statistics */
  stats: GenerationStats;
  
  /** Errors encountered during generation (if any) */
  errors?: Array<{
    recordIndex?: number;
    fieldName?: string;
    error: Error;
    timestamp: number;
  }>;
  
  /** Metadata about the generation run */
  metadata?: {
    schema: string[]; // Field names
    startTime: number;
    endTime: number;
    options: Partial<GenerateOptions>;
    costEstimate?: {
      cost: number;
      totalTokens: number;
      estimatedTime: number;
      recordsPerSecond: number;
    };
  };
}
