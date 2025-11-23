# 🏛️ Gannicus

**LLM-powered synthetic data generation for TypeScript**

Gannicus is a modern library for generating realistic synthetic data using Large Language Models. Built with Bun for maximum performance, it combines the power of LLMs with strong typing, intelligent caching, and a declarative API.

> **Status:** v0.1 MVP - Ollama provider with Phi-3 Mini support

## Why Gannicus?

Faker is outdated. It generates predictable, context-free data from finite lists. LLMs can create data that looks genuinely human: with logical coherence, natural variation, and contextual nuance.

**Gannicus bridges this gap:**
- ✅ LLM-powered generation with coherence between fields
- ✅ Strong TypeScript typing with Zod integration
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

# Pull Phi-3 Mini model (3.8B parameters)
ollama pull phi3:mini
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

# Generate data
gannicus generate

# Show help
gannicus --help
```

### Programmatic Usage

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

// Generate data
const result = await generate(userSchema, {
  count: 100,
  provider: {
    name: 'ollama',
    model: 'phi3:mini',
  },
});

console.log(result.data); // Array of 100 user records
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

## Examples

See `examples/` directory:

- `basic-usage.ts` - Simple user generation
- `coherence-example.ts` - Tech companies with related fields

Run examples:
```bash
bun run examples/basic-usage.ts
bun run examples/coherence-example.ts
```

## Architecture

Gannicus uses a layered architecture:

1. **Schema Layer** - Declarative schema definition with strong typing
2. **Planning Engine** - Analyzes dependencies and optimizes generation order
3. **Provider Layer** - Unified interface for LLM providers
4. **Generation Engine** - Orchestrates generation with batching and coherence
5. **CLI Layer** - Beautiful interactive CLI with @clack/prompts

## Performance

**With Ollama + Phi-3 Mini (local):**
- ~40-45 tokens/sec on consumer laptop
- 100 records with 3 LLM fields: ~2-3 minutes
- Zero cost, complete privacy

**Future providers:**
- **Groq** (cloud): 241-814 tokens/sec - 1000 records in ~1-2 minutes
- **vLLM** (self-hosted): ~50-100 tokens/sec
- **OpenAI/Anthropic** (cloud): Maximum quality

## Roadmap

### v0.1 - MVP ✅
- [x] Schema system (llm, static, number, enum, derived)
- [x] Ollama provider with Phi-3 Mini
- [x] Generation engine with dependency resolution
- [x] Basic CLI with @clack/prompts
- [x] Example schemas

### v0.2 - Production-ready (planned)
- [ ] Groq provider (game-changer for speed)
- [ ] OpenAI and Anthropic providers
- [ ] Coherence system (MVP has basic support)
- [ ] Intelligent batching
- [ ] Cache layer
- [ ] First template (e-commerce)

### v0.3 - Scale (planned)
- [ ] Multi-entity relationships
- [ ] 5+ production templates
- [ ] Statistical distributions
- [ ] Full TUI with progress tracking

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
```

## Project Structure

```
gannicus/
├── packages/
│   ├── core/           # Core library
│   │   ├── src/
│   │   │   ├── schema/      # Schema builders
│   │   │   ├── providers/   # LLM providers
│   │   │   ├── generator/   # Generation engine
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   └── cli/            # CLI application
│       ├── src/
│       │   ├── commands/    # CLI commands
│       │   └── index.ts
│       └── package.json
├── examples/           # Usage examples
├── package.json        # Monorepo root
└── README.md
```

## Tech Stack

- **Runtime:** Bun 1.3+ (native TypeScript, superior async performance)
- **Language:** TypeScript 5.9+
- **Validation:** Zod (planned for v0.2)
- **CLI:** @clack/prompts (same as Astro)
- **LLM Provider:** Ollama (v0.1), Groq/OpenAI/Anthropic (v0.2+)

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
