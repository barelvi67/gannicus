/**
 * @gannicus/core
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

// Providers
export { OllamaProvider, createOllamaProvider } from './providers/index.ts';
export type { OllamaProviderConfig } from './providers/index.ts';

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
} from './types/index.ts';
