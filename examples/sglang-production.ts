/**
 * SGLang Production Example
 * 
 * Demonstrates using SGLang for high-performance production workloads.
 * SGLang is optimized for structured outputs and can handle 26k+ tokens/sec.
 * 
 * Perfect for:
 * - Large datasets (10,000+ records)
 * - Production pipelines
 * - Self-hosted inference
 * 
 * Setup:
 * 1. Install SGLang: pip install "sglang[all]"
 * 2. Start server: python -m sglang.launch_server --model-path Qwen/Qwen2.5-7B-Instruct --port 30000
 * 3. Run this example
 */

import { defineSchema, llm, number, enumField, derived, generate } from 'gannicus';

// Define schema for production dataset
const userSchema = defineSchema({
  name: llm('A realistic full name'),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
  }),
  age: number(18, 65),
  country: enumField(['USA', 'UK', 'Canada', 'Germany', 'France', 'Spain', 'Italy']),
  occupation: llm('A realistic job title', {
    coherence: ['age', 'country'],
  }),
  salary: derived(['occupation', 'age'], (ctx) => {
    // Simple salary calculation based on occupation and age
    const base = ctx.occupation.toLowerCase().includes('senior') ? 80000 : 50000;
    const ageBonus = (ctx.age - 25) * 1000;
    return base + ageBonus;
  }),
});

async function main() {
  console.log('🚀 SGLang Production Example\n');

  // Check SGLang availability
  const { SGLangProvider } = await import('../packages/core/src/providers/sglang.ts');
  const provider = new SGLangProvider({
    model: 'Qwen/Qwen2.5-7B-Instruct', // Recommended: equivalent to qwen2.5:7b
    endpoint: 'http://localhost:30000',
  });

  const health = await provider.healthCheck();
  if (!health.ok) {
    console.error('❌ SGLang is not available:', health.message);
    console.error('\nSetup instructions:');
    console.error('1. Install: pip install "sglang[all]"');
    console.error('2. Start server: python -m sglang.launch_server --model-path Qwen/Qwen2.5-7B-Instruct --port 30000');
    console.error('3. Or use a remote SGLang instance by updating the endpoint');
    process.exit(1);
  }

  console.log('✅ SGLang is ready\n');

  // Generate large dataset (production workload)
  const startTime = Date.now();
  console.log('Generating 1000 records with SGLang...\n');

  const result = await generate(userSchema, {
    count: 1000,
    provider: {
      name: 'sglang',
      model: 'Qwen/Qwen2.5-7B-Instruct', // Recommended: equivalent to qwen2.5:7b
      baseURL: 'http://localhost:30000',
    },
    onProgress: (current, total) => {
      if (current % 100 === 0 || current === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (current / (Date.now() - startTime) * 1000).toFixed(1);
        console.log(`Progress: ${current}/${total} (${rate} records/sec, ${elapsed}s elapsed)`);
      }
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const recordsPerSecond = (result.data.length / (Date.now() - startTime) * 1000).toFixed(1);

  console.log('\n✨ Generation complete!');
  console.log(`\nPerformance Stats:`);
  console.log(`  Records: ${result.data.length}`);
  console.log(`  Duration: ${duration}s`);
  console.log(`  Rate: ${recordsPerSecond} records/sec`);
  console.log(`  LLM Calls: ${result.stats.llmCalls}`);
  console.log(`  Provider: ${result.stats.provider}`);
  console.log(`  Model: ${result.stats.model}`);

  // Show sample records
  console.log('\nSample records:');
  result.data.slice(0, 3).forEach((user, i) => {
    console.log(`\n${i + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Age: ${user.age}, Country: ${user.country}`);
    console.log(`   Occupation: ${user.occupation}`);
    console.log(`   Salary: $${user.salary.toLocaleString()}`);
  });

  // Compare with Ollama (if available)
  console.log('\n\n📊 Performance Comparison:');
  console.log('  Ollama: ~1-3 req/sec (good for development)');
  console.log('  SGLang: ~26k tokens/sec (perfect for production)');
  console.log('\n💡 Tip: Use Ollama for development (<1000 records)');
  console.log('         Use SGLang for production (>1000 records)');
}

main().catch(console.error);

