/**
 * Fast Development Mode Example
 * 
 * Shows how to use Gannicus for rapid iteration during development
 * Uses caching and fast models to generate results quickly
 */

import { generateFast, defineSchema, llm, number, enumField, derived, getCacheStats } from '../packages/core/src/index.ts';

const userSchema = defineSchema({
  name: llm('A realistic full name'),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
  }),
  age: number(18, 65),
  role: enumField(['Developer', 'Designer', 'Manager']),
});

async function main() {
  console.log('🚀 Fast Development Mode\n');
  console.log('First run (no cache):');
  
  const start1 = Date.now();
  const result1 = await generateFast(userSchema, {
    count: 10,
    useCache: true,
    useBatching: true,
  });
  const duration1 = Date.now() - start1;
  
  console.log(`  Generated ${result1.data.length} records in ${duration1}ms`);
  console.log(`  LLM Calls: ${result1.stats.llmCalls}`);
  console.log(`  Cache Hits: ${result1.stats.cacheHits || 0}`);
  console.log(`  Cache Hit Rate: ${result1.stats.cacheHitRate?.toFixed(1) || 0}%`);
  
  const cacheStats = getCacheStats();
  console.log(`\n  Cache Stats: ${cacheStats.keys} keys, ${cacheStats.totalEntries} entries`);
  
  console.log('\n\nSecond run (with cache):');
  
  const start2 = Date.now();
  const result2 = await generateFast(userSchema, {
    count: 10,
    useCache: true,
    useBatching: true,
  });
  const duration2 = Date.now() - start2;
  
  console.log(`  Generated ${result2.data.length} records in ${duration2}ms`);
  console.log(`  LLM Calls: ${result2.stats.llmCalls}`);
  console.log(`  Cache Hits: ${result2.stats.cacheHits || 0}`);
  console.log(`  Cache Hit Rate: ${result2.stats.cacheHitRate?.toFixed(1) || 0}%`);
  console.log(`  Speedup: ${(duration1 / duration2).toFixed(1)}x faster`);
  
  console.log('\n\nSample data:');
  console.log(JSON.stringify(result2.data.slice(0, 3), null, 2));
  
  if (result2.metadata?.costEstimate) {
    console.log('\n💰 Cost Estimate:');
    console.log(`  Cost: $${result2.metadata.costEstimate.cost.toFixed(4)}`);
    console.log(`  Tokens: ${result2.metadata.costEstimate.totalTokens.toLocaleString()}`);
    console.log(`  Speed: ${result2.metadata.costEstimate.recordsPerSecond.toFixed(1)} rec/s`);
  }
}

main().catch(console.error);

