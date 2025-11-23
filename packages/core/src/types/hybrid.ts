/**
 * Type definitions for hybrid generation strategies
 * 
 * These types define the API for cost-effective generation of massive datasets
 * (1M+ records) while maintaining realistic variety and coherence.
 * 
 * @module hybrid
 */

import type { Schema, ProviderConfig } from './index.ts';

/**
 * Seed + Expand Strategy
 * 
 * Generate high-quality seeds with LLM, then expand to target volume
 * using deterministic mutations.
 */
export interface SeedExpandOptions {
  seed: {
    schema: Schema;
    count: number;           // LLM-generated seeds (e.g., 1000)
    provider: ProviderConfig; // High-quality provider (Groq, OpenAI)
  };
  expand: {
    target: number;          // Target total records (e.g., 1_000_000)
    strategy: 'mutate' | 'interpolate' | 'crossover' | 'hybrid';
    variance: number;        // 0.0-1.0, how much variation (0.3 = 30%)
    preserveCoherence: boolean; // Maintain field relationships
  };
}

/**
 * Mutation rule for a specific field
 */
export interface MutationRule {
  type: 'string' | 'number' | 'enum' | 'derived';
  variance: number;          // 0.0-1.0
  constraints?: {
    min?: number;
    max?: number;
    allowed?: string[];
  };
}

/**
 * Template Family for Evolution Strategy
 * 
 * A template family represents a category of records (e.g., "E-commerce workflows")
 * that share a common schema and can be evolved through mutations.
 */
export interface TemplateFamily {
  name: string;              // "E-commerce Order Processing"
  schema: Schema;            // Base schema for this family
  seedCount: number;         // LLM-generated seeds per family
  mutationRules?: {
    fields: Record<string, MutationRule>;
    coherence: string[];     // Fields that must stay coherent
  };
}

/**
 * Template Evolution Strategy
 * 
 * LLM generates template families, then evolutionary algorithms create variations.
 */
export interface TemplateEvolutionOptions {
  templates: TemplateFamily[];
  evolution: {
    generations: number;    // How many evolution cycles
    populationSize: number;  // Records per generation
    mutationRate: number;    // 0.0-1.0
    crossoverRate: number;   // 0.0-1.0
  };
  provider?: ProviderConfig; // Provider for generating template seeds
}

/**
 * Tenant Segment Definition
 * 
 * Defines a group of tenants with similar characteristics.
 */
export interface TenantSegment {
  name: string;
  count: number;                    // Number of tenants
  recordsPerTenant: number;         // Target records per tenant
  schema: Schema;                    // Schema for this segment
  seedCount: number;                 // LLM seeds per tenant
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Multi-Tenant Distribution Strategy
 * 
 * Generate realistic tenant distribution for SaaS load testing.
 */
export interface MultiTenantOptions {
  tenants: TenantSegment[];
  distribution: 'pareto' | 'uniform' | 'normal' | 'custom';
  tenantIdField?: string;            // Field name for tenant ID (default: 'tenantId')
  preserveTenantIsolation?: boolean;  // Ensure no cross-tenant relationships
  provider?: ProviderConfig;          // Provider for generating seeds
}

/**
 * Seasonal Pattern for Time-Series Distribution
 */
export interface SeasonalPattern {
  type: 'seasonal';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amplitude: number;        // 0.0-1.0, strength of variation
  phase?: number;          // Offset in radians
}

/**
 * Event-Driven Spike for Time-Series Distribution
 */
export interface EventSpike {
  date: string;            // ISO date
  multiplier: number;       // 2.0 = 2x normal volume
  duration: number;        // Days
  decay?: 'linear' | 'exponential';
}

/**
 * Growth Pattern for Time-Series Distribution
 */
export interface GrowthPattern {
  type: 'linear' | 'exponential' | 'logistic';
  startMultiplier: number; // 0.5 = start at 50% of end volume
  endMultiplier: number;   // 1.0 = end at 100% of target
}

/**
 * Time-Series Distribution Strategy
 * 
 * Distribute records across time with realistic patterns.
 */
export interface TimeSeriesOptions {
  baseSchema: Schema;
  seedCount: number;        // LLM-generated seeds
  totalRecords: number;
  timeRange: {
    start: string;          // ISO date
    end: string;            // ISO date
  };
  distribution: {
    pattern: 'uniform' | 'realistic';
    seasonal?: SeasonalPattern[];
    events?: EventSpike[];
    growth?: GrowthPattern;
  };
  timeField?: string;       // Field name for timestamp (default: 'createdAt')
  provider?: ProviderConfig; // Provider for generating seeds
}

/**
 * Combined Strategy Options
 * 
 * Combine multiple strategies for complex use cases.
 */
export interface CombinedStrategyOptions {
  seed?: SeedExpandOptions['seed'];
  templates?: TemplateFamily[];
  tenants?: TenantSegment[];
  timeSeries?: Omit<TimeSeriesOptions, 'baseSchema' | 'seedCount' | 'totalRecords'>;
  provider?: ProviderConfig;
}

/**
 * Result of hybrid generation
 */
export interface HybridGenerationResult<T extends Schema = Schema> {
  data: Record<string, any>[];
  stats: {
    totalRecords: number;
    seedRecords: number;
    expandedRecords: number;
    llmCalls: number;
    duration: number;
    costEstimate: number;
  };
  metadata: {
    strategy: string;
    seeds?: Record<string, any>[];
    templates?: TemplateFamily[];
    tenantDistribution?: Record<string, number>;
    timeDistribution?: {
      start: string;
      end: string;
      records: number;
    };
  };
}

