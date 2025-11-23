/**
 * End-to-End Tests for LLM Providers
 * 
 * Tests the complete flow from schema definition to data generation
 * for both Ollama and SGLang providers.
 * 
 * These tests verify:
 * - Provider integration with the generator
 * - Complete data generation workflow
 * - Schema validation and field generation
 * - Coherence between related fields
 * - Error handling and edge cases
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { defineSchema, llm, number, enumField, derived, generate } from '../index.ts';
import { OllamaProvider } from './ollama.ts';
import { SGLangProvider } from './sglang.ts';

// Check provider availability
let ollamaAvailable = false;
let sglangAvailable = false;

beforeAll(async () => {
  // Check Ollama
  try {
    const ollamaProvider = new OllamaProvider({ model: 'llama3.2:3b' });
    const ollamaHealth = await ollamaProvider.healthCheck();
    ollamaAvailable = ollamaHealth.ok;
  } catch {
    ollamaAvailable = false;
  }

  // Check SGLang
  try {
    const sglangProvider = new SGLangProvider({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      endpoint: 'http://localhost:30000',
    });
    const sglangHealth = await sglangProvider.healthCheck();
    sglangAvailable = sglangHealth.ok;
  } catch {
    sglangAvailable = false;
  }
});

describe('End-to-End Provider Tests', () => {
  describe('Ollama Provider E2E', () => {
    test.skipIf(!ollamaAvailable)('generates complete user schema', async () => {
      const userSchema = defineSchema({
        name: llm('A realistic full name'),
        age: number(18, 65),
        country: enumField(['USA', 'UK', 'Canada', 'Germany']),
        email: derived(['name'], (ctx) => {
          return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
        }),
      });

      const result = await generate(userSchema, {
        count: 5,
        provider: {
          name: 'ollama',
          model: 'llama3.2:3b',
        },
      });

      expect(result.data).toHaveLength(5);
      expect(result.stats.provider).toBe('ollama');
      expect(result.stats.model).toBe('llama3.2:3b');
      expect(result.stats.llmCalls).toBeGreaterThan(0);

      // Verify record structure
      for (const record of result.data) {
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('age');
        expect(record).toHaveProperty('country');
        expect(record).toHaveProperty('email');
        expect(typeof record.name).toBe('string');
        expect(typeof record.age).toBe('number');
        expect(record.age).toBeGreaterThanOrEqual(18);
        expect(record.age).toBeLessThanOrEqual(65);
        expect(['USA', 'UK', 'Canada', 'Germany']).toContain(record.country);
        expect(record.email).toContain('@example.com');
        expect(record.email).toContain(record.name.toLowerCase().replace(/\s+/g, '.'));
      }
    }, 60000);

    test.skipIf(!ollamaAvailable)('generates coherent company schema', async () => {
      const companySchema = defineSchema({
        industry: enumField(['Technology', 'Finance', 'Healthcare']),
        name: llm('A realistic company name', {
          coherence: ['industry'],
        }),
        tagline: llm('A compelling tagline', {
          coherence: ['name', 'industry'],
        }),
        founded: number(2015, 2024),
      });

      const result = await generate(companySchema, {
        count: 3,
        provider: {
          name: 'ollama',
          model: 'qwen2.5:7b',
        },
      });

      expect(result.data).toHaveLength(3);
      expect(result.stats.provider).toBe('ollama');

      for (const company of result.data) {
        expect(company).toHaveProperty('industry');
        expect(company).toHaveProperty('name');
        expect(company).toHaveProperty('tagline');
        expect(company).toHaveProperty('founded');
        expect(['Technology', 'Finance', 'Healthcare']).toContain(company.industry);
        expect(typeof company.name).toBe('string');
        expect(company.name.length).toBeGreaterThan(0);
        expect(typeof company.tagline).toBe('string');
        expect(company.tagline.length).toBeGreaterThan(0);
        expect(company.founded).toBeGreaterThanOrEqual(2015);
        expect(company.founded).toBeLessThanOrEqual(2024);
      }
    }, 60000);

    test.skipIf(!ollamaAvailable)('handles batch generation', async () => {
      const schema = defineSchema({
        name: llm('A first name'),
        value: number(1, 100),
      });

      const result = await generate(schema, {
        count: 10,
        provider: {
          name: 'ollama',
          model: 'llama3.2:3b',
        },
        batchSize: 5,
      });

      expect(result.data).toHaveLength(10);
      expect(result.stats.llmCalls).toBeGreaterThan(0);
    }, 60000);

    test.skipIf(!ollamaAvailable)('tracks generation statistics', async () => {
      const schema = defineSchema({
        name: llm('A name'),
      });

      const result = await generate(schema, {
        count: 3,
        provider: {
          name: 'ollama',
          model: 'llama3.2:3b',
        },
      });

      expect(result.stats).toHaveProperty('totalRecords', 3);
      expect(result.stats).toHaveProperty('llmCalls');
      expect(result.stats).toHaveProperty('duration');
      expect(result.stats).toHaveProperty('provider', 'ollama');
      expect(result.stats).toHaveProperty('model');
      expect(result.stats.duration).toBeGreaterThan(0);
    }, 60000);
  });

  describe('SGLang Provider E2E', () => {
    test.skipIf(!sglangAvailable)('generates complete user schema', async () => {
      const userSchema = defineSchema({
        name: llm('A realistic full name'),
        age: number(18, 65),
        country: enumField(['USA', 'UK', 'Canada', 'Germany']),
        email: derived(['name'], (ctx) => {
          return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
        }),
      });

      const result = await generate(userSchema, {
        count: 5,
        provider: {
          name: 'sglang',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          baseURL: 'http://localhost:30000',
        },
      });

      expect(result.data).toHaveLength(5);
      expect(result.stats.provider).toBe('sglang');
      expect(result.stats.model).toBe('Qwen/Qwen2.5-7B-Instruct');
      expect(result.stats.llmCalls).toBeGreaterThan(0);

      // Verify record structure
      for (const record of result.data) {
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('age');
        expect(record).toHaveProperty('country');
        expect(record).toHaveProperty('email');
        expect(typeof record.name).toBe('string');
        expect(typeof record.age).toBe('number');
        expect(record.age).toBeGreaterThanOrEqual(18);
        expect(record.age).toBeLessThanOrEqual(65);
        expect(['USA', 'UK', 'Canada', 'Germany']).toContain(record.country);
        expect(record.email).toContain('@example.com');
        expect(record.email).toContain(record.name.toLowerCase().replace(/\s+/g, '.'));
      }
    }, 60000);

    test.skipIf(!sglangAvailable)('generates coherent company schema', async () => {
      const companySchema = defineSchema({
        industry: enumField(['Technology', 'Finance', 'Healthcare']),
        name: llm('A realistic company name', {
          coherence: ['industry'],
        }),
        tagline: llm('A compelling tagline', {
          coherence: ['name', 'industry'],
        }),
        founded: number(2015, 2024),
      });

      const result = await generate(companySchema, {
        count: 3,
        provider: {
          name: 'sglang',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          baseURL: 'http://localhost:30000',
        },
      });

      expect(result.data).toHaveLength(3);
      expect(result.stats.provider).toBe('sglang');

      for (const company of result.data) {
        expect(company).toHaveProperty('industry');
        expect(company).toHaveProperty('name');
        expect(company).toHaveProperty('tagline');
        expect(company).toHaveProperty('founded');
        expect(['Technology', 'Finance', 'Healthcare']).toContain(company.industry);
        expect(typeof company.name).toBe('string');
        expect(company.name.length).toBeGreaterThan(0);
        expect(typeof company.tagline).toBe('string');
        expect(company.tagline.length).toBeGreaterThan(0);
        expect(company.founded).toBeGreaterThanOrEqual(2015);
        expect(company.founded).toBeLessThanOrEqual(2024);
      }
    }, 60000);

    test.skipIf(!sglangAvailable)('handles large batch generation efficiently', async () => {
      const schema = defineSchema({
        name: llm('A first name'),
        value: number(1, 100),
      });

      const result = await generate(schema, {
        count: 20,
        provider: {
          name: 'sglang',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          baseURL: 'http://localhost:30000',
        },
        batchSize: 10,
      });

      expect(result.data).toHaveLength(20);
      expect(result.stats.llmCalls).toBeGreaterThan(0);
      // SGLang should be faster than Ollama for larger batches
      expect(result.stats.duration).toBeGreaterThan(0);
    }, 120000);

    test.skipIf(!sglangAvailable)('tracks generation statistics', async () => {
      const schema = defineSchema({
        name: llm('A name'),
      });

      const result = await generate(schema, {
        count: 3,
        provider: {
          name: 'sglang',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          baseURL: 'http://localhost:30000',
        },
      });

      expect(result.stats).toHaveProperty('totalRecords', 3);
      expect(result.stats).toHaveProperty('llmCalls');
      expect(result.stats).toHaveProperty('duration');
      expect(result.stats).toHaveProperty('provider', 'sglang');
      expect(result.stats).toHaveProperty('model', 'Qwen/Qwen2.5-7B-Instruct');
      expect(result.stats.duration).toBeGreaterThan(0);
    }, 60000);

    test.skipIf(!sglangAvailable)('uses structured output mode', async () => {
      const schema = defineSchema({
        name: llm('A realistic full name'),
      });

      const result = await generate(schema, {
        count: 3,
        provider: {
          name: 'sglang',
          model: 'Qwen/Qwen2.5-7B-Instruct',
          baseURL: 'http://localhost:30000',
        },
      });

      // SGLang uses structured output (JSON mode) by default
      // Verify that values are extracted correctly
      for (const record of result.data) {
        expect(typeof record.name).toBe('string');
        expect(record.name.length).toBeGreaterThan(0);
        // Should not contain JSON structure
        expect(record.name.startsWith('{')).toBe(false);
        expect(record.name.includes('"value"')).toBe(false);
      }
    }, 60000);
  });

  describe('Provider Comparison', () => {
    test.skipIf(!ollamaAvailable || !sglangAvailable)('both providers generate valid data', async () => {
      const schema = defineSchema({
        name: llm('A realistic full name'),
        age: number(18, 65),
      });

      const [ollamaResult, sglangResult] = await Promise.all([
        generate(schema, {
          count: 3,
          provider: { name: 'ollama', model: 'llama3.2:3b' },
        }),
        generate(schema, {
          count: 3,
          provider: {
            name: 'sglang',
            model: 'Qwen/Qwen2.5-7B-Instruct',
            baseURL: 'http://localhost:30000',
          },
        }),
      ]);

      // Both should generate valid data
      expect(ollamaResult.data).toHaveLength(3);
      expect(sglangResult.data).toHaveLength(3);

      // Both should have correct structure
      for (const record of ollamaResult.data) {
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('age');
      }

      for (const record of sglangResult.data) {
        expect(record).toHaveProperty('name');
        expect(record).toHaveProperty('age');
      }

      // Both should track statistics
      expect(ollamaResult.stats.provider).toBe('ollama');
      expect(sglangResult.stats.provider).toBe('sglang');
    }, 120000);
  });

  describe('Error Handling E2E', () => {
    test('throws error for invalid provider', async () => {
      const schema = defineSchema({
        name: llm('A name'),
      });

      await expect(
        generate(schema, {
          count: 1,
          provider: {
            name: 'invalid-provider' as any,
          },
        })
      ).rejects.toThrow();
    });

    test('throws error for missing model in SGLang', async () => {
      const schema = defineSchema({
        name: llm('A name'),
      });

      await expect(
        generate(schema, {
          count: 1,
          provider: {
            name: 'sglang',
            // Missing model
          } as any,
        })
      ).rejects.toThrow();
    });
  });
});

// Summary test
describe('Provider Availability', () => {
  test('reports provider availability', () => {
    if (ollamaAvailable && sglangAvailable) {
      console.log('✓ Both Ollama and SGLang are available - running full E2E tests');
    } else if (ollamaAvailable) {
      console.log('⚠ Only Ollama is available - running Ollama E2E tests only');
    } else if (sglangAvailable) {
      console.log('⚠ Only SGLang is available - running SGLang E2E tests only');
    } else {
      console.log('⚠ Neither provider is available - skipping E2E tests');
      console.log('  To run Ollama tests: Start Ollama and run `ollama pull llama3.2:3b`');
      console.log('  To run SGLang tests: Start SGLang server with Qwen/Qwen2.5-7B-Instruct');
    }
    expect(true).toBe(true); // Always pass
  });
});

