/**
 * Quick Provider Test
 * 
 * Automated test that handles EVERYTHING:
 * - Checks if servers are running
 * - Attempts to start them if needed
 * - Tests both providers
 * - Provides clear next steps
 * 
 * Usage:
 *   bun benchmarks/quick-test.ts
 */

import { defineSchema, llm, number, enumField, generate } from '../packages/core/src/index.ts';
import { OllamaProvider } from '../packages/core/src/providers/ollama.ts';
import { SGLangProvider } from '../packages/core/src/providers/sglang.ts';
import { MLXProvider } from '../packages/core/src/providers/mlx.ts';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkSGLangRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:30000/v1/models', { signal: AbortSignal.timeout(2000) });
    return response.ok;
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

async function startOllama(): Promise<boolean> {
  console.log('  🔄 Attempting to start Ollama...');
  try {
    // Check if ollama command exists
    await execAsync('which ollama');
    
    // Try to start ollama serve in background
    const ollamaProcess = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    
    ollamaProcess.unref();
    
    // Wait a bit for it to start
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Check if it's running now
    const isRunning = await checkOllamaRunning();
    if (isRunning) {
      console.log('  ✅ Ollama started successfully');
      return true;
    } else {
      console.log('  ⚠️  Ollama process started but not responding yet');
      console.log('  💡 Please run manually: ollama serve');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Could not start Ollama automatically');
    console.log('  💡 Please install Ollama: https://ollama.ai');
    console.log('  💡 Then run: ollama serve');
    return false;
  }
}

async function ensureModelAvailable(model: string, provider: 'ollama' | 'sglang'): Promise<boolean> {
  if (provider === 'ollama') {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const hasModel = models.some((m) => m.name.includes(model.split(':')[0]));
      
      if (!hasModel) {
        console.log(`  📥 Model ${model} not found. Downloading...`);
        console.log(`  ⏳ This may take a few minutes...`);
        
        const pullProcess = spawn('ollama', ['pull', model], {
          stdio: 'inherit',
        });
        
        await new Promise<void>((resolve, reject) => {
          pullProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`ollama pull failed with code ${code}`));
            }
          });
        });
        
        console.log(`  ✅ Model ${model} downloaded`);
        return true;
      }
      return true;
    } catch (error) {
      console.log(`  ❌ Could not check/download model: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  }
  
  // For SGLang, models are downloaded automatically on first use
  return true;
}

async function testOllama(): Promise<{ success: boolean; speed?: number }> {
  console.log('\n🔵 Testing Ollama...');
  
  // Check if running
  const isRunning = await checkOllamaRunning();
  
  if (!isRunning) {
    console.log('  ⚠️  Ollama is not running');
    const started = await startOllama();
    if (!started) {
      return { success: false };
    }
  } else {
    console.log('  ✅ Ollama is running');
  }
  
  // Check/ensure model is available
  const model = 'llama3.2:3b';
  const modelAvailable = await ensureModelAvailable(model, 'ollama');
  if (!modelAvailable) {
    return { success: false };
  }
  
  // Test generation
  try {
    const schema = defineSchema({
      name: llm('A realistic full name'),
      age: number(18, 65),
      country: enumField(['USA', 'UK', 'Canada']),
    });
    
    const ollamaProvider = new OllamaProvider({ model });
    const health = await ollamaProvider.healthCheck();
    
    if (!health.ok) {
      console.log(`  ❌ Ollama health check failed: ${health.message}`);
      return { success: false };
    }
    
    console.log('  ✅ Ollama is ready');
    console.log('  🚀 Generating test data...');
    
    const start = Date.now();
    const result = await generate(schema, {
      count: 5,
      provider: { name: 'ollama', model },
    });
    const duration = Date.now() - start;
    const speed = (result.data.length / duration) * 1000;
    
    console.log(`  ✅ Generated ${result.data.length} records in ${(duration / 1000).toFixed(2)}s`);
    console.log(`  📊 Sample:`, result.data[0]);
    console.log(`  ⚡ Speed: ${speed.toFixed(2)} records/sec`);
    
    return { success: true, speed };
  } catch (error) {
    console.log(`  ❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { success: false };
  }
}

