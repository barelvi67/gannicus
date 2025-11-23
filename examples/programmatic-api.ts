/**
 * Example: Extremely Programmatic API Usage
 * 
 * Demonstrates all the powerful programmatic features of Gannicus:
 * - Hooks for customizing behavior
 * - Transformations for post-processing
 * - Validations for data quality
 * - Advanced error handling
 * - Rich metadata and statistics
 */

import {
  generate,
  defineSchema,
  llm,
  number,
  enumField,
  derived,
  OllamaProvider,
} from '../packages/core/src/index.ts';
import type {
  GenerateOptions,
  GenerationHooks,
  Transformations,
  Validations,
  AdvancedOptions,
} from '../packages/core/src/types/index.ts';

// Example 1: Basic programmatic usage
async function example1_Basic() {
  console.log('=== Example 1: Basic Programmatic Usage ===\n');

  const schema = defineSchema({
    name: llm('A realistic full name'),
    age: number(18, 65),
    email: derived(['name'], (ctx) => {
      return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    }),
  });

  const result = await generate(schema, {
    count: 5,
    provider: { name: 'ollama', model: 'llama3.2:3b' },
  });

  console.log('Generated records:', result.data);
  console.log('Stats:', result.stats);
  console.log('Metadata:', result.metadata);
}

// Example 2: Using hooks for customization
async function example2_Hooks() {
  console.log('\n=== Example 2: Using Hooks ===\n');

  const schema = defineSchema({
    name: llm('A tech company name'),
    industry: enumField(['SaaS', 'Fintech', 'AI']),
  });

  const hooks: GenerationHooks = {
    onStart: async (options) => {
      console.log('🚀 Generation started with options:', options);
    },
    beforeRecord: async (index, context) => {
      console.log(`  📝 Starting record ${index}`);
    },
    beforeField: async (fieldName, field, context) => {
      console.log(`    🔧 Generating field: ${fieldName}`);
    },
    afterField: async (fieldName, value, field, context) => {
      console.log(`    ✅ Generated ${fieldName}: ${value}`);
      return value;
    },
    afterRecord: async (record, index, context) => {
      console.log(`  ✨ Completed record ${index}:`, record);
      return record;
    },
    onComplete: async (result) => {
      console.log('🎉 Generation completed!');
      console.log('   Total records:', result.stats.totalRecords);
      console.log('   LLM calls:', result.stats.llmCalls);
      console.log('   Duration:', result.stats.duration, 'ms');
    },
  };

  await generate(schema, {
    count: 3,
    provider: { name: 'ollama', model: 'llama3.2:3b' },
    hooks,
  });
}

