/**
 * Recommended models configuration and utilities
 * Provides metadata-rich information about recommended LLM models
 * for Gannicus - A modern Faker replacement powered by LLMs
 */

import recommendedModels from './recommended.json';

export interface ModelSize {
  parameters: string;
  diskSize: string;
  ramRequired: string;
}

export interface ModelPerformance {
  benchmarkScore: number;
  averageLatency: number;
  successRate: number;
  lastBenchmarkDate: string;
}

export interface ModelTemperature {
  recommended: number;
  range: [number, number];
}

export interface RecommendedModel {
  id: string;
  name: string;
  family: string;
  size: ModelSize;
  performance: ModelPerformance;
  useCases: string[];
  recommendedFor: string[];
  strengths: string[];
  limitations: string[];
  temperature: ModelTemperature;
  status: 'recommended' | 'deprecated' | 'experimental';
  priority: number;
  isDefault?: boolean;
}

export interface ModelsConfig {
  version: string;
  lastUpdated: string;
  description: string;
  models: RecommendedModel[];
  recommendations: {
    default: string;
    development: string;
    production: string;
    fastest: string;
    bestQuality: string;
  };
  benchmark: {
    testCases: Array<{
      id: string;
      description: string;
      example: string;
    }>;
    criteria: Record<string, string>;
  };
  notes: string[];
}

const config = recommendedModels as ModelsConfig;

/**
 * Get all recommended models
 */
export function getRecommendedModels(): RecommendedModel[] {
  return config.models;
}

/**
 * Get a specific model by ID
 */
export function getModelById(id: string): RecommendedModel | undefined {
  return config.models.find(m => m.id === id);
}

/**
 * Get the default recommended model
 */
export function getDefaultModel(): RecommendedModel {
  const defaultId = config.recommendations.default;
  const model = getModelById(defaultId);
  if (!model) {
    throw new Error(`Default model ${defaultId} not found in recommendations`);
  }
  return model;
}

/**
 * Get recommended model for a specific use case
 */
export function getModelForUseCase(useCase: 'development' | 'production' | 'fastest' | 'bestQuality'): RecommendedModel {
  const modelId = config.recommendations[useCase];
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model for use case ${useCase} (${modelId}) not found`);
  }
  return model;
}

/**
 * Get models by use case
 */
export function getModelsByUseCase(useCase: string): RecommendedModel[] {
  return config.models.filter(m => m.useCases.includes(useCase));
}

/**
 * Get models sorted by priority
 */
export function getModelsByPriority(): RecommendedModel[] {
  return [...config.models].sort((a, b) => a.priority - b.priority);
}

/**
 * Get model recommendations summary
 */
export function getRecommendations() {
  return {
    default: getModelById(config.recommendations.default)!,
    development: getModelById(config.recommendations.development)!,
    production: getModelById(config.recommendations.production)!,
    fastest: getModelById(config.recommendations.fastest)!,
    bestQuality: getModelById(config.recommendations.bestQuality)!,
  };
}

/**
 * Check if a model is recommended
 */
export function isRecommended(modelId: string): boolean {
  return config.models.some(m => m.id === modelId && m.status === 'recommended');
}

/**
 * Get benchmark information
 */
export function getBenchmarkInfo() {
  return config.benchmark;
}

export default config;

