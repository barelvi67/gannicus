# Recommended Models Configuration

This directory contains the metadata-rich configuration for recommended LLM models used by Gannicus.

## Overview

Gannicus uses a data-driven approach to model selection, maintaining a JSON configuration file (`recommended.json`) that contains:

- **Model metadata**: Size, performance metrics, use cases
- **Benchmark results**: Success rates, latency, test results
- **Recommendations**: Default models for different use cases
- **Rationale**: Detailed explanations of why each model is recommended

## File Structure

### `recommended.json`

The main configuration file containing:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-01",
  "models": [...],
  "recommendations": {...},
  "benchmark": {...}
}
```

### `index.ts`

TypeScript utilities for accessing model recommendations:

- `getRecommendedModels()` - Get all recommended models
- `getDefaultModel()` - Get the default recommended model
- `getModelForUseCase()` - Get model for specific use case
- `getModelById()` - Get specific model by ID
- `getRecommendations()` - Get all recommendations summary

## Current Recommended Models

### 1. llama3.2:3b (Development)
- **Size**: 2.0 GB
- **Latency**: 888ms average
- **Use Case**: Fast development, prototyping
- **Why**: Fastest response time, lowest memory footprint, 100% success rate

### 2. qwen2.5:7b (Production - Default)
- **Size**: 4.7 GB
- **Latency**: 1441ms average
- **Use Case**: Production, synthetic data generation
- **Why**: Best speed/quality balance, 100% success rate, optimal for Faker replacement

### 3. llama3.1:8b (Production Alternative)
- **Size**: 4.9 GB
- **Latency**: 1530ms average
- **Use Case**: Production alternative
- **Why**: Proven Llama family, 100% success rate, reliable performance

## Usage

### Automatic Selection

```typescript
import { OllamaProvider } from 'gannicus';

// Uses default (qwen2.5:7b)
const provider = new OllamaProvider();

// Auto-select by use case
const devProvider = new OllamaProvider({ useCase: 'development' });
const prodProvider = new OllamaProvider({ useCase: 'production' });
```

### Manual Selection

```typescript
import { OllamaProvider } from 'gannicus';

// Use specific model
const provider = new OllamaProvider({ 
  model: 'llama3.2:3b',
  temperature: 0.1 
});
```

### Get Model Information

```typescript
import { getModelById, getRecommendations } from 'gannicus/models';

const model = getModelById('qwen2.5:7b');
console.log(model.strengths);
console.log(model.performance);

const recs = getRecommendations();
console.log(recs.default);
```

## Maintaining the Configuration

### When to Update

1. **New benchmarks**: After running `bun benchmarks/sota_comparison.ts`
2. **New models**: When better models become available
3. **Performance changes**: If model performance improves/degrades
4. **Deprecations**: When models should no longer be recommended

### How to Update

1. Run benchmarks: `bun benchmarks/sota_comparison.ts`
2. Analyze results and identify best performers
3. Update `recommended.json`:
   - Add/update model entries
   - Update performance metrics
   - Update `lastUpdated` date
   - Update recommendations if needed
4. Update `benchmarks/purge_models.ts` if needed
5. Test: `bun examples/model-recommendations.ts`

### Model Entry Template

```json
{
  "id": "model:size",
  "name": "Model Name Size",
  "family": "model-family",
  "size": {
    "parameters": "7B",
    "diskSize": "4.7 GB",
    "ramRequired": "~8-12 GB"
  },
  "performance": {
    "benchmarkScore": 100,
    "averageLatency": 1441,
    "successRate": 1.0,
    "lastBenchmarkDate": "2025-12-01"
  },
  "useCases": ["production", "data-generation"],
  "recommendedFor": ["Production environments", "..."],
  "strengths": ["100% success rate", "..."],
  "limitations": ["Slightly slower than...", "..."],
  "temperature": {
    "recommended": 0.1,
    "range": [0.0, 0.3]
  },
  "status": "recommended",
  "priority": 2,
  "isDefault": true
}
```

## Benchmark Criteria

Models are evaluated on:

1. **Success Rate**: Percentage of tests passed (target: 100%)
2. **Latency**: Average response time (lower is better)
3. **Format Compliance**: Ability to follow strict format requirements
4. **JSON Generation**: Quality of JSON output
5. **Resource Usage**: RAM and disk requirements

## Philosophy

This system replaces hardcoded model selections with:

- **Data-driven decisions**: Based on actual benchmark results
- **Rich metadata**: Detailed explanations for recommendations
- **Easy maintenance**: Single source of truth in JSON
- **Future-proof**: Easy to add new models as they become available
- **Transparency**: Clear rationale for each recommendation

This aligns with Gannicus's goal of being a modern, intelligent replacement for Faker.js, powered by the best available LLMs.

