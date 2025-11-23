# 🏛️ Gannicus

> LLM-powered synthetic data generation for TypeScript | Generate realistic, coherent synthetic data with AI

**Gannicus** is a modern library for generating realistic synthetic data using Large Language Models. Built with Bun for maximum performance, it combines the power of LLMs with strong typing, intelligent caching, batching, and a declarative API.

[![npm version](https://img.shields.io/npm/v/gannicus.svg)](https://www.npmjs.com/package/gannicus) [![npm downloads](https://img.shields.io/npm/dm/gannicus.svg)](https://www.npmjs.com/package/gannicus) [![License](https://img.shields.io/npm/l/gannicus.svg)](https://www.npmjs.com/package/gannicus) [![Bun](https://img.shields.io/badge/bun-1.3+-orange.svg)](https://bun.sh) [![Status](https://img.shields.io/badge/status-stable-green.svg)](./CHANGELOG.md) [![CI/CD](https://github.com/Arakiss/gannicus/actions/workflows/release.yml/badge.svg)](https://github.com/Arakiss/gannicus/actions/workflows/release.yml) [![GitHub stars](https://img.shields.io/github/stars/Arakiss/gannicus)](https://github.com/Arakiss/gannicus) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/) [![Test Coverage](https://img.shields.io/badge/coverage-85.89%25-brightgreen.svg)](./packages/core)

> **✨ Stable Release**: Gannicus v0.3 is production-ready with multiple providers (Ollama, SGLang, MLX, vLLM), intelligent caching, batching, and model recommendations. See [CHANGELOG](./CHANGELOG.md) for latest updates.

## ✨ Features

### Core Architecture

- 🤖 **LLM-Powered Generation** - Generate realistic, coherent data using Large Language Models
- 🎯 **Declarative Schema API** - No manual prompt engineering required
- 🔒 **Type-Safe by Default** - Strong TypeScript typing throughout
- ⚡ **Bun-Native** - Leverages Bun 1.3+ for superior performance
- 🏗️ **Monorepo Architecture** - Clean separation between core library and CLI

### Field Types

- 📝 **LLM Field** - AI-generated values with examples and coherence
- 🔢 **Number Field** - Random numbers with range and decimal precision
- 📋 **Enum Field** - Random selection with optional weighted distribution
- 🔗 **Derived Field** - Computed from other fields using TypeScript functions
- 📌 **Static Field** - Fixed values for constants

### Coherence System

- 🧠 **Automatic Context Injection** - Fields automatically receive context from related fields
- 🔄 **Bidirectional Coherence** - Declare relationships between any fields
- 🎨 **Natural Variation** - Each generation is unique while maintaining coherence
- 📊 **Smart Prompting** - Context-aware prompts for realistic data

### Performance & Optimization

- ⚡ **Intelligent Caching** - 5-10x faster on repeated runs with hash-based caching
- 📦 **Real Batching** - Group similar LLM requests to reduce API calls (5-10x reduction)
- 🚀 **Fast Development Mode** - Optimized mode using fastest models + aggressive caching
- 💰 **Cost Calculator** - Estimate costs before generating large datasets
- 📈 **Cache Statistics** - Track cache hits, hit rates, and performance metrics

### Model Management

- 🎯 **Model Recommendations** - Auto-selects best model based on use case
- 📊 **Benchmarked Models** - All recommended models have 100% success rate
- 🔧 **Multiple Use Cases** - Development (speed), Production (quality), Quality (best), Speed (fastest)
- 📝 **Rich Metadata** - Detailed model information (RAM, benchmarks, strengths, limitations)

### Provider Support

**Self-Hosted (v0.3):**
- 🏠 **Ollama** - Zero-cost local generation, perfect for development
- ⚡ **SGLang** - High-performance production inference, 26k+ tokens/sec (Linux/CUDA)
- 🍎 **MLX** - Apple Silicon optimized inference, leverages Metal GPU (macOS)
- 🚀 **vLLM** - High-performance inference runtime (Linux/CUDA)

**Cloud (v0.3 - coming soon):**
- ☁️ **Groq** - Ultra-fast cloud generation
- 🌐 **OpenAI** - GPT models
- 🤖 **Anthropic** - Claude models

### Developer Experience

- 🎨 **Beautiful CLI** - Highly configurable CLI with extensive options
- 🔌 **Programmatic API** - Full control with hooks, transformations, and validations
- 📚 **Comprehensive Examples** - Usage examples for common scenarios
- 🧪 **Benchmarks** - Compare Gannicus with Faker (quality, speed, cost)
- 📖 **Complete Documentation** - Value proposition, scalability, model recommendations

### Advanced Features

- 🎣 **Generation Hooks** - `onStart`, `beforeRecord`, `afterRecord`, `onComplete`, `onError`
- 🔄 **Transformations** - Transform records and fields during generation
- ✅ **Validations** - Validate records and fields with custom logic
- 🔁 **Retry Logic** - Automatic retries with configurable limits
- ⏱️ **Timeout Handling** - Configurable timeouts for LLM requests
- 📊 **Metadata & Statistics** - Detailed generation stats and cost estimates

## 🚀 Quick Start

### Prerequisites

1. Install [Bun](https://bun.sh):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Choose your LLM provider:

**Option A: Ollama (Development & Small Production)**
```bash
# macOS
brew install ollama

# Start Ollama
ollama serve

# Pull recommended models (auto-selected by Gannicus)
ollama pull llama3.2:3b  # Fastest for development (recommended)
ollama pull qwen2.5:7b   # Best for production (recommended)
ollama pull llama3.1:8b  # Alternative production option
```

**Option B: SGLang (Production & Large Datasets - Linux/CUDA only)**
```bash
# Install SGLang
pip install "sglang[all]"

# Start SGLang server (requires GPU)
python -m sglang.launch_server \
  --model-path Qwen/Qwen2.5-7B-Instruct \
  --port 30000

# Or use a remote SGLang instance
# Update baseURL in provider config to point to your server
```

**Option C: MLX (macOS Apple Silicon - M1/M2/M3/M4)**
```bash
# Install MLX
pip install mlx-lm

# Start MLX server
python -m mlx_lm server \
  --model mlx-community/Llama-3.2-3B-Instruct \
  --port 8080

# First run will download the model (~4-5 GB)
```

**Option D: vLLM (Production - Linux/CUDA only)**
```bash
# Install vLLM
pip install vllm

# Start vLLM server (requires NVIDIA GPU)
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --port 8000

# vLLM provides excellent throughput for production workloads
```

**When to use each:**
- **Ollama**: Development, testing, small datasets (<10k records), all platforms
- **SGLang**: Production pipelines, large datasets (10k+ records), Linux/CUDA only, maximum throughput
- **MLX**: macOS Apple Silicon, leverages GPU for better performance than Ollama
- **vLLM**: Production workloads on Linux servers with NVIDIA GPUs

### Installation

Gannicus is published as two separate packages:

**1. Core Library** (`gannicus`) - For programmatic use:
```bash
bun add gannicus
```

**2. CLI Tool** (`gannicus-cli`) - For command-line usage:
```bash
bun install -g gannicus-cli
```

> **Note**: Both packages are published to npm. The CLI depends on the core library, so installing the CLI globally also gives you access to the core library functionality.

### CLI Usage

```bash
# Interactive mode
gannicus

# Generate data with schema file
gannicus generate --schema-file schema.ts

# Generate with inline schema
gannicus generate --schema '{"name": "llm(\"A name\")"}'

# Use specific model
gannicus generate --model llama3.2:3b --count 100

# Fast development mode (uses caching + fastest model)
gannicus generate --use-case development --count 50

# Production mode (best quality)
gannicus generate --use-case production --count 1000

# Show all options
gannicus generate --help
```

### Programmatic Usage

#### Basic Example

```typescript
import { defineSchema, llm, number, enumField, derived, generate } from 'gannicus';

// Define your schema
const userSchema = defineSchema({
  name: llm('A realistic full name'),
  age: number(18, 65),
  country: enumField(['USA', 'UK', 'Canada', 'Germany']),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
  }),
});

// Generate data (auto-selects best model)
const result = await generate(userSchema, {
  count: 100,
  provider: {
    name: 'ollama',
    useCase: 'development', // Auto-selects llama3.2:3b
  },
});

console.log(result.data); // Array of 100 user records
console.log(result.stats); // Generation statistics
console.log(result.metadata?.costEstimate); // Cost/time estimates
```

#### Advanced Example with Coherence

```typescript
const companySchema = defineSchema({
  industry: enumField(['Technology', 'Finance', 'Healthcare']),
  name: llm('A realistic company name', {
    coherence: ['industry'], // Company name matches industry
  }),
  tagline: llm('A compelling tagline', {
    coherence: ['name', 'industry'], // Tagline matches both
  }),
  bio: llm('A professional bio', {
    coherence: ['name', 'industry', 'tagline'], // Fully coherent
  }),
});

const result = await generate(companySchema, {
  count: 50,
  provider: { name: 'ollama', useCase: 'production' },
  batchSize: 10, // Enable batching for faster generation
});
```

#### Production with SGLang (High-Performance - Linux/CUDA)

```typescript
// For production workloads with 10k+ records
const result = await generate(userSchema, {
  count: 10000,
  provider: {
    name: 'sglang',
    model: 'Qwen/Qwen2.5-7B-Instruct', // Recommended: equivalent to qwen2.5:7b
    baseURL: 'http://your-gpu-server:30000', // SGLang endpoint
  },
});

// SGLang provides 26k+ tokens/sec vs Ollama's ~100 tokens/sec
// Perfect for large-scale production pipelines
```

#### Production with MLX (macOS Apple Silicon)

```typescript
// For macOS users with M1/M2/M3/M4 chips
const result = await generate(userSchema, {
  count: 10000,
  provider: {
    name: 'mlx',
    model: 'mlx-community/Llama-3.2-3B-Instruct', // Recommended for MLX
    baseURL: 'http://localhost:8080', // MLX server endpoint
  },
});

// MLX leverages Metal GPU for better performance than Ollama
// Perfect for macOS production workloads
```

#### Production with vLLM (Linux/CUDA)

```typescript
// For production workloads on Linux servers with NVIDIA GPUs
const result = await generate(userSchema, {
  count: 10000,
  provider: {
    name: 'vllm',
    model: 'Qwen/Qwen2.5-7B-Instruct', // Recommended for vLLM
    baseURL: 'http://localhost:8000', // vLLM server endpoint
  },
});

// vLLM provides excellent throughput for production workloads
// Perfect for Linux servers with NVIDIA GPUs
```

**When to use each:**
- **Ollama**: Development, testing, small datasets (<1000 records), all platforms
- **SGLang**: Production pipelines (10k+ records), Linux/CUDA only, maximum throughput
- **MLX**: macOS Apple Silicon, leverages GPU, better performance than Ollama
- **vLLM**: Production workloads on Linux servers with NVIDIA GPUs, excellent throughput

#### Recommended Models

**For Ollama:**
- `llama3.2:3b` - Fastest for development (888ms avg latency)
- `qwen2.5:7b` - Best for production (1441ms avg latency, default)
- `llama3.1:8b` - Production alternative (1530ms avg latency)

**For SGLang (HuggingFace format):**
- `Qwen/Qwen2.5-7B-Instruct` - Recommended for production (equivalent to qwen2.5:7b)
- `meta-llama/Llama-3.2-3B-Instruct` - Fast development option (equivalent to llama3.2:3b)
- `meta-llama/Llama-3.1-8B-Instruct` - Alternative production option (equivalent to llama3.1:8b)

**For MLX (macOS Apple Silicon):**
- `mlx-community/Llama-3.2-3B-Instruct` - Recommended for MLX (optimized for Metal GPU)

**For vLLM (Linux/CUDA):**
- `Qwen/Qwen2.5-7B-Instruct` - Recommended for production (equivalent to qwen2.5:7b)
- `meta-llama/Llama-3.2-3B-Instruct` - Fast development option (equivalent to llama3.2:3b)

All recommended models have 100% success rate in comprehensive benchmarks. See [packages/core/src/models/README.md](packages/core/src/models/README.md) for detailed model information.

#### Fast Development Mode

```typescript
import { generateFast } from 'gannicus';

// Uses fastest model + aggressive caching + batching
const result = await generateFast(userSchema, {
  count: 100,
  useCache: true,
  useBatching: true,
});

// Second run is 5-10x faster due to caching
const result2 = await generateFast(userSchema, {
  count: 100,
  useCache: true,
});
```

## 🎯 Commands

### `gannicus generate` (or `gannicus g`)

Generate synthetic data from a schema definition.

```bash
# Interactive mode
gannicus generate

# Alias: gannicus g
gannicus g
```

**Schema Input Options:**

- `--schema <json>` - Inline JSON schema
- `--schema-file <path>` - Path to TypeScript/JSON schema file
- `--schema-stdin` - Read schema from stdin

**Model Selection:**

- `--model <id>` - Use specific model (e.g., `llama3.2:3b`)
- `--use-case <case>` - Auto-select model by use case (`development`, `production`, `quality`, `speed`)
- `--temperature <number>` - Override model temperature (0.0-2.0)
- `--base-url <url>` - Ollama base URL (default: `http://localhost:11434`)

**Output Formatting:**

- `--format <format>` - Output format (`json`, `csv`, `ndjson`)
- `--pretty` - Pretty-print JSON output
- `--indent <number>` - JSON indentation (default: 2)

**Advanced Options:**

- `--quiet` - Suppress progress output
- `--verbose` - Show detailed logs
- `--events` - Emit events as JSON (for programmatic consumption)
- `--stream` - Stream results as they're generated
- `--no-progress` - Disable progress bar
- `--max-retries <number>` - Max retries per field (default: 3)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)
- `--batch-size <number>` - Batch size for LLM requests (default: 1)
- `--concurrency <number>` - Max concurrent requests (default: 1)
- `--config <path>` - Path to config file

**Examples:**

```bash
# Generate 100 users with development model
gannicus generate --schema-file user-schema.ts --count 100 --use-case development

# Generate with inline schema
gannicus generate --schema '{"name": "llm(\"A name\")"}' --count 50

# Production mode with batching
gannicus generate --schema-file schema.ts --use-case production --batch-size 10 --count 1000

# Stream results
gannicus generate --schema-file schema.ts --stream --format ndjson

# Use specific model
gannicus generate --model qwen2.5:7b --schema-file schema.ts --count 200
```

## 📁 Project Structure

### Monorepo Structure

```
gannicus/
├── packages/
│   ├── core/              # Core library (gannicus)
│   │   ├── src/
│   │   │   ├── schema/         # Schema builders
│   │   │   ├── providers/      # LLM providers (Ollama)
│   │   │   ├── generator/      # Generation engine
│   │   │   │   ├── index.ts         # Main generator
│   │   │   │   ├── fast-mode.ts     # Fast dev mode
│   │   │   │   └── batch-processor.ts # Batching
│   │   │   ├── cache/          # Intelligent caching
│   │   │   ├── cost/           # Cost calculator
│   │   │   ├── models/         # Model recommendations
│   │   │   └── types/          # TypeScript types
│   │   └── package.json
│   └── cli/               # CLI application (gannicus-cli)
│       ├── src/
│       │   ├── commands/       # CLI commands
│       │   └── index.ts
│       └── package.json
├── examples/              # Usage examples
├── benchmarks/            # Performance benchmarks
├── docs/                  # Documentation
│   ├── VALUE-PROPOSITION.md
│   ├── SCALABILITY.md
│   └── FEATURES.md
└── README.md
```

## 🛠️ Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Bun | 1.3+ |
| Language | TypeScript | 5.9+ |
| LLM Provider | Ollama | Latest |
| LLM Provider | SGLang | Latest |
| LLM Provider | MLX | Latest |
| LLM Provider | vLLM | Latest |
| LLM Provider | Groq | v0.3 (coming soon) |
| LLM Provider | OpenAI | v0.3 (coming soon) |
| LLM Provider | Anthropic | v0.3 (coming soon) |
| Caching | Hash-based LRU | Built-in |
| Batching | Custom processor | Built-in |

## 💡 Philosophy

**Gannicus** is built on these principles:

1. **LLM-First** - Leverage the power of LLMs for realistic, coherent data generation
2. **Type Safety** - Strong TypeScript typing throughout for better DX
3. **Performance** - Intelligent caching and batching for speed
4. **Developer Experience** - Declarative API, no manual prompt engineering
5. **Zero-Cost Local** - Use Ollama for free local generation
6. **Production-Ready** - Built for real-world use cases with proper error handling

## 🔄 Comparison

### Gannicus vs Faker

| Feature | Faker | Gannicus (Local) | Gannicus (Groq) |
|---------|-------|------------------|-----------------|
| Speed (rec/s) | 10,000+ | 3-30 (cached) | 50-100 |
| Realism | 30/100 | 100/100 | 100/100 |
| Coherence | 0% | 100% | 100% |
| Uniqueness | 10% | 100% | 100% |
| Variation | 20% | 100% | 100% |
| Cost (10K) | $0.00 | $0.00 | $0.01 |
| Cost (100K) | $0.00 | $0.00 | $0.14 |

**When to use Gannicus:**
- ✅ Development/testing (100-10K records)
- ✅ Production seeds (1K-100K records)
- ✅ Quality-critical use cases
- ✅ When coherence matters
- ✅ When uniqueness and variation are important

**When to use Faker:**
- ✅ Load testing (1M+ records)
- ✅ Simple random data
- ✅ Speed is everything
- ✅ No coherence requirements

See [docs/VALUE-PROPOSITION.md](docs/VALUE-PROPOSITION.md) for detailed comparison.

## 📊 Performance

### Local (Ollama) - Development

**Development Mode (llama3.2:3b):**
- ~3 rec/s (first run)
- ~15-30 rec/s (cached runs, 5-10x faster)
- 1K records: ~5 minutes (first), ~30 seconds (cached)
- 10K records: ~50 minutes (first), ~5 minutes (cached)
- Cost: $0.00
- **Perfect for:** Development, testing, prototyping (<1000 records)

**Production Mode (qwen2.5:7b):**
- ~2 rec/s (first run)
- ~10-20 rec/s (cached runs)
- 1K records: ~8 minutes (first), ~1 minute (cached)
- 10K records: ~80 minutes (first), ~10 minutes (cached)
- Cost: $0.00
- **Perfect for:** Small production workloads (<10k records)

### Self-Hosted Production

**SGLang (Linux/CUDA):**
- ~26k tokens/sec (vs Ollama's ~100 tokens/sec)
- ~100-200 rec/s (depending on model and hardware)
- 1K records: ~5-10 seconds
- 10K records: ~30-60 seconds
- 100K records: ~5-10 minutes
- Cost: $0.00 (self-hosted)
- **Perfect for:** Production pipelines, large datasets (10k+ records)
- **Setup:** Requires GPU server with SGLang installed

**MLX (macOS Apple Silicon):**
- Leverages Metal GPU for acceleration
- ~1-2 rec/s (better than Ollama on macOS)
- 1K records: ~8-15 minutes
- Cost: $0.00 (self-hosted)
- **Perfect for:** macOS production workloads, Apple Silicon optimization
- **Setup:** `pip install mlx-lm` then start server

**vLLM (Linux/CUDA):**
- High-performance inference runtime
- ~120-160 req/sec, 50-80ms TTFT
- Excellent throughput for production workloads
- Cost: $0.00 (self-hosted)
- **Perfect for:** Production workloads on Linux servers with NVIDIA GPUs
- **Setup:** `pip install vllm` then start server

### Cloud (Groq) - Coming Soon

**Projected Performance:**
- ~50 rec/s (can be 100+ with batching)
- 1K records: ~20 seconds
- 10K records: ~3 minutes
- 100K records: ~30 minutes
- Cost: ~$0.14 for 100K records

## 📦 Packages

Gannicus is published as two npm packages:

### `gannicus`
The core library for programmatic use. Install it in your project:
```bash
bun add gannicus
```

**Use cases:**
- Building applications that generate synthetic data
- Integrating Gannicus into your own tools
- Using the programmatic API with full control

### `gannicus-cli`
The command-line interface. Install it globally or locally:
```bash
# Global installation
bun install -g gannicus-cli

# Local installation (in your project)
bun add -d gannicus-cli
```

**Use cases:**
- Quick data generation from terminal
- CI/CD pipelines
- One-off data generation tasks
- LLM integration (the CLI is designed to be LLM-friendly)

Both packages are versioned together and published automatically via CI/CD.

## 📝 Versioning & Releases

Gannicus uses [Changesets](https://github.com/changesets/changesets) for semantic versioning and changelog management.

### Release Process

1. **Create Changeset**: Developers create changesets describing their changes
   ```bash
   bun run changeset
   ```

2. **Version Bump**: When changesets are merged, CI/CD automatically:
   - Updates package versions based on changeset types (major/minor/patch)
   - Updates CHANGELOG.md
   - Creates a version bump PR

3. **Publish**: When the version bump PR is merged:
   - Both `gannicus` and `gannicus-cli` are published to npm
   - A GitHub Release is created automatically
   - All packages are versioned together

### Recent Releases

- **v0.3.0** (Current) - 🎉 Multiple providers, benchmarks, and production-ready features
  - **SGLang Provider** - High-performance production inference (26k+ tokens/sec, Linux/CUDA)
  - **MLX Provider** - Apple Silicon optimized inference leveraging Metal GPU (macOS)
  - **vLLM Provider** - High-performance inference runtime for Linux/CUDA servers
  - **Hybrid Generation Types** - Type definitions for cost-effective massive dataset generation
  - **Comprehensive Benchmarks** - Provider comparison and performance testing tools
  - **End-to-End Tests** - Full test coverage for all providers
  - **Enhanced Error Handling** - Timeouts, retries, and better error messages
  - **Production Examples** - Complete examples for all providers
  - **macOS Documentation** - Guide for Apple Silicon users

- **v0.2.1** - Fix error handling in OllamaProvider and update README with correct model recommendations
- **v0.2.0** - Production-ready release with intelligent caching, batching, and model recommendations
  - Intelligent caching system (5-10x speedup on repeated runs)
  - Real batching for efficient LLM calls
  - Model recommendations system with rich metadata
  - Cost calculator for cloud providers
  - Fast development mode for rapid iteration
  - Enhanced CLI with extensive configuration options
  - Programmatic API with hooks, transformations, and validations
  - Comprehensive test suite (85.89% coverage)
  - Benchmarks comparing Gannicus with Faker

See [CHANGELOG](./CHANGELOG.md) for complete version history.

### Roadmap

**v0.3 - Multiple Providers (✅ Complete)**
- ✅ SGLang provider (Linux/CUDA)
- ✅ MLX provider (macOS Apple Silicon)
- ✅ vLLM provider (Linux/CUDA)
- ✅ Comprehensive benchmarks
- ✅ Production examples
- ✅ Enhanced error handling

**v0.4 - Scale (planned)**
- [ ] **Hybrid Generation Strategies** - Cost-effective massive dataset generation
  - Seed + Expand: Generate 1K seeds with LLM, expand to 1M+ locally (€1 vs €320)
  - Multi-Tenant Distribution: Realistic SaaS tenant distribution (€3-5 for 1M records)
  - Time-Series Distribution: Realistic temporal patterns (€0.10 for 1M records)
- [ ] Groq provider (game-changer for speed)
- [ ] OpenAI and Anthropic providers
- [ ] Multi-entity relationships
- [ ] Statistical distributions
- [ ] Template library (e-commerce, SaaS, etc.)

**v1.0 - Release (planned)**
- [ ] 10+ templates
- [ ] Complete documentation
- [ ] Performance benchmarks
- [ ] Community-ready

## 🧪 Testing & Benchmarks

### Quick Test

Test both providers quickly:

```bash
# Quick test (5 records)
bun benchmarks/quick-test.ts
```

### Full Benchmark

Compare Ollama vs SGLang performance:

```bash
# Full benchmark comparison
bun benchmarks/provider-comparison.ts
```

The benchmark will:
- ✅ Check provider availability
- ✅ Test with different record counts (10, 50, 100)
- ✅ Measure throughput (records/sec)
- ✅ Compare performance
- ✅ Provide recommendations

**Example Output:**
```
📊 BENCHMARK RESULTS
================================================================================

✅ Successful Benchmarks:

Provider    Model                          Records    Duration     Records/sec      Avg Latency      LLM Calls
--------------------------------------------------------------------------------
ollama      llama3.2:3b                   100        45.23s       2.21             452.30ms         200
sglang      Qwen/Qwen2.5-7B-Instruct      100        8.15s       12.27            81.50ms          200

⚡ PERFORMANCE COMPARISON
================================================================================

Speed Improvement: 5.55x faster with SGLang
Throughput Ratio: 5.55x more records/sec with SGLang

Time Saved: 37.08s

For 10,000 records:
  Ollama: ~1.26h
  SGLang: ~13.58min
```

## 📚 Documentation

- [Value Proposition](docs/VALUE-PROPOSITION.md) - When to use Gannicus vs Faker
- [Scalability](docs/SCALABILITY.md) - Performance analysis and optimizations
- [Features](docs/FEATURES.md) - Complete feature documentation
- [Model Recommendations](packages/core/src/models/README.md) - Choosing the right model

## 🧪 Examples

See `examples/` directory:

- `basic-usage.ts` - Simple user generation
- `coherence-example.ts` - Tech companies with related fields
- `fast-development.ts` - Fast mode with caching
- `model-recommendations.ts` - Using model recommendations

Run examples:
```bash
bun run examples/basic-usage.ts
bun run examples/coherence-example.ts
bun run examples/fast-development.ts
```

## 🏃 Benchmarks

Compare Gannicus with Faker:

```bash
# Quality comparison (shows real value difference)
bun run benchmarks/quality-comparison.ts

# Speed and cost comparison
bun run benchmarks/faker-vs-gannicus.ts
```

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run CLI in dev mode
bun dev

# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build

# Run benchmarks
bun run benchmarks/quality-comparison.ts
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## 📄 License

MIT © [Arakiss](https://github.com/Arakiss)

## 🙏 Acknowledgments

- [Bun](https://bun.sh) - The amazing all-in-one JavaScript runtime
- [Ollama](https://ollama.ai) - Local LLM inference made easy
- [Faker](https://fakerjs.dev) - Inspiration for synthetic data generation
- The open-source community for feedback and contributions

---

**Made with ❤️ for the indie hacker community** | [GitHub](https://github.com/Arakiss/gannicus) | [Issues](https://github.com/Arakiss/gannicus/issues)

**Built with Bun. Powered by LLMs. Made for developers.**
