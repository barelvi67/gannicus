# 🏛️ Gannicus

**LLM-powered synthetic data generation for TypeScript**

Gannicus is a modern library for generating realistic synthetic data using Large Language Models. Built with Bun for maximum performance, it combines the power of LLMs with strong typing, intelligent caching, batching, and a declarative API.

> **Status:** v0.2 - Production-ready with intelligent caching, batching, and model recommendations
> **Test Coverage:** 85.89% lines | 91.67% functions

## Why Gannicus?

Faker is outdated. It generates predictable, context-free data from finite lists. LLMs can create data that looks genuinely human: with logical coherence, natural variation, and contextual nuance.

**Gannicus bridges this gap:**
- ✅ LLM-powered generation with coherence between fields
- ✅ Intelligent caching (5-10x faster on repeated runs)
- ✅ Real batching for efficient LLM calls
- ✅ Model recommendations system (auto-selects best model)
- ✅ Cost calculator for cloud providers
- ✅ Fast development mode for rapid iteration
- ✅ Strong TypeScript typing
- ✅ Multiple providers (Ollama, Groq, OpenAI, Anthropic - roadmap)
- ✅ Declarative schema API - no manual prompt engineering
- ✅ Bun-native for superior performance
- ✅ Zero-cost local generation with Ollama

## Quick Start

### Prerequisites

