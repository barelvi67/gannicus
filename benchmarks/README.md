# 🧪 Provider Benchmarks

Complete guide to test and compare inference engines (Ollama vs SGLang).

## 🚀 Quick Start

### Step 1: Verify Ollama

```bash
# Verify Ollama is running
ollama serve

# In another terminal, check available models
ollama list

# If you don't have recommended models, download them:
ollama pull llama3.2:3b   # For development (faster)
ollama pull qwen2.5:7b    # For production (better quality)
```

### Step 2: Quick Test

```bash
# Quick test with both providers (5 records)
bun benchmarks/quick-test.ts
```

This test will verify:
- ✅ Ollama availability
- ✅ SGLang availability (if running)
- ✅ Data generation with each provider
- ✅ Basic speed metrics

### Step 3: Full Benchmark

```bash
# Full benchmark with different sizes (10, 50, 100 records)
bun benchmarks/provider-comparison.ts
```

## 📊 What the Benchmark Measures

The benchmark compares:

1. **Throughput**: Records per second
2. **Latency**: Average time per record
3. **Total Time**: Complete generation duration
4. **LLM Calls**: Number of LLM API calls
5. **Efficiency**: Direct comparison between providers

## 🔧 SGLang Setup (Optional)

To test SGLang you need:

### Requirements
- GPU with CUDA (NVIDIA)
- Python 3.8+
- ~20GB disk space

### Installation

```bash
# Install SGLang
pip install "sglang[all]"

# Download model (may take several minutes)
# Model downloads automatically on first use
```

### Start Server

```bash
# Start SGLang with recommended model
python -m sglang.launch_server \
  --model-path Qwen/Qwen2.5-7B-Instruct \
  --port 30000

# Or with smaller model for development
python -m sglang.launch_server \
  --model-path meta-llama/Llama-3.2-3B-Instruct \
  --port 30000
```

**Note**: SGLang server must be running before executing benchmarks.

## 📈 Expected Results

### Ollama (llama3.2:3b)
- **Speed**: ~1-3 records/second
- **Use**: Development, testing, prototyping
- **Advantage**: Quick setup, no GPU required

### SGLang (Qwen/Qwen2.5-7B-Instruct)
- **Speed**: ~10-50+ records/second
- **Use**: Production, large datasets
- **Advantage**: 5-10x faster than Ollama

## 🎯 Recommended Use Cases

### Use Ollama when:
- ✅ Development and testing
- ✅ Small datasets (<1000 records)
- ✅ No GPU available
- ✅ Need quick setup

### Use SGLang when:
- ✅ Production
- ✅ Large datasets (10k+ records)
- ✅ GPU available
- ✅ Need maximum performance

## 🔍 Troubleshooting

### Ollama not responding
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama
ollama serve
```

### SGLang not responding
```bash
# Verify server is running
curl http://localhost:30000/v1/models

# Check server logs
# Review the terminal where you started SGLang
```

### Model not found
```bash
# Ollama: Download model
ollama pull llama3.2:3b

# SGLang: Model downloads automatically on first use
# If it fails, check your internet connection and disk space
```

## 📝 Example Output

```
🚀 Provider Performance Benchmark

Checking provider availability...

✅ Ollama ready
✅ SGLang ready

================================================================================
Running benchmarks...
================================================================================

📝 Testing with 10 records...

  Testing Ollama (llama3.2:3b)...
    ✅ 4.52s - 2.21 records/sec
  Testing SGLang (Qwen/Qwen2.5-7B-Instruct)...
    ✅ 0.82s - 12.20 records/sec

📝 Testing with 50 records...

  Testing Ollama (llama3.2:3b)...
    ✅ 22.15s - 2.26 records/sec
  Testing SGLang (Qwen/Qwen2.5-7B-Instruct)...
    ✅ 4.10s - 12.20 records/sec

📝 Testing with 100 records...

  Testing Ollama (llama3.2:3b)...
    ✅ 45.23s - 2.21 records/sec
  Testing SGLang (Qwen/Qwen2.5-7B-Instruct)...
    ✅ 8.15s - 12.27 records/sec

================================================================================
📊 BENCHMARK RESULTS
================================================================================

✅ Successful Benchmarks:

Provider    Model                          Records    Duration     Records/sec      Avg Latency      LLM Calls
--------------------------------------------------------------------------------
ollama      llama3.2:3b                   100        45.23s       2.21             452.30ms         200
sglang      Qwen/Qwen2.5-7B-Instruct      100        8.15s       12.27            81.50ms          200

================================================================================
⚡ PERFORMANCE COMPARISON
================================================================================

Speed Improvement: 5.55x faster with SGLang
Throughput Ratio: 5.55x more records/sec with SGLang

Time Saved: 37.08s

For 10,000 records:
  Ollama: ~1.26h
  SGLang: ~13.58min

================================================================================

💡 Recommendations:

Use Ollama for:
  ✅ Development and testing
  ✅ Small datasets (<1000 records)
  ✅ Quick prototyping
  ✅ Current speed: ~2.21 records/sec

Use SGLang for:
  ✅ Production pipelines
  ✅ Large datasets (10k+ records)
  ✅ Maximum throughput
  ✅ Current speed: ~12.27 records/sec
  ✅ 5.55x faster than Ollama
```

## 🎓 Next Steps

1. **Run the quick test** to verify everything works
2. **Run the full benchmark** to see detailed comparisons
3. **Test with your own schemas** using examples in `examples/`
4. **Optimize based on your needs** using benchmark recommendations

