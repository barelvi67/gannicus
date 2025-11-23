/**
 * Provider Performance Benchmark
 * 
 * Fully automated benchmark that handles EVERYTHING:
 * - Checks if servers are running
 * - Starts Ollama automatically if needed
 * - Downloads models if missing
 * - Compares Ollama vs SGLang performance
 * 
 * Metrics:
 * - Throughput (records/sec)
 * - Latency (avg time per record)
 * - Total generation time
 * - LLM calls efficiency
 * - Cost (always $0 for self-hosted)
 * 
 * Usage:
 *   bun benchmarks/provider-comparison.ts
 */

import { defineSchema, llm, number, enumField, derived, generate } from '../packages/core/src/index.ts';
import { OllamaProvider } from '../packages/core/src/providers/ollama.ts';
import { SGLangProvider } from '../packages/core/src/providers/sglang.ts';
import { MLXProvider } from '../packages/core/src/providers/mlx.ts';
import { VLLMProvider } from '../packages/core/src/providers/vllm.ts';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BenchmarkResult {
  provider: string;
  model: string;
  records: number;
  duration: number; // milliseconds
  recordsPerSecond: number;
  avgLatencyPerRecord: number; // milliseconds
  llmCalls: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  success: boolean;
  error?: string;
}

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startOllama(): Promise<boolean> {
  console.log('  🔄 Attempting to start Ollama...');
  try {
    await execAsync('which ollama');
    const ollamaProcess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    ollamaProcess.unref();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return await checkOllamaRunning();
  } catch {
    return false;
  }
}

