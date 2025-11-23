/**
 * vLLM Production Example
 * 
 * Demonstrates using vLLM provider for Linux/CUDA production workloads
 * High-performance inference runtime for servers with NVIDIA GPUs
 */

import { defineSchema, llm, number, enumField, generate } from 'gannicus';

// Define a realistic schema for user data
const userSchema = defineSchema({
  name: llm('A realistic full name'),
  email: llm('A professional email address', {
    coherence: ['name'],
  }),
  age: number(18, 80),
  role: enumField(['Developer', 'Designer', 'Manager', 'Product', 'Marketing']),
  company: llm('A tech company name'),
  bio: llm('A professional bio', {
    coherence: ['name', 'role', 'company'],
  }),
});

async function main() {
  console.log('🚀 vLLM Production Example\n');
  console.log('Generating 5000 users using vLLM (Linux/CUDA optimized)...\n');

  const startTime = Date.now();

  const result = await generate(userSchema, {
    count: 5000,
    provider: {
      name: 'vllm',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      baseURL: 'http://localhost:8000',
    },
    batchSize: 50, // vLLM handles high concurrency excellently
  });

  const duration = Date.now() - startTime;

  console.log(`✅ Generated ${result.data.length} users in ${(duration / 1000).toFixed(2)}s`);
  console.log(`⚡ Speed: ${(result.data.length / (duration / 1000)).toFixed(2)} records/sec\n`);

  // Show sample data
  console.log('📊 Sample users:');
  result.data.slice(0, 3).forEach((user, i) => {
    console.log(`\n${i + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Age: ${user.age}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Company: ${user.company}`);
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

