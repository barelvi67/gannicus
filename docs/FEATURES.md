# Gannicus Features

Complete feature documentation for Gannicus.

## Core Features

### 1. Schema System

Declarative schema definition with strong TypeScript typing:

```typescript
import { defineSchema, llm, number, enumField, derived } from '@gannicus/core';

const schema = defineSchema({
  name: llm('A realistic full name'),
  age: number(18, 65),
  role: enumField(['Developer', 'Designer', 'Manager']),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
  }),
});
```

### 2. Field Types

#### LLM Field
AI-generated values with optional coherence:

```typescript
llm('A creative company name')
llm('A professional bio', {
  coherence: ['name', 'company'], // Makes bio coherent with name/company
  examples: ['Example 1', 'Example 2'], // Optional examples
})
```

#### Static Field
Fixed values:

```typescript
staticValue('active')
staticValue({ plan: 'free', tier: 1 })
```

#### Number Field
Random numbers within range:

```typescript
number(18, 65) // Age between 18-65
number(0, 100, { decimals: 2 }) // Percentage with 2 decimals
```

#### Enum Field
Random selection with optional weights:

```typescript
enumField(['small', 'medium', 'large'])

enumField([
  { value: 'free', weight: 70 },
  { value: 'pro', weight: 25 },
  { value: 'enterprise', weight: 5 }
])
```

#### Derived Field
Computed from other fields:

```typescript
derived(['firstName', 'lastName'], (ctx) => {
  return `${ctx.firstName} ${ctx.lastName}`;
})
```

### 3. Coherence System

Automatically enriches prompts with context for logical relationships:

```typescript
const schema = defineSchema({
  industry: enumField(['Technology', 'Finance']),
  company: llm('A company name', {
    coherence: ['industry'], // Company matches industry
  }),
  tagline: llm('A tagline', {
    coherence: ['company', 'industry'], // Tagline matches both
  }),
});
```

### 4. Intelligent Caching

Smart caching system that dramatically speeds up repeated generations:

- **Hash-based caching** by provider, model, prompt, and context
- **Append-only per key** for natural variety
- **LRU eviction** with configurable limits
- **Automatic cache hits** tracked in stats

```typescript
import { getCacheStats, clearCache } from '@gannicus/core';

// First run: ~20 seconds
const result1 = await generate(schema, { count: 100 });

// Second run: ~3 seconds (5-10x faster!)
const result2 = await generate(schema, { count: 100 });

// Cache statistics
const stats = getCacheStats();
console.log(stats);
// {
//   keys: 15,
//   totalEntries: 45,
//   totalHits: 85,
//   hitRate: 85.0
// }

// Clear cache
clearCache();
```

### 5. Batching

Groups similar LLM requests to reduce roundtrips:

```typescript
const result = await generate(schema, {
  count: 1000,
  batchSize: 10, // Group 10 similar requests
});

// Without batching: 1000 LLM calls
// With batching: ~100-200 LLM calls (5-10x reduction)
```

### 6. Model Recommendations

Automatically selects the best model for your use case:

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

### 7. Cost Calculator

Estimate costs before generating large datasets:

```typescript
import { estimateCost, compareProviders, formatCostEstimate } from '@gannicus/core';

// Estimate for 10K records
const estimate = estimateCost('groq', 'llama3.1:70b', 10000, 3, 50);
console.log(estimate);
// {
//   provider: 'groq',
//   model: 'llama3.1:70b',
//   records: 10000,
//   llmFields: 3,
//   tokensPerRecord: 50,
//   totalTokens: 1500000,
//   cost: 0.01,
//   estimatedTime: 3000,
//   recordsPerSecond: 3.33
// }

// Compare all providers
const comparison = compareProviders(10000, 3, 50);
comparison.forEach(est => {
  console.log(formatCostEstimate(est));
  // "10,000 records: 3.0min | $0.01 | 3.3 rec/s"
});
```