async function ensureModelAvailable(model: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json() as { models?: Array<{ name: string }> };
    const models = data.models || [];
    const hasModel = models.some((m) => m.name.includes(model.split(':')[0]));
    
    if (!hasModel) {
      console.log(`  📥 Model ${model} not found. Downloading...`);
      const pullProcess = spawn('ollama', ['pull', model], { stdio: 'inherit' });
      await new Promise<void>((resolve, reject) => {
        pullProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ollama pull failed`));
        });
      });
      console.log(`  ✅ Model ${model} downloaded`);
    }
    return true;
  } catch {
    return false;
  }
}

async function checkMLXRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/v1/models', { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkVLLMRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8000/v1/models', { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkProviderAvailability(): Promise<{
  ollama: { available: boolean; model?: string; message: string };
  sglang: { available: boolean; model?: string; message: string };
  mlx: { available: boolean; model?: string; message: string };
  vllm: { available: boolean; model?: string; message: string };
}> {
  const results = {
    ollama: { available: false, message: '' },
    sglang: { available: false, message: '' },
    mlx: { available: false, message: '' },
    vllm: { available: false, message: '' },
  };

  // Check Ollama - with auto-setup
  console.log('Checking Ollama...');
  const isRunning = await checkOllamaRunning();
  if (!isRunning) {
    console.log('  Ollama not running, attempting to start...');
    const started = await startOllama();
    if (!started) {
      results.ollama = { message: '❌ Ollama: Not running. Please run: ollama serve' };
      console.log(results.ollama.message);
      return results;
    }
  }

  // Try models in order
  const models = ['llama3.2:3b', 'qwen2.5:7b'];
  for (const model of models) {
    try {
      const modelAvailable = await ensureModelAvailable(model);
      if (!modelAvailable) continue;

      const ollamaProvider = new OllamaProvider({ model });
      const health = await ollamaProvider.healthCheck();
      if (health.ok) {
        results.ollama = { available: true, model, message: `✅ Ollama ready (${model})` };
        console.log(results.ollama.message);
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!results.ollama.available) {
    results.ollama = { message: '❌ Ollama: No suitable model found' };
    console.log(results.ollama.message);
  }

  // Check SGLang (Linux/CUDA only)
  console.log('Checking SGLang...');
  try {
    const sglangProvider = new SGLangProvider({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      endpoint: 'http://localhost:30000',
    });
    const health = await sglangProvider.healthCheck();
    if (health.ok) {
      results.sglang = { available: true, model: 'Qwen/Qwen2.5-7B-Instruct', message: '✅ SGLang ready' };
      console.log(results.sglang.message);
    } else {
      if (process.platform === 'darwin') {
        results.sglang = { message: '❌ SGLang: Linux/CUDA only (not available on macOS)' };
      } else {
        results.sglang = { message: `❌ SGLang: ${health.message}` };
      }
      console.log(results.sglang.message);
    }
  } catch (error) {
    if (process.platform === 'darwin') {
      results.sglang = { message: '❌ SGLang: Linux/CUDA only (not available on macOS)' };
    } else {
      results.sglang = { message: '❌ SGLang: Not running. Requires manual setup.' };
    }
    console.log(results.sglang.message);
  }

  // Check MLX (macOS Apple Silicon optimized, but try on all platforms)
  console.log('Checking MLX...');
  let isMLXRunning = await checkMLXRunning();
  
  // Try to start MLX automatically on macOS if not running
  if (!isMLXRunning && process.platform === 'darwin') {
    try {
      await execAsync('python3 -m mlx_lm server --help');
      console.log('  🔄 Attempting to start MLX server...');
      const mlxProcess = spawn('python3', [
        '-m', 'mlx_lm', 'server',
        '--model', 'mlx-community/Llama-3.2-3B-Instruct',
        '--port', '8080'
      ], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      mlxProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        process.stdout.write('  ' + output.replace(/\n/g, '\n  '));
      });
      
      mlxProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        process.stderr.write('  ' + output.replace(/\n/g, '\n  '));
      });
      
      mlxProcess.unref();
      
      // Wait a bit for server to start
      console.log('  ⏳ Waiting for MLX to start...');
      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        isMLXRunning = await checkMLXRunning();
        if (isMLXRunning) break;
        if (i % 10 === 0 && i > 0) {
          console.log(`  ⏳ Still waiting... (${i}s)`);
        }
      }
    } catch {
      // MLX not installed or can't start
    }
  }
  
  // Check again after potential auto-start
  if (!isMLXRunning) {
    isMLXRunning = await checkMLXRunning();
  }
  
  if (isMLXRunning) {
    try {
      const mlxProvider = new MLXProvider({
        model: 'mlx-community/Llama-3.2-3B-Instruct',
        endpoint: 'http://localhost:8080',
      });
      const health = await mlxProvider.healthCheck();
      if (health.ok) {
        results.mlx = { available: true, model: 'mlx-community/Llama-3.2-3B-Instruct', message: '✅ MLX ready' };
        console.log(results.mlx.message);
      } else {
        results.mlx = { message: `❌ MLX: ${health.message}` };
        console.log(results.mlx.message);
      }
    } catch (error) {
      results.mlx = { message: `❌ MLX: ${error instanceof Error ? error.message : 'Not running'}` };
      console.log(results.mlx.message);
    }
  } else {
    if (process.platform === 'darwin') {
      results.mlx = { message: '❌ MLX: Not running (optimized for Apple Silicon). Install: pip install mlx-lm' };
    } else {
      results.mlx = { message: '❌ MLX: Not running (Apple Silicon only)' };
    }
    console.log(results.mlx.message);
  }

  // Check vLLM (Linux/CUDA only, but try on all platforms)
  console.log('Checking vLLM...');
  const isVLLMRunning = await checkVLLMRunning();
  if (isVLLMRunning) {
    try {
      const vllmProvider = new VLLMProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:8000',
      });
      const health = await vllmProvider.healthCheck();
      if (health.ok) {
        results.vllm = { available: true, model: 'Qwen/Qwen2.5-7B-Instruct', message: '✅ vLLM ready' };
        console.log(results.vllm.message);
      } else {
        results.vllm = { message: `❌ vLLM: ${health.message}` };
        console.log(results.vllm.message);
      }
    } catch (error) {
      results.vllm = { message: `❌ vLLM: ${error instanceof Error ? error.message : 'Not running'}` };
      console.log(results.vllm.message);
    }
  } else {
    if (process.platform === 'darwin') {
      results.vllm = { message: '❌ vLLM: Linux/CUDA only (not available on macOS)' };
    } else if (process.platform === 'win32') {
      results.vllm = { message: '❌ vLLM: Linux/CUDA only (use WSL2 for Windows)' };
    } else {
      results.vllm = { message: '❌ vLLM: Not running (requires CUDA/NVIDIA GPU)' };
    }
    console.log(results.vllm.message);
  }

  return results;
}

async function benchmarkProvider(
  providerName: 'ollama' | 'sglang' | 'mlx' | 'vllm',
  model: string,
  recordCount: number,
  schema: ReturnType<typeof defineSchema>
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  let result;

  try {
    const providerConfig: any = {
      name: providerName,
      model: model,
    };

    if (providerName === 'sglang') {
      providerConfig.baseURL = 'http://localhost:30000';
    } else if (providerName === 'mlx') {
      providerConfig.baseURL = 'http://localhost:8080';
    } else if (providerName === 'vllm') {
      providerConfig.baseURL = 'http://localhost:8000';
    }

    result = await generate(schema, {
      count: recordCount,
      provider: providerConfig,
      batchSize: providerName === 'sglang' ? 50 : providerName === 'mlx' ? 30 : providerName === 'vllm' ? 50 : 5, // SGLang/vLLM/MLX can handle more
    });

    const duration = Date.now() - startTime;
    const recordsPerSecond = (recordCount / duration) * 1000;
    const avgLatencyPerRecord = duration / recordCount;

    return {
      provider: providerName,
      model: model,
      records: recordCount,
      duration,
      recordsPerSecond,
      avgLatencyPerRecord,
      llmCalls: result.stats.llmCalls,
      success: true,
    };
  } catch (error) {
    return {
      provider: providerName,
      model: model,
      records: recordCount,
      duration: Date.now() - startTime,
      recordsPerSecond: 0,
      avgLatencyPerRecord: 0,
      llmCalls: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 BENCHMARK RESULTS');
  console.log('='.repeat(80) + '\n');

  const successfulResults = results.filter((r) => r.success);
  const failedResults = results.filter((r) => !r.success);

  if (successfulResults.length > 0) {
    console.log('✅ Successful Benchmarks:\n');
    console.log(
      'Provider'.padEnd(12) +
        'Model'.padEnd(30) +
        'Records'.padEnd(10) +
        'Duration'.padEnd(12) +
        'Records/sec'.padEnd(15) +
        'Avg Latency'.padEnd(15) +
        'LLM Calls'
    );
    console.log('-'.repeat(80));

    for (const result of successfulResults) {
      console.log(
        result.provider.padEnd(12) +
          result.model.substring(0, 28).padEnd(30) +
          result.records.toString().padEnd(10) +
          formatDuration(result.duration).padEnd(12) +
          result.recordsPerSecond.toFixed(2).padEnd(15) +
          formatDuration(result.avgLatencyPerRecord).padEnd(15) +
          result.llmCalls.toString()
      );
    }

    // Comparison if multiple providers succeeded
    if (successfulResults.length >= 2) {
      const ollamaResult = successfulResults.find((r) => r.provider === 'ollama');
      const sglangResult = successfulResults.find((r) => r.provider === 'sglang');
      const mlxResult = successfulResults.find((r) => r.provider === 'mlx');

      console.log('\n' + '='.repeat(80));
      console.log('⚡ PERFORMANCE COMPARISON');
      console.log('='.repeat(80) + '\n');

      if (ollamaResult && sglangResult) {
        const speedup = ollamaResult.duration / sglangResult.duration;
        const throughputRatio = sglangResult.recordsPerSecond / ollamaResult.recordsPerSecond;

        console.log(`Ollama vs SGLang:`);
        console.log(`  Speed Improvement: ${speedup.toFixed(2)}x faster with SGLang`);
        console.log(`  Throughput Ratio: ${throughputRatio.toFixed(2)}x more records/sec with SGLang`);
        console.log(`  Time Saved: ${formatDuration(ollamaResult.duration - sglangResult.duration)}`);
      }

      if (ollamaResult && mlxResult) {
        const speedup = ollamaResult.duration / mlxResult.duration;
        const throughputRatio = mlxResult.recordsPerSecond / ollamaResult.recordsPerSecond;

        console.log(`\nOllama vs MLX:`);
        if (speedup > 1) {
          console.log(`  Speed Improvement: ${speedup.toFixed(2)}x faster with MLX 🍎`);
        } else {
          console.log(`  Speed: ${(1/speedup).toFixed(2)}x slower with MLX (may improve with larger batches)`);
        }
        console.log(`  Throughput Ratio: ${throughputRatio.toFixed(2)}x`);
        console.log(`  Time Difference: ${formatDuration(Math.abs(ollamaResult.duration - mlxResult.duration))}`);
      }

      if (ollamaResult) {
        console.log(
          `\nFor 10,000 records:` +
            `\n  Ollama: ~${formatDuration((10000 / ollamaResult.recordsPerSecond) * 1000)}`
        );
        if (sglangResult) {
          console.log(`  SGLang: ~${formatDuration((10000 / sglangResult.recordsPerSecond) * 1000)}`);
        }
        if (mlxResult) {
          console.log(`  MLX: ~${formatDuration((10000 / mlxResult.recordsPerSecond) * 1000)} 🍎`);
        }
      }
    }
  }

  if (failedResults.length > 0) {
    console.log('\n❌ Failed Benchmarks:\n');
    for (const result of failedResults) {
      console.log(`${result.provider} (${result.model}): ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 Provider Performance Benchmark');
  console.log('='.repeat(80));
  console.log('This benchmark handles EVERYTHING automatically:\n');
  console.log('  ✅ Checks if servers are running');
  console.log('  ✅ Starts Ollama if needed');
  console.log('  ✅ Downloads models if missing');
  console.log('  ✅ Runs comprehensive benchmarks');
  console.log('  ✅ Compares performance\n');
  console.log('Checking provider availability...\n');

  const availability = await checkProviderAvailability();

  if (!availability.ollama.available && !availability.sglang.available) {
    console.log('\n❌ No providers available. Please start at least one provider:');
    console.log('\nOllama:');
    console.log('  ollama serve');
    console.log('  ollama pull llama3.2:3b  # or qwen2.5:7b');
    console.log('\nSGLang:');
    console.log('  pip install "sglang[all]"');
    console.log('  python -m sglang.launch_server --model-path Qwen/Qwen2.5-7B-Instruct --port 30000');
    process.exit(1);
  }

  // Define test schema (realistic user profile)
  const userSchema = defineSchema({
    name: llm('A realistic full name'),
    age: number(18, 65),
    country: enumField(['USA', 'UK', 'Canada', 'Germany', 'France', 'Spain']),
    occupation: llm('A realistic job title', {
      coherence: ['age', 'country'],
    }),
    email: derived(['name'], (ctx) => {
      return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    }),
    salary: derived(['occupation', 'age'], (ctx) => {
      const base = ctx.occupation.toLowerCase().includes('senior') ? 80000 : 50000;
      const ageBonus = (ctx.age - 25) * 1000;
      return base + ageBonus;
    }),
  });

  const recordCounts = [10, 50, 100]; // Test with different sizes
  const results: BenchmarkResult[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('Running benchmarks...');
  console.log('='.repeat(80) + '\n');

  for (const count of recordCounts) {
    console.log(`\n📝 Testing with ${count} records...\n`);

    // Benchmark Ollama
    if (availability.ollama.available && availability.ollama.model) {
      console.log(`  Testing Ollama (${availability.ollama.model})...`);
      const ollamaResult = await benchmarkProvider('ollama', availability.ollama.model, count, userSchema);
      results.push(ollamaResult);
      if (ollamaResult.success) {
        console.log(
          `    ✅ ${formatDuration(ollamaResult.duration)} - ${ollamaResult.recordsPerSecond.toFixed(2)} records/sec`
        );
      } else {
        console.log(`    ❌ Failed: ${ollamaResult.error}`);
      }
    }

    // Benchmark SGLang
    if (availability.sglang.available && availability.sglang.model) {
      console.log(`  Testing SGLang (${availability.sglang.model})...`);
      const sglangResult = await benchmarkProvider('sglang', availability.sglang.model, count, userSchema);
      results.push(sglangResult);
      if (sglangResult.success) {
        console.log(
          `    ✅ ${formatDuration(sglangResult.duration)} - ${sglangResult.recordsPerSecond.toFixed(2)} records/sec`
        );
      } else {
        console.log(`    ❌ Failed: ${sglangResult.error}`);
      }
    }

    // Benchmark MLX
    if (availability.mlx.available && availability.mlx.model) {
      console.log(`  Testing MLX (${availability.mlx.model})...`);
      const mlxResult = await benchmarkProvider('mlx', availability.mlx.model, count, userSchema);
      results.push(mlxResult);
      if (mlxResult.success) {
        console.log(
          `    ✅ ${formatDuration(mlxResult.duration)} - ${mlxResult.recordsPerSecond.toFixed(2)} records/sec 🍎`
        );
      } else {
        console.log(`    ❌ Failed: ${mlxResult.error}`);
      }
    }

    // Benchmark vLLM
    if (availability.vllm.available && availability.vllm.model) {
      console.log(`  Testing vLLM (${availability.vllm.model})...`);
      const vllmResult = await benchmarkProvider('vllm', availability.vllm.model, count, userSchema);
      results.push(vllmResult);
      if (vllmResult.success) {
        console.log(
          `    ✅ ${formatDuration(vllmResult.duration)} - ${vllmResult.recordsPerSecond.toFixed(2)} records/sec`
        );
      } else {
        console.log(`    ❌ Failed: ${vllmResult.error}`);
      }
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  printResults(results);

  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  const ollamaResults = results.filter((r) => r.success && r.provider === 'ollama');
  const sglangResults = results.filter((r) => r.success && r.provider === 'sglang');
  const mlxResults = results.filter((r) => r.success && r.provider === 'mlx');

  const availableProviders: string[] = [];
  if (ollamaResults.length > 0) availableProviders.push('Ollama');
  if (sglangResults.length > 0) availableProviders.push('SGLang');
  if (mlxResults.length > 0) availableProviders.push('MLX');

  if (availableProviders.length === 0) {
    console.log('❌ No providers available. Please set up at least one provider.');
    return;
  }

  console.log(`✅ Available providers: ${availableProviders.join(', ')}\n`);

  if (ollamaResults.length > 0) {
    const avgOllamaSpeed = ollamaResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / ollamaResults.length;
    console.log('Use Ollama for:');
    console.log('  ✅ Development and testing');
    console.log('  ✅ Small datasets (<1000 records)');
    console.log('  ✅ Quick prototyping');
    console.log(`  ✅ Current speed: ~${avgOllamaSpeed.toFixed(2)} records/sec\n`);
  }

  if (sglangResults.length > 0) {
    const avgSglangSpeed = sglangResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / sglangResults.length;
    console.log('Use SGLang for:');
    console.log('  ✅ Production pipelines (Linux/CUDA)');
    console.log('  ✅ Large datasets (10k+ records)');
    console.log('  ✅ Maximum throughput');
    console.log(`  ✅ Current speed: ~${avgSglangSpeed.toFixed(2)} records/sec`);
    if (ollamaResults.length > 0) {
      const avgOllamaSpeed = ollamaResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / ollamaResults.length;
      console.log(`  ✅ ${(avgSglangSpeed / avgOllamaSpeed).toFixed(2)}x faster than Ollama\n`);
    }
  }

  if (mlxResults.length > 0) {
    const avgMLXSpeed = mlxResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / mlxResults.length;
    console.log('Use MLX for:');
    console.log('  ✅ macOS production (Apple Silicon optimized)');
    console.log('  ✅ Leverages M1/M2/M3/M4 GPU');
    console.log('  ✅ Native Metal acceleration');
    console.log(`  ✅ Current speed: ~${avgMLXSpeed.toFixed(2)} records/sec 🍎`);
    if (ollamaResults.length > 0) {
      const avgOllamaSpeed = ollamaResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / ollamaResults.length;
      const speedup = avgMLXSpeed / avgOllamaSpeed;
      if (speedup > 1) {
        console.log(`  ✅ ${speedup.toFixed(2)}x faster than Ollama\n`);
      } else {
        console.log(`  ⚠️  ${(1/speedup).toFixed(2)}x slower than Ollama (may improve with larger batches)\n`);
      }
    }
  }

  // Platform-specific notes
  if (process.platform === 'darwin') {
    console.log('💡 Platform: macOS');
    if (!availability.sglang.available) {
      console.log('   - SGLang not available (Linux/CUDA only)');
    }
    if (availability.mlx.available) {
      console.log('   - MLX is optimized for your Apple Silicon chip 🍎');
    }
  } else if (process.platform === 'linux') {
    console.log('💡 Platform: Linux');
    console.log('   - SGLang available (requires CUDA/NVIDIA GPU)');
    console.log('   - MLX not available (Apple Silicon only)');
  } else if (process.platform === 'win32') {
    console.log('💡 Platform: Windows');
    console.log('   - SGLang available (requires WSL2 + CUDA)');
    console.log('   - MLX not available (Apple Silicon only)');
  }
}

main().catch((error) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});