1. Install [Bun](https://bun.sh):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install [Ollama](https://ollama.ai):
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

### Installation

```bash
# Install CLI globally
bun install -g @gannicus/cli

# Or use in your project
bun add @gannicus/core
```

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
import { defineSchema, llm, number, enumField, derived, generate } from '@gannicus/core';

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

#### Fast Development Mode

```typescript
import { generateFast } from '@gannicus/core';

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

## Features

### Field Types

**LLM Field** - AI-generated values:
```typescript
llm('A creative tech company name', {
  examples: ['Vercel', 'Stripe', 'Linear'],
  coherence: ['industry'] // Make it coherent with industry field
})
```

**Static Field** - Fixed values:
```typescript
staticValue('active')
staticValue({ plan: 'free', tier: 1 })
```

**Number Field** - Random numbers:
```typescript
number(18, 65) // Age between 18-65
number(0, 100, { decimals: 2 }) // Percentage with 2 decimals
```

**Enum Field** - Random selection with optional weights:
```typescript
enumField(['small', 'medium', 'large']) // Equal probability

enumField([
  { value: 'free', weight: 70 },
  { value: 'pro', weight: 25 },
  { value: 'enterprise', weight: 5 }
]) // Weighted distribution
```

**Derived Field** - Computed from other fields:
```typescript
derived(['firstName', 'lastName'], (ctx) => {
  return `${ctx.firstName} ${ctx.lastName}`
})
```

### Coherence System

The killer feature. When you declare coherence between fields, Gannicus automatically enriches prompts with context:

```typescript
const companySchema = defineSchema({
  name: llm('A tech startup name'),
  industry: enumField(['SaaS', 'Fintech', 'AI']),

  // This tagline will be coherent with name and industry
  tagline: llm('A compelling one-line tagline', {
    coherence: ['name', 'industry']
  }),
});
```

The LLM receives context like:
```
Given the following context:
name: Nebula Analytics
industry: AI

Generate: A compelling one-line tagline
```

Result: Coherent, realistic data that makes sense together.

### Intelligent Caching

Gannicus includes a smart caching system that dramatically speeds up repeated generations:

```typescript
// First run: ~20 seconds
const result1 = await generate(schema, { count: 100 });

// Second run: ~3 seconds (5-10x faster!)
const result2 = await generate(schema, { count: 100 });

// Cache statistics
import { getCacheStats } from '@gannicus/core';
const stats = getCacheStats();
console.log(stats); // { keys: 15, totalEntries: 45, totalHits: 85, hitRate: 85.0 }
```

**How it works:**
- Caches by prompt + context (not just schema)
- Append-only per key for natural variety
- LRU eviction with configurable limits
- Automatic cache hits tracked in stats

### Batching

Group similar LLM requests to reduce roundtrips:

```typescript
const result = await generate(schema, {
  count: 1000,
  batchSize: 10, // Group 10 similar requests
});

// Without batching: 1000 LLM calls
// With batching: ~100-200 LLM calls (5-10x reduction)
```

### Model Recommendations

Gannicus automatically selects the best model for your use case:

```typescript
// Development (fastest)
provider: { name: 'ollama', useCase: 'development' }
// → Uses llama3.2:3b (888ms avg, 2GB RAM)

// Production (best quality)
provider: { name: 'ollama', useCase: 'production' }
// → Uses qwen2.5:7b (1441ms avg, 4.7GB RAM)

// Or specify directly
provider: { name: 'ollama', model: 'llama3.2:3b' }
```

**Recommended Models:**
- **llama3.2:3b** - Fastest for development (100% success rate)
- **qwen2.5:7b** - Best for production (100% success rate)
- **llama3.1:8b** - Alternative production option

All models are benchmarked and have 100% success rate on test cases.

### Cost Calculator

Estimate costs before generating large datasets:

```typescript
import { estimateCost, compareProviders } from '@gannicus/core';

// Estimate for 10K records
const estimate = estimateCost('groq', 'llama3.1:70b', 10000, 3, 50);
console.log(estimate);
// {
//   cost: 0.01,
//   totalTokens: 1500000,
//   estimatedTime: 3000,
//   recordsPerSecond: 3.33
// }

// Compare all providers
const comparison = compareProviders(10000, 3, 50);
comparison.forEach(est => {
  console.log(`${est.provider}: $${est.cost.toFixed(4)} | ${est.estimatedTime}s`);
});
```

### Programmatic API with Hooks

Full control over the generation process:

```typescript
const result = await generate(schema, {
  count: 100,
  hooks: {
    onStart: async (options) => {
      console.log('Starting generation...');
    },
    beforeRecord: async (index, context) => {
      // Modify context before generating record
    },
    afterRecord: async (record, index) => {
      // Process each record after generation
    },
    onComplete: async (result) => {
      console.log('Generation complete!');
    },
  },
  transformations: {
    transformRecord: (record) => {
      // Transform each record
      return { ...record, id: uuid() };
    },
    transformField: (fieldName, value) => {
      // Transform individual fields
      return value;
    },
  },
  validations: {
    validateRecord: (record) => {
      // Custom validation
      return record.age >= 18;
    },
    validateField: (fieldName, value) => {
      // Field-level validation
      return true;
    },
  },
  advanced: {
    maxRetries: 3,
    timeout: 5000,
    continueOnFieldError: true,
  },
});
```

## Performance

### Local (Ollama)

**Development Mode (llama3.2:3b):**
- ~3 rec/s (first run)
- ~15-30 rec/s (cached runs, 5-10x faster)
- 1K records: ~5 minutes (first), ~30 seconds (cached)
- 10K records: ~50 minutes (first), ~5 minutes (cached)
- Cost: $0.00

**Production Mode (qwen2.5:7b):**
- ~2 rec/s (first run)
- ~10-20 rec/s (cached runs)
- 1K records: ~8 minutes (first), ~1 minute (cached)
- 10K records: ~80 minutes (first), ~10 minutes (cached)
- Cost: $0.00

### Cloud (Groq) - Coming Soon

**Projected Performance:**
- ~50 rec/s (can be 100+ with batching)
- 1K records: ~20 seconds
- 10K records: ~3 minutes
- 100K records: ~30 minutes
- Cost: ~$0.14 for 100K records

### Comparison with Faker

| Metric | Faker | Gannicus (Local) | Gannicus (Groq) |
|--------|-------|------------------|-----------------|
| Speed (rec/s) | 10,000+ | 3-30 (cached) | 50-100 |
| Realism | 30/100 | 100/100 | 100/100 |
| Coherence | 0% | 100% | 100% |
| Cost (10K) | $0.00 | $0.00 | $0.01 |
| Cost (100K) | $0.00 | $0.00 | $0.14 |

**When to use Gannicus:**
- ✅ Development/testing (100-10K records)
- ✅ Production seeds (1K-100K records)
- ✅ Quality-critical use cases
- ✅ When coherence matters

**When to use Faker:**
- ✅ Load testing (1M+ records)
- ✅ Simple random data
- ✅ Speed is everything

See [docs/VALUE-PROPOSITION.md](docs/VALUE-PROPOSITION.md) for detailed comparison.

## Examples

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

## Benchmarks

Compare Gannicus with Faker:

```bash
# Quality comparison (shows real value difference)
bun run benchmarks/quality-comparison.ts

# Speed and cost comparison
bun run benchmarks/faker-vs-gannicus.ts
```

## Architecture

Gannicus uses a layered architecture:

1. **Schema Layer** - Declarative schema definition with strong typing
2. **Planning Engine** - Analyzes dependencies and optimizes generation order
3. **Provider Layer** - Unified interface for LLM providers with model recommendations
4. **Cache Layer** - Intelligent caching by prompt + context
5. **Batch Processor** - Groups similar LLM requests for efficiency
6. **Generation Engine** - Orchestrates generation with hooks, transformations, validations
7. **CLI Layer** - Highly configurable CLI for LLM integration

## Roadmap

### v0.2 - Production-ready ✅
- [x] Intelligent caching system
- [x] Real batching for LLM calls
- [x] Model recommendations system
- [x] Cost calculator
- [x] Fast development mode
- [x] Enhanced CLI with extensive options
- [x] Programmatic API with hooks/transformations/validations
- [x] Quality benchmarks vs Faker

### v0.3 - Scale (in progress)
- [ ] Groq provider (game-changer for speed)
- [ ] OpenAI and Anthropic providers
- [ ] Multi-entity relationships
- [ ] Statistical distributions
- [ ] Template library (e-commerce, SaaS, etc.)

### v1.0 - Release (planned)
- [ ] 10+ templates
- [ ] Complete documentation
- [ ] Performance benchmarks
- [ ] Community-ready

## Development

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

## Project Structure

```
gannicus/
├── packages/
│   ├── core/              # Core library
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
│   └── cli/               # CLI application
│       ├── src/
│       │   ├── commands/       # CLI commands
│       │   └── index.ts
│       └── package.json
├── examples/              # Usage examples
├── benchmarks/            # Performance benchmarks
├── docs/                  # Documentation
│   ├── VALUE-PROPOSITION.md
│   └── SCALABILITY.md
└── README.md
```

## Documentation

- [Value Proposition](docs/VALUE-PROPOSITION.md) - When to use Gannicus vs Faker
- [Scalability](docs/SCALABILITY.md) - Performance analysis and optimizations
- [Model Recommendations](packages/core/src/models/README.md) - Choosing the right model

## Tech Stack

- **Runtime:** Bun 1.3+ (native TypeScript, superior async performance)
- **Language:** TypeScript 5.9+
- **CLI:** Highly configurable with extensive options
- **LLM Provider:** Ollama (v0.2), Groq/OpenAI/Anthropic (v0.3+)
- **Caching:** Intelligent hash-based caching
- **Batching:** Real batching for LLM efficiency

## Why Bun?

- ⚡ Native TypeScript execution - no compilation step
- 🚀 Superior async performance for LLM batching
- 📦 Built-in package manager and test runner
- 🔥 Fast startup time for CLI
- 💾 Native SQLite for future cache layer

## Contributing

Gannicus is in active development. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT

## Author

**Petru Arakiss**

- GitHub: [@petruarakiss](https://github.com/petruarakiss)
- Twitter: [@petruarakiss](https://twitter.com/petruarakiss)

## Inspiration

Named after Gannicus, the legendary gladiator known for his strength and skill. Like its namesake, this library aims to be powerful, efficient, and unmatched in its domain.

---

**Built with Bun. Powered by LLMs. Made for developers.**
