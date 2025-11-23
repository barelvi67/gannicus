/**
 * Multi-Provider Comparison Example
 * 
 * Demonstrates generating the same data with different providers
 * and comparing performance, quality, and cost
 */

import { defineSchema, llm, number, enumField, generate } from 'gannicus';

const userSchema = defineSchema({
  name: llm('A realistic full name'),
  age: number(18, 65),
  country: enumField(['USA', 'UK', 'Canada', 'Germany', 'France']),
  occupation: llm('A realistic job title', {
    coherence: ['age', 'country'],
  }),
});

interface ProviderResult {
  provider: string;
  model: string;
  records: number;
  duration: number;
  recordsPerSecond: number;
  success: boolean;
  error?: string;
}

async function testProvider(
  name: 'ollama' | 'sglang' | 'mlx' | 'vllm',
  model: string,
  baseURL?: string
): Promise<ProviderResult> {
  const startTime = Date.now();
  
  try {
    const result = await generate(userSchema, {
      count: 10, // Small test batch
      provider: {
        name,
        model,
        baseURL,
      },
    });

    const duration = Date.now() - startTime;
    
    return {
      provider: name,
      model,
      records: result.data.length,
      duration,
      recordsPerSecond: (result.data.length / (duration / 1000)),
      success: true,
    };
  } catch (error) {
    return {
      provider: name,
      model,
      records: 0,
      duration: Date.now() - startTime,
      recordsPerSecond: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('🔬 Multi-Provider Comparison\n');
  console.log('Testing all available providers with the same schema...\n');

  const providers: Array<{ name: 'ollama' | 'sglang' | 'mlx' | 'vllm'; model: string; baseURL?: string }> = [
    { name: 'ollama', model: 'llama3.2:3b' },
    { name: 'sglang', model: 'Qwen/Qwen2.5-7B-Instruct', baseURL: 'http://localhost:30000' },
    { name: 'mlx', model: 'mlx-community/Llama-3.2-3B-Instruct', baseURL: 'http://localhost:8080' },
    { name: 'vllm', model: 'Qwen/Qwen2.5-7B-Instruct', baseURL: 'http://localhost:8000' },
  ];

  const results: ProviderResult[] = [];

  for (const provider of providers) {
    console.log(`Testing ${provider.name}...`);
    const result = await testProvider(provider.name, provider.model, provider.baseURL);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ ${result.recordsPerSecond.toFixed(2)} records/sec\n`);
    } else {
      console.log(`  ❌ Failed: ${result.error}\n`);
    }
  }

  console.log('\n📊 Comparison Results:\n');
  console.log('Provider    | Model                          | Records/sec | Status');
  console.log('------------|--------------------------------|-------------|--------');
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const modelDisplay = result.model.length > 30 ? result.model.substring(0, 27) + '...' : result.model;
    const speed = result.success ? result.recordsPerSecond.toFixed(2) : 'N/A';
    
    console.log(
      `${result.provider.padEnd(11)} | ${modelDisplay.padEnd(30)} | ${speed.padEnd(11)} | ${status}`
    );
  }

  const successful = results.filter((r) => r.success);
  if (successful.length > 1) {
    const fastest = successful.reduce((a, b) => 
      a.recordsPerSecond > b.recordsPerSecond ? a : b
    );
    console.log(`\n⚡ Fastest: ${fastest.provider} (${fastest.recordsPerSecond.toFixed(2)} records/sec)`);
  }
}

main().catch(console.error);

