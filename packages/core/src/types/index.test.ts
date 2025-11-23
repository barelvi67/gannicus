/**
 * Type System Tests
 * Tests type compatibility, inference, and runtime behavior
 */

import { describe, test, expect } from 'bun:test';
import type {
  FieldType,
  BaseField,
  LLMField,
  StaticField,
  NumberField,
  EnumField,
  DerivedField,
  Field,
  Schema,
  GenerationContext,
  LLMProvider,
  ProviderConfig,
  GenerateOptions,
  GenerationResult,
} from './index.ts';

describe('Type System', () => {
  describe('FieldType', () => {
    test('accepts valid field types', () => {
      const validTypes: FieldType[] = [
        'llm',
        'static',
        'number',
        'enum',
        'derived',
      ];

      expect(validTypes).toHaveLength(5);
      expect(validTypes).toContain('llm');
      expect(validTypes).toContain('static');
    });
  });

  describe('Field Interfaces', () => {
    test('LLMField has correct structure', () => {
      const field: LLMField = {
        type: 'llm',
        prompt: 'A realistic name',
        coherence: ['age'],
        examples: ['John', 'Jane'],
        description: 'User name',
      };

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('A realistic name');
      expect(field.coherence).toEqual(['age']);
      expect(field.examples).toEqual(['John', 'Jane']);
      expect(field.description).toBe('User name');
    });

    test('LLMField works with minimal properties', () => {
      const field: LLMField = {
        type: 'llm',
        prompt: 'A name',
      };

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('A name');
      expect(field.coherence).toBeUndefined();
      expect(field.examples).toBeUndefined();
    });

    test('StaticField has correct structure', () => {
      const field: StaticField = {
        type: 'static',
        value: 'active',
        description: 'Status field',
      };

      expect(field.type).toBe('static');
      expect(field.value).toBe('active');
      expect(field.description).toBe('Status field');
    });

    test('StaticField accepts any value type', () => {
      const stringField: StaticField = { type: 'static', value: 'text' };
      const numberField: StaticField = { type: 'static', value: 42 };
      const boolField: StaticField = { type: 'static', value: true };
      const objectField: StaticField = {
        type: 'static',
        value: { key: 'value' },
      };

      expect(stringField.value).toBe('text');
      expect(numberField.value).toBe(42);
      expect(boolField.value).toBe(true);
      expect(objectField.value).toEqual({ key: 'value' });
    });

    test('NumberField has correct structure', () => {
      const field: NumberField = {
        type: 'number',
        min: 18,
        max: 65,
        decimals: 2,
        description: 'Age range',
      };

      expect(field.type).toBe('number');
      expect(field.min).toBe(18);
      expect(field.max).toBe(65);
      expect(field.decimals).toBe(2);
    });

    test('NumberField works without decimals', () => {
      const field: NumberField = {
        type: 'number',
        min: 0,
        max: 100,
      };

      expect(field.decimals).toBeUndefined();
    });

    test('EnumField with string array', () => {
      const field: EnumField = {
        type: 'enum',
        options: ['small', 'medium', 'large'],
      };

      expect(field.type).toBe('enum');
      expect(field.options).toEqual(['small', 'medium', 'large']);
    });

    test('EnumField with weighted options', () => {
      const field: EnumField = {
        type: 'enum',
        options: [
          { value: 'free', weight: 70 },
          { value: 'pro', weight: 25 },
          { value: 'enterprise', weight: 5 },
        ],
      };

      expect(field.type).toBe('enum');
      expect(field.options).toHaveLength(3);
      expect((field.options as any)[0].weight).toBe(70);
    });

    test('DerivedField has correct structure', () => {
      const computeFn = (ctx: Record<string, any>) => ctx.a + ctx.b;
      const field: DerivedField = {
        type: 'derived',
        depends: ['a', 'b'],
        compute: computeFn,
        description: 'Sum of a and b',
      };

      expect(field.type).toBe('derived');
      expect(field.depends).toEqual(['a', 'b']);
      expect(field.compute).toBe(computeFn);
      expect(field.compute({ a: 1, b: 2 })).toBe(3);
    });

    test('DerivedField compute function can return any type', () => {
      const stringField: DerivedField = {
        type: 'derived',
        depends: ['name'],
        compute: (ctx) => ctx.name.toUpperCase(),
      };

      const numberField: DerivedField = {
        type: 'derived',
        depends: ['price', 'qty'],
        compute: (ctx) => ctx.price * ctx.qty,
      };

      const objectField: DerivedField = {
        type: 'derived',
        depends: ['user'],
        compute: (ctx) => ({ ...ctx.user, verified: true }),
      };

      expect(stringField.compute({ name: 'john' })).toBe('JOHN');
      expect(numberField.compute({ price: 10, qty: 5 })).toBe(50);
      expect(objectField.compute({ user: { id: 1 } })).toEqual({
        id: 1,
        verified: true,
      });
    });
  });

  describe('Field Union Type', () => {
    test('Field union accepts all field types', () => {
      const fields: Field[] = [
        { type: 'llm', prompt: 'A name' },
        { type: 'static', value: 'test' },
        { type: 'number', min: 0, max: 100 },
        { type: 'enum', options: ['a', 'b'] },
        { type: 'derived', depends: ['x'], compute: (ctx) => ctx.x },
      ];

      expect(fields).toHaveLength(5);
      expect(fields[0].type).toBe('llm');
      expect(fields[1].type).toBe('static');
      expect(fields[2].type).toBe('number');
      expect(fields[3].type).toBe('enum');
      expect(fields[4].type).toBe('derived');
    });
  });

  describe('Schema Type', () => {
    test('Schema is a record of fields', () => {
      const schema: Schema = {
        name: { type: 'llm', prompt: 'A name' },
        age: { type: 'number', min: 18, max: 65 },
        status: { type: 'static', value: 'active' },
      };

      expect(Object.keys(schema)).toEqual(['name', 'age', 'status']);
      expect(schema.name.type).toBe('llm');
      expect(schema.age.type).toBe('number');
      expect(schema.status.type).toBe('static');
    });

    test('Schema can be empty', () => {
      const schema: Schema = {};
      expect(Object.keys(schema)).toHaveLength(0);
    });
  });

  describe('GenerationContext', () => {
    test('has correct structure', () => {
      const context: GenerationContext = {
        schema: {
          name: { type: 'llm', prompt: 'A name' },
        },
        generatedFields: {
          name: 'John Doe',
        },
        recordIndex: 0,
      };

      expect(context.schema).toBeDefined();
      expect(context.generatedFields).toEqual({ name: 'John Doe' });
      expect(context.recordIndex).toBe(0);
    });
  });

  describe('LLMProvider Interface', () => {
    test('implements required generate method', async () => {
      const provider: LLMProvider = {
        name: 'test-provider',
        generate: async (prompt: string) => {
          return `Generated: ${prompt}`;
        },
      };

      const result = await provider.generate('test prompt');
      expect(result).toBe('Generated: test prompt');
      expect(provider.name).toBe('test-provider');
    });

    test('can implement optional generateBatch method', async () => {
      const provider: LLMProvider = {
        name: 'batch-provider',
        generate: async (prompt: string) => prompt,
        generateBatch: async (prompts: string[]) => {
          return prompts.map((p) => `Batch: ${p}`);
        },
      };

      const results = await provider.generateBatch!(['p1', 'p2']);
      expect(results).toEqual(['Batch: p1', 'Batch: p2']);
    });

    test('generate accepts optional context', async () => {
      const provider: LLMProvider = {
        name: 'context-provider',
        generate: async (prompt: string, context?: Record<string, any>) => {
          if (context) {
            return `${prompt} with ${JSON.stringify(context)}`;
          }
          return prompt;
        },
      };

      const withContext = await provider.generate('test', { name: 'John' });
      const withoutContext = await provider.generate('test');

      expect(withContext).toContain('{"name":"John"}');
      expect(withoutContext).toBe('test');
    });
  });

  describe('ProviderConfig', () => {
    test('supports all provider names', () => {
      const configs: ProviderConfig[] = [
        { name: 'ollama' },
        { name: 'groq' },
        { name: 'openai' },
        { name: 'anthropic' },
      ];

      expect(configs[0].name).toBe('ollama');
      expect(configs[1].name).toBe('groq');
      expect(configs[2].name).toBe('openai');
      expect(configs[3].name).toBe('anthropic');
    });

    test('supports optional configuration', () => {
      const config: ProviderConfig = {
        name: 'ollama',
        model: 'phi3:mini',
        baseURL: 'http://localhost:11434',
        apiKey: 'test-key',
        options: {
          temperature: 0.7,
          topP: 0.9,
        },
      };

      expect(config.model).toBe('phi3:mini');
      expect(config.baseURL).toBe('http://localhost:11434');
      expect(config.apiKey).toBe('test-key');
      expect(config.options?.temperature).toBe(0.7);
    });
  });

  describe('GenerateOptions', () => {
    test('has required properties', () => {
      const options: GenerateOptions = {
        count: 100,
        provider: { name: 'ollama' },
      };

      expect(options.count).toBe(100);
      expect(options.provider.name).toBe('ollama');
    });

    test('supports all optional properties', () => {
      const progressCallback = (progress: number, total: number) => {
        console.log(`${progress}/${total}`);
      };

      const options: GenerateOptions = {
        count: 1000,
        provider: { name: 'groq', model: 'gemma-7b' },
        seed: 12345,
        batchSize: 20,
        onProgress: progressCallback,
      };

      expect(options.seed).toBe(12345);
      expect(options.batchSize).toBe(20);
      expect(options.onProgress).toBe(progressCallback);
    });
  });

  describe('GenerationResult', () => {
    test('has correct structure', () => {
      const result: GenerationResult<Schema> = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
        stats: {
          totalRecords: 2,
          llmCalls: 2,
          duration: 1500,
          provider: 'ollama',
          model: 'phi3:mini',
        },
      };

      expect(result.data).toHaveLength(2);
      expect(result.stats.totalRecords).toBe(2);
      expect(result.stats.llmCalls).toBe(2);
      expect(result.stats.duration).toBe(1500);
      expect(result.stats.provider).toBe('ollama');
      expect(result.stats.model).toBe('phi3:mini');
    });

    test('data array can be empty', () => {
      const result: GenerationResult<Schema> = {
        data: [],
        stats: {
          totalRecords: 0,
          llmCalls: 0,
          duration: 0,
          provider: 'ollama',
          model: 'phi3:mini',
        },
      };

      expect(result.data).toHaveLength(0);
      expect(result.stats.totalRecords).toBe(0);
    });

    test('preserves schema type inference', () => {
      type UserSchema = {
        name: LLMField;
        age: NumberField;
      };

      const result: GenerationResult<UserSchema> = {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
        stats: {
          totalRecords: 2,
          llmCalls: 2,
          duration: 1000,
          provider: 'ollama',
          model: 'phi3:mini',
        },
      };

      // TypeScript should infer correct types
      const firstRecord = result.data[0];
      expect(firstRecord.name).toBe('John');
      expect(firstRecord.age).toBe(30);
    });
  });

  describe('Type Guards', () => {
    test('can differentiate field types at runtime', () => {
      const fields: Field[] = [
        { type: 'llm', prompt: 'A name' },
        { type: 'static', value: 'test' },
        { type: 'number', min: 0, max: 100 },
        { type: 'enum', options: ['a'] },
        { type: 'derived', depends: ['x'], compute: (ctx) => ctx.x },
      ];

      const isLLMField = (field: Field): field is LLMField =>
        field.type === 'llm';
      const isStaticField = (field: Field): field is StaticField =>
        field.type === 'static';
      const isNumberField = (field: Field): field is NumberField =>
        field.type === 'number';
      const isEnumField = (field: Field): field is EnumField =>
        field.type === 'enum';
      const isDerivedField = (field: Field): field is DerivedField =>
        field.type === 'derived';

      expect(isLLMField(fields[0])).toBe(true);
      expect(isStaticField(fields[1])).toBe(true);
      expect(isNumberField(fields[2])).toBe(true);
      expect(isEnumField(fields[3])).toBe(true);
      expect(isDerivedField(fields[4])).toBe(true);
    });

    test('type guards enable access to specific properties', () => {
      const field: Field = { type: 'llm', prompt: 'A name' };

      const isLLMField = (f: Field): f is LLMField => f.type === 'llm';

      if (isLLMField(field)) {
        // TypeScript now knows this is an LLMField
        expect(field.prompt).toBe('A name');
      } else {
        throw new Error('Expected LLMField');
      }
    });
  });

  describe('BaseField', () => {
    test('all fields extend BaseField', () => {
      const llmField: LLMField = { type: 'llm', prompt: 'test' };
      const staticField: StaticField = { type: 'static', value: 'test' };
      const numberField: NumberField = { type: 'number', min: 0, max: 10 };
      const enumField: EnumField = { type: 'enum', options: ['a'] };
      const derivedField: DerivedField = {
        type: 'derived',
        depends: [],
        compute: () => null,
      };

      // All should have 'type' property from BaseField
      expect(llmField.type).toBeDefined();
      expect(staticField.type).toBeDefined();
      expect(numberField.type).toBeDefined();
      expect(enumField.type).toBeDefined();
      expect(derivedField.type).toBeDefined();
    });

    test('all fields can have optional description', () => {
      const withDesc: LLMField = {
        type: 'llm',
        prompt: 'test',
        description: 'Test field',
      };
      const withoutDesc: LLMField = { type: 'llm', prompt: 'test' };

      expect(withDesc.description).toBe('Test field');
      expect(withoutDesc.description).toBeUndefined();
    });
  });
});