async function testSGLang(): Promise<{ success: boolean; speed?: number }> {
  console.log('\n🟢 Testing SGLang...');
  
  // Check if running
  const isRunning = await checkSGLangRunning();
  
  if (!isRunning) {
    console.log('  ⚠️  SGLang is not running');
    console.log('  💡 SGLang requires Linux/CUDA (not available on macOS)');
    console.log('     For macOS, use MLX instead (see below)');
    return { success: false };
  }
  
  console.log('  ✅ SGLang is running');
  
  // Test generation
  try {
    const schema = defineSchema({
      name: llm('A realistic full name'),
      age: number(18, 65),
      country: enumField(['USA', 'UK', 'Canada']),
    });
    
    const sglangProvider = new SGLangProvider({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      endpoint: 'http://localhost:30000',
    });
    
    const health = await sglangProvider.healthCheck();
    
    if (!health.ok) {
      console.log(`  ❌ SGLang health check failed: ${health.message}`);
      return { success: false };
    }
    
    console.log('  ✅ SGLang is ready');
    console.log('  🚀 Generating test data...');
    
    const start = Date.now();
    const result = await generate(schema, {
      count: 5,
      provider: {
        name: 'sglang',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        baseURL: 'http://localhost:30000',
      },
    });
    const duration = Date.now() - start;
    const speed = (result.data.length / duration) * 1000;
    
    console.log(`  ✅ Generated ${result.data.length} records in ${(duration / 1000).toFixed(2)}s`);
    console.log(`  📊 Sample:`, result.data[0]);
    console.log(`  ⚡ Speed: ${speed.toFixed(2)} records/sec`);
    
    return { success: true, speed };
  } catch (error) {
    console.log(`  ❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { success: false };
  }
}

async function startMLX(): Promise<boolean> {
  console.log('  🔄 Starting MLX server intelligently...');
  
  try {
    // Check if mlx-lm is installed
    try {
      await execAsync('python3 -m mlx_lm server --help');
    } catch {
      console.log('  ❌ MLX not installed');
      console.log('  💡 Installing MLX automatically...');
      try {
        await execAsync('pip install mlx-lm');
        console.log('  ✅ MLX installed successfully');
      } catch (installError) {
        console.log('  ❌ Could not install MLX automatically');
        console.log('  💡 Please install manually: pip install mlx-lm');
        return false;
      }
    }
    
    // Check if port is already in use (maybe server is already running)
    try {
      const response = await fetch('http://localhost:8080/v1/models', { 
        signal: AbortSignal.timeout(2000) 
      });
      if (response.ok) {
        console.log('  ✅ MLX server already running on port 8080');
        return true;
      }
    } catch {
      // Port is free, continue
    }
    
    console.log('  📥 Starting MLX server...');
    console.log('  ⏳ First time: Model download (~4-5 GB) may take 5-10 minutes');
    console.log('  💡 Be patient - this is automatic and will complete in background');
    
    // Try models in order of preference
    const mlxModels = [
      'mlx-community/Llama-3.2-3B-Instruct', // Fast, small, reliable
      'mlx-community/Llama-3.1-8B-Instruct', // Better quality
      'mlx-community/Mistral-7B-Instruct-v0.3', // Alternative
    ];
    
    let mlxModel = mlxModels[0]; // Start with fastest
    
    // Start MLX server with real-time output streaming
    // Use correct syntax: python -m mlx_lm server (not mlx_lm.server)
    const mlxProcess = spawn('python3', [
      '-m', 'mlx_lm', 'server',
      '--model', mlxModel,
      '--port', '8080'
    ], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    // Store process info
    const pid = mlxProcess.pid;
    let serverReady = false;
    let processError: Error | null = null;
    
    // Stream stdout to console in real-time
    mlxProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      // Show output with indentation to distinguish from our messages
      process.stdout.write('  ' + output.replace(/\n/g, '\n  '));
    });
    
    // Stream stderr to console in real-time
    mlxProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      // Show errors with indentation
      process.stderr.write('  ' + output.replace(/\n/g, '\n  '));
    });
    
    // Handle process errors
    mlxProcess.on('error', (error) => {
      processError = error;
      console.log(`\n  ❌ Failed to start MLX: ${error.message}`);
    });
    
    mlxProcess.on('exit', (code) => {
      if (code !== 0 && code !== null && !serverReady) {
        console.log(`\n  ❌ MLX process exited with code ${code}`);
        processError = new Error(`Process exited with code ${code}`);
      }
    });
    
    // Detach process after a moment so it continues running
    setTimeout(() => {
      mlxProcess.unref();
    }, 1000);
    
    // Intelligent waiting: Check server readiness while showing process output
    console.log('  🔍 Monitoring server startup (output visible above)...');
    console.log('  💡 You can see download/loading progress in real-time');
    const maxWaitTime = 600; // 10 minutes max
    const checkInterval = 5; // Check every 5 seconds
    
    // Start checking in background while process runs
    const checkPromise = (async () => {
      for (let elapsed = 0; elapsed < maxWaitTime; elapsed += checkInterval) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval * 1000));
        
        // Check if process died
        if (processError) {
          return false;
        }
        
        // Check if server is responding
        try {
          const response = await fetch('http://localhost:8080/v1/models', {
            signal: AbortSignal.timeout(2000),
          });
          
          if (response.ok) {
            const data = await response.json() as { data?: Array<{ id: string }> };
            const models = data.data || [];
            
            // Server is responding and has models - it's ready!
            if (models.length > 0) {
              serverReady = true;
              const minutes = Math.floor(elapsed / 60);
              const seconds = elapsed % 60;
              console.log(`\n  ✅ MLX server ready after ${minutes}m ${seconds}s`);
              console.log(`  📦 Loaded model: ${models[0].id}`);
              // Detach process now that it's ready
              mlxProcess.unref();
              return true;
            }
          }
        } catch {
          // Server not ready yet, continue waiting
        }
        
        // Progress updates (less frequent to avoid spam)
        if (elapsed > 0 && elapsed % 30 === 0) {
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          console.log(`\n  ⏳ Checking server status... (${minutes}m ${seconds}s elapsed)`);
        }
      }
      return false;
    })();
    
    // Wait for either server to be ready or timeout
    const serverReadyResult = await checkPromise;
    
    if (serverReadyResult) {
      return true;
    }
    
    // Check if process is still running
    if (processError) {
      console.log(`\n  ❌ Server failed to start: ${processError.message}`);
      return false;
    }
    
    try {
      await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
      console.log('\n  ⚠️  Server process is running but not responding yet');
      console.log('  💡 This may be normal - model is still downloading/loading');
      console.log('  💡 Check the output above for progress');
      console.log('  💡 You can wait longer or check manually: curl http://localhost:8080/v1/models');
      return false;
    } catch {
      console.log('\n  ❌ Server process died - check error messages above');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Could not start MLX automatically');
    console.log('  💡 Error:', error instanceof Error ? error.message : 'Unknown');
    return false;
  }
}

async function testMLX(): Promise<{ success: boolean; speed?: number }> {
  console.log('\n🍎 Testing MLX (Apple Silicon optimized)...');
  
  // Check if running
  const isRunning = await checkMLXRunning();
  
  if (!isRunning) {
    console.log('  ⚠️  MLX is not running');
    
    // Only try auto-start on macOS
    if (process.platform === 'darwin') {
      const started = await startMLX();
      if (!started) {
        console.log('  💡 Setup options:');
        console.log('     Quick setup: bash benchmarks/setup-mlx.sh');
        console.log('     Manual:');
        console.log('       1. pip install mlx-lm');
        console.log('       2. python3 -m mlx_lm server --model mlx-community/Llama-3.2-3B-Instruct --port 8080');
        console.log('       3. Wait for model to download/load (first time: 5-10 min)');
        console.log('       4. Run this test again');
        console.log('  🚀 MLX leverages your M4 Pro GPU for maximum performance!');
        return { success: false };
      }
    } else {
      console.log('  💡 MLX is macOS/Apple Silicon only');
      return { success: false };
    }
  }
  
  console.log('  ✅ MLX is running');
  
  // Test generation
  try {
    const schema = defineSchema({
      name: llm('A realistic full name'),
      age: number(18, 65),
      country: enumField(['USA', 'UK', 'Canada']),
    });
    
    const mlxProvider = new MLXProvider({
      model: 'mlx-community/Llama-3.2-3B-Instruct', // Use valid model
      endpoint: 'http://localhost:8080',
    });
    
    const health = await mlxProvider.healthCheck();
    
    if (!health.ok) {
      console.log(`  ❌ MLX health check failed: ${health.message}`);
      return { success: false };
    }
    
    console.log('  ✅ MLX is ready');
    console.log('  🚀 Generating test data (using M4 Pro GPU)...');
    
    const start = Date.now();
    const result = await generate(schema, {
      count: 5,
      provider: {
        name: 'mlx',
        model: 'mlx-community/Llama-3.2-3B-Instruct',
        baseURL: 'http://localhost:8080',
      },
    });
    const duration = Date.now() - start;
    const speed = (result.data.length / duration) * 1000;
    
    console.log(`  ✅ Generated ${result.data.length} records in ${(duration / 1000).toFixed(2)}s`);
    console.log(`  📊 Sample:`, result.data[0]);
    console.log(`  ⚡ Speed: ${speed.toFixed(2)} records/sec`);
    
    return { success: true, speed };
  } catch (error) {
    console.log(`  ❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { success: false };
  }
}

async function main() {
  console.log('🧪 Quick Provider Test');
  console.log('='.repeat(50));
  console.log('This test will handle EVERYTHING automatically:\n');
  console.log('  ✅ Check if servers are running');
  console.log('  ✅ Start Ollama if needed');
  console.log('  ✅ Download models if missing');
  console.log('  ✅ Test both providers');
  console.log('  ✅ Show performance metrics\n');
  
  const ollamaResult = await testOllama();
  const sglangResult = await testSGLang();
  const mlxResult = await testMLX();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  
  if (ollamaResult.success) {
    console.log(`✅ Ollama: Working (${ollamaResult.speed?.toFixed(2)} records/sec)`);
  } else {
    console.log('❌ Ollama: Not available');
  }
  
  if (sglangResult.success) {
    console.log(`✅ SGLang: Working (${sglangResult.speed?.toFixed(2)} records/sec)`);
  } else {
    console.log('❌ SGLang: Not available (Linux/CUDA only)');
  }
  
  if (mlxResult.success) {
    console.log(`✅ MLX: Working (${mlxResult.speed?.toFixed(2)} records/sec) 🍎`);
    
    if (ollamaResult.success && ollamaResult.speed && mlxResult.speed) {
      const speedup = mlxResult.speed / ollamaResult.speed;
      console.log(`\n⚡ MLX is ${speedup.toFixed(2)}x faster than Ollama (using M4 Pro GPU!)`);
    }
  } else {
    console.log('❌ MLX: Not available (macOS Apple Silicon only)');
  }
  
  console.log('\n💡 Next steps:');
  if (ollamaResult.success) {
    console.log('   ✅ Ollama is ready - you can use it for development');
  }
  if (mlxResult.success) {
    console.log('   🍎 MLX is ready - perfect for macOS production!');
  }
  if (!mlxResult.success && process.platform === 'darwin') {
    console.log('   🚀 Setup MLX to leverage your M4 Pro GPU (see instructions above)');
  }
  console.log('   📊 Run full benchmark: bun benchmarks/provider-comparison.ts');
}

main().catch(console.error);

