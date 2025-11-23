/**
 * gannicus-core
 * LLM-powered synthetic data generation for TypeScript
 */

// Schema builders
export {
  llm,
  staticValue,
  number,
  enumField,
  derived,
  defineSchema,
  validateSchema,
} from './schema/index.ts';

// Generation engine
export { generate } from './generator/index.ts';
export { generateFast, clearCache, getCacheStats } from './generator/fast-mode.ts';

// Cache system
export { cache, clearCache as clearGlobalCache, getCacheStats as getGlobalCacheStats } from './cache/index.ts';

// Cost calculator
export { estimateCost, formatCostEstimate, compareProviders } from './cost/index.ts';
export type { CostEstimate } from './cost/index.ts';

// Providers
export { OllamaProvider, createOllamaProvider } from './providers/index.ts';
export type { OllamaProviderConfig } from './providers/index.ts';

// Model recommendations
export {
  getRecommendedModels,
  getModelById,
  getModelForUseCase,
  getDefaultModel,
  getModelsByUseCase,
  getModelsByPriority,
  isRecommended,
  getRecommendations,
} from './models/index.ts';
export type { RecommendedModel, ModelSize, ModelPerformance, ModelTemperature } from './models/index.ts';

// Types
export type {
  FieldType,
  BaseField,
  LLMField,
  StaticField,
  NumberField,
  EnumField,
  DerivedField,
  Field,
  Schema,
  GenerationContext,
  LLMProvider,
  ProviderConfig,
  GenerateOptions,
  GenerationResult,
  GenerationStats,
  GenerationHooks,
  Transformations,
  Validations,
  AdvancedOptions,
} from './types/index.ts';