// Example 3: Transformations for post-processing
async function example3_Transformations() {
  console.log('\n=== Example 3: Transformations ===\n');

  const schema = defineSchema({
    name: llm('A product name'),
    price: number(10, 100),
  });

  const transformations: Transformations = {
    transformField: async (fieldName, value, record) => {
      // Transform price to include currency
      if (fieldName === 'price') {
        return `$${value.toFixed(2)}`;
      }
      return value;
    },
    transformRecord: async (record, index) => {
      // Add metadata to each record
      return {
        ...record,
        id: `REC-${String(index + 1).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
      };
    },
    filterRecord: async (record, index) => {
      // Only include records with price > 50
      const price = parseFloat(record.price.replace('$', ''));
      return price > 50;
    },
  };

  const result = await generate(schema, {
    count: 10,
    provider: { name: 'ollama', model: 'llama3.2:3b' },
    transformations,
  });

  console.log('Transformed records:', result.data);
  console.log('Filtered out:', result.stats.filtered, 'records');
}

// Example 4: Validations for data quality
async function example4_Validations() {
  console.log('\n=== Example 4: Validations ===\n');

  const schema = defineSchema({
    email: llm('A valid email address'),
    age: number(18, 100),
  });

  const validations: Validations = {
    validateField: async (fieldName, value, record) => {
      if (fieldName === 'email' && !value.includes('@')) {
        throw new Error(`Invalid email format: ${value}`);
      }
      if (fieldName === 'age' && (value < 18 || value > 100)) {
        throw new Error(`Age out of range: ${value}`);
      }
      return true;
    },
    validateRecord: async (record, index) => {
      // Ensure email and age are consistent
      if (record.email && record.age) {
        const domain = record.email.split('@')[1];
        if (domain === 'university.edu' && record.age < 18) {
          throw new Error('University email requires age >= 18');
        }
      }
      return true;
    },
  };

  const result = await generate(schema, {
    count: 5,
    provider: { name: 'ollama', model: 'llama3.2:3b' },
    validations,
    advanced: {
      continueOnFieldError: true, // Continue even if validation fails
    },
  });

  console.log('Validated records:', result.data);
  if (result.errors) {
    console.log('Validation errors:', result.errors);
  }
}

// Example 5: Advanced error handling
async function example5_ErrorHandling() {
  console.log('\n=== Example 5: Advanced Error Handling ===\n');

  const schema = defineSchema({
    name: llm('A company name'),
    description: llm('A company description'),
  });

  const advanced: AdvancedOptions = {
    maxRetries: 3,
    timeout: 5000,
    stopOnError: false,
    continueOnFieldError: true,
    errorHandler: async (error, context) => {
      console.log(`⚠️  Error in ${context.fieldName}:`, error.message);
      // Return fallback value
      return `[Error: ${error.message}]`;
    },
  };

  const hooks: GenerationHooks = {
    onError: async (error, context) => {
      console.log(`❌ Error at record ${context.recordIndex}, field ${context.fieldName}:`, error.message);
    },
  };

  const result = await generate(schema, {
    count: 5,
    provider: { name: 'ollama', model: 'llama3.2:3b' },
    advanced,
    hooks,
  });

  console.log('Records with error handling:', result.data);
  console.log('Errors encountered:', result.stats.errors || 0);
}

// Example 6: Complete programmatic workflow
async function example6_CompleteWorkflow() {
  console.log('\n=== Example 6: Complete Programmatic Workflow ===\n');

  const schema = defineSchema({
    id: derived([], () => crypto.randomUUID()),
    name: llm('A realistic person name'),
    email: derived(['name'], (ctx) => {
      return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    }),
    age: number(18, 80),
    role: enumField(['Developer', 'Designer', 'Manager', 'Analyst']),
    bio: llm('A professional bio', {
      coherence: ['name', 'role'],
    }),
  });

  const options: GenerateOptions = {
    count: 10,
    provider: { name: 'ollama', model: 'qwen2.5:7b', useCase: 'production' },
    seed: 42, // Reproducible
    hooks: {
      onStart: async () => console.log('🚀 Starting generation...'),
      onProgress: (current, total) => {
        const percent = Math.floor((current / total) * 100);
        if (percent % 25 === 0) {
          console.log(`  Progress: ${percent}%`);
        }
      },
      onComplete: async (result) => {
        console.log('✅ Generation complete!');
        console.log(`   Records: ${result.stats.totalRecords}`);
        console.log(`   LLM Calls: ${result.stats.llmCalls}`);
        console.log(`   Duration: ${result.stats.duration}ms`);
        console.log(`   Avg per record: ${(result.stats.duration / result.stats.totalRecords).toFixed(0)}ms`);
      },
    },
    transformations: {
      transformRecord: async (record) => ({
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    },
    validations: {
      validateRecord: async (record) => {
        // Ensure email format is valid
        return record.email.includes('@');
      },
    },
    advanced: {
      maxRetries: 2,
      continueOnFieldError: true,
    },
  };

  const result = await generate(schema, options);

  console.log('\n📊 Final Results:');
  console.log(JSON.stringify(result.data.slice(0, 3), null, 2));
  console.log('\n📈 Statistics:');
  console.log(JSON.stringify(result.stats, null, 2));
  console.log('\n📋 Metadata:');
  console.log(JSON.stringify(result.metadata, null, 2));
}

// Run examples
async function main() {
  try {
    // Check Ollama availability
    const provider = new OllamaProvider();
    const health = await provider.healthCheck();
    
    if (!health.ok) {
      console.error('❌ Ollama is not available:', health.message);
      console.error('Please install and start Ollama: https://ollama.ai');
      process.exit(1);
    }

    console.log('✅ Ollama is ready\n');

    // Run examples
    await example1_Basic();
    await example2_Hooks();
    await example3_Transformations();
    await example4_Validations();
    await example5_ErrorHandling();
    await example6_CompleteWorkflow();

    console.log('\n✨ All examples completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