### 8. Fast Development Mode

Optimized mode for rapid iteration:

```typescript
import { generateFast } from '@gannicus/core';

// Uses fastest model + aggressive caching + batching
const result = await generateFast(schema, {
  count: 100,
  useCache: true,
  useBatching: true,
});

// Second run is 5-10x faster due to caching
const result2 = await generateFast(schema, {
  count: 100,
  useCache: true,
});
```

### 9. Programmatic API

Full control over the generation process with hooks, transformations, and validations:

```typescript
const result = await generate(schema, {
  count: 100,
  
  // Hooks
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
  
  // Transformations
  transformations: {
    transformRecord: (record) => {
      // Transform each record
      return { ...record, id: uuid(), createdAt: new Date() };
    },
    transformField: (fieldName, value) => {
      // Transform individual fields
      if (fieldName === 'email') {
        return value.toLowerCase();
      }
      return value;
    },
    filterRecord: (record) => {
      // Filter records
      return record.age >= 18;
    },
  },
  
  // Validations
  validations: {
    validateRecord: (record) => {
      // Custom validation
      return record.age >= 18 && record.email.includes('@');
    },
    validateField: (fieldName, value) => {
      // Field-level validation
      if (fieldName === 'age') {
        return typeof value === 'number' && value >= 18;
      }
      return true;
    },
  },
  
  // Advanced options
  advanced: {
    maxRetries: 3,
    timeout: 5000,
    continueOnFieldError: true,
  },
});
```

### 10. CLI Options

Highly configurable CLI for LLM integration:

```bash
# Schema input
--schema '{"name": "llm(\"A name\")"}'
--schema-file schema.ts
--schema-stdin

# Model selection
--model llama3.2:3b
--use-case development|production|quality|speed
--temperature 0.5
--base-url http://localhost:11434

# Output formatting
--format json|csv|ndjson
--pretty
--indent 2

# Advanced behavior
--quiet
--verbose
--events
--stream
--no-progress
--max-retries 3
--timeout 5000
--batch-size 10
--concurrency 5
--config config.json
```

## Performance Features

### Caching Strategy

- **Hash-based keys**: `provider:model:promptHash:contextHash`
- **Append-only**: Multiple values per key for variety
- **LRU eviction**: Configurable limits (default: 1000 keys, 10 values/key)
- **Automatic tracking**: Cache hits tracked in generation stats

### Batching Strategy

- **Groups similar requests**: Same prompt + context = same batch
- **Configurable batch size**: Default 10, adjustable
- **Automatic flushing**: Flushes when batch is full or after timeout
- **Fallback support**: Falls back to sequential if batch API unavailable

### Model Selection

- **Use case-based**: Auto-selects best model for development/production
- **Benchmark-driven**: All models tested with 100% success rate
- **Temperature optimization**: Auto-configures temperature per model
- **Resource-aware**: Considers RAM requirements

## Use Cases

### Development & Testing
- Generate realistic test data
- Rapid iteration with caching
- Fast development mode

### Production Seeds
- Professional demo data
- Realistic seed data for apps
- Multi-entity relationships

### Quality-Critical
- UI/UX testing with realistic data
- Documentation examples
- Training data for RAG/fine-tuning

## Best Practices

1. **Use caching** for repeated generations
2. **Enable batching** for large datasets (100+ records)
3. **Use fast mode** for development iteration
4. **Specify use case** instead of model directly
5. **Use coherence** for related fields
6. **Estimate costs** before large generations
7. **Use hooks** for custom processing
8. **Validate data** with custom validations

## Limitations

- **Speed**: Slower than Faker (but much more realistic)
- **Cost**: Cloud providers cost money (but local is free)
- **Scale**: Not ideal for 1M+ records (use Faker or hybrid approach)

See [VALUE-PROPOSITION.md](VALUE-PROPOSITION.md) for detailed comparison with Faker.

