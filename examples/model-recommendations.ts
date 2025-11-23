/**
 * Example: Using recommended models configuration
 * 
 * This demonstrates how Gannicus uses metadata-rich model recommendations
 * to automatically select the best model for your use case.
 */

import { OllamaProvider } from '../packages/core/src/providers/ollama.ts';
import {
  getRecommendedModels,
  getDefaultModel,
  getModelForUseCase,
  getRecommendations,
  getModelById,
} from '../packages/core/src/models/index.ts';

// Example 1: Use default recommended model (qwen2.5:7b for production)
console.log('=== Example 1: Default Model ===');
const defaultProvider = new OllamaProvider();
console.log(`Using model: ${defaultProvider['model']}`); // Access private for demo

// Example 2: Auto-select by use case
console.log('\n=== Example 2: Use Case Selection ===');
const devProvider = new OllamaProvider({ useCase: 'development' });
console.log(`Development model: ${devProvider['model']}`);

const prodProvider = new OllamaProvider({ useCase: 'production' });
console.log(`Production model: ${prodProvider['model']}`);

// Example 3: Get model recommendations
console.log('\n=== Example 3: Model Recommendations ===');
const recommendations = getRecommendations();
console.log('Recommended models:');
console.log(`  Default: ${recommendations.default.id} - ${recommendations.default.name}`);
console.log(`  Development: ${recommendations.development.id} - ${recommendations.development.name}`);
console.log(`  Production: ${recommendations.production.id} - ${recommendations.production.name}`);
console.log(`  Fastest: ${recommendations.fastest.id} - ${recommendations.fastest.name}`);

// Example 4: Get detailed model information
console.log('\n=== Example 4: Model Details ===');
const model = getModelById('qwen2.5:7b');
if (model) {
  console.log(`Model: ${model.name}`);
  console.log(`  Size: ${model.size.parameters} (${model.size.diskSize})`);
  console.log(`  RAM Required: ${model.size.ramRequired}`);
  console.log(`  Average Latency: ${model.performance.averageLatency}ms`);
  console.log(`  Success Rate: ${(model.performance.successRate * 100).toFixed(0)}%`);
  console.log(`  Recommended Temperature: ${model.temperature.recommended}`);
  console.log(`  Strengths:`);
  model.strengths.forEach(s => console.log(`    - ${s}`));
  console.log(`  Use Cases: ${model.useCases.join(', ')}`);
}

// Example 5: List all recommended models
console.log('\n=== Example 5: All Recommended Models ===');
const allModels = getRecommendedModels();
allModels.forEach((model, idx) => {
  console.log(`${idx + 1}. ${model.name} (${model.id})`);
  console.log(`   Priority: ${model.priority} | Latency: ${model.performance.averageLatency}ms`);
  console.log(`   ${model.status === 'recommended' ? '✅ Recommended' : '⚠️ ' + model.status}`);
});

