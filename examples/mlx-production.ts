/**
 * MLX Production Example
 * 
 * Demonstrates using MLX provider for macOS Apple Silicon production workloads
 * Leverages Metal GPU for optimal performance on M1/M2/M3/M4 chips
 */

import { defineSchema, llm, number, enumField, generate } from 'gannicus';

// Define a realistic schema for production data
const productSchema = defineSchema({
  name: llm('A realistic product name'),
  category: enumField(['Electronics', 'Clothing', 'Home', 'Sports', 'Books']),
  price: number(9.99, 999.99),
  description: llm('A compelling product description', {
    coherence: ['name', 'category'],
  }),
  rating: number(3.5, 5.0),
  stock: number(0, 1000),
});

async function main() {
  console.log('🍎 MLX Production Example\n');
  console.log('Generating 1000 products using MLX (Apple Silicon optimized)...\n');

  const startTime = Date.now();

  const result = await generate(productSchema, {
    count: 1000,
    provider: {
      name: 'mlx',
      model: 'mlx-community/Llama-3.2-3B-Instruct',
      baseURL: 'http://localhost:8080',
    },
    batchSize: 30, // MLX handles high concurrency well
  });

  const duration = Date.now() - startTime;

  console.log(`✅ Generated ${result.data.length} products in ${(duration / 1000).toFixed(2)}s`);
  console.log(`⚡ Speed: ${(result.data.length / (duration / 1000)).toFixed(2)} records/sec\n`);

  // Show sample data
  console.log('📊 Sample products:');
  result.data.slice(0, 3).forEach((product, i) => {
    console.log(`\n${i + 1}. ${product.name}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   Price: $${product.price.toFixed(2)}`);
    console.log(`   Rating: ${product.rating.toFixed(1)}/5.0`);
    console.log(`   Stock: ${product.stock}`);
  });

  console.log(`\n📈 Statistics:`);
  console.log(`   Total records: ${result.stats.totalRecords}`);
  console.log(`   LLM calls: ${result.stats.llmCalls}`);
  console.log(`   Cache hits: ${result.stats.cacheHits} (${result.stats.cacheHitRate.toFixed(1)}%)`);
  console.log(`   Duration: ${(result.stats.duration / 1000).toFixed(2)}s`);
  console.log(`   Provider: ${result.stats.provider}`);
  console.log(`   Model: ${result.stats.model}`);

  if (result.metadata?.costEstimate) {
    console.log(`\n💰 Cost estimate: $${result.metadata.costEstimate.total.toFixed(4)}`);
  }
}

main().catch(console.error);

