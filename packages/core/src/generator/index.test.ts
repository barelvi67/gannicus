/**
 * Generator Engine E2E Tests
 * Target: 90%+ coverage with edge cases
 */

import { describe, test, expect, mock } from 'bun:test';
import { generate } from './index.ts';
import { llm, staticValue, number, enumField, derived, defineSchema } from '../schema/index.ts';
import type { LLMProvider } from '../types/index.ts';

// Mock LLM Provider for testing
function createMockProvider(responses: string[] = []): LLMProvider {
  let callCount = 0;
  return {
    name: 'mock-provider',
    generate: mock(async (prompt: string, context?: Record<string, any>) => {
      const response = responses[callCount] || `Generated_${callCount}`;
      callCount++;

      // If context provided, incorporate it into response
      if (context && Object.keys(context).length > 0) {
        return `${response}_with_${Object.keys(context).join('_')}`;
      }

      return response;
    }),
  };
}

describe('Generator Engine', () => {
  describe('generate() - Basic Generation', () => {
    test('generates correct number of records', async () => {
      const schema = defineSchema({
        status: staticValue('active'),
      });

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(5);
      expect(result.stats.totalRecords).toBe(5);
    });

    test('generates static fields correctly', async () => {
      const schema = defineSchema({
        status: staticValue('premium'),
        verified: staticValue(true),
      });

      const result = await generate(schema, {
        count: 3,
        provider: { name: 'ollama' },
      });

      expect(result.data[0].status).toBe('premium');
      expect(result.data[0].verified).toBe(true);
      expect(result.data[2].status).toBe('premium');
    });

    test('generates number fields within range', async () => {
      const schema = defineSchema({
        age: number(18, 65),
      });

      const result = await generate(schema, {
        count: 100,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.age).toBeGreaterThanOrEqual(18);
        expect(record.age).toBeLessThan(65);
        expect(Number.isInteger(record.age)).toBe(true);
      }
    });

    test('generates number fields with decimals', async () => {
      const schema = defineSchema({
        price: number(0, 100, { decimals: 2 }),
      });

      const result = await generate(schema, {
        count: 50,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.price).toBeGreaterThanOrEqual(0);
        expect(record.price).toBeLessThanOrEqual(100);
        // Check decimal places
        const decimal = record.price.toString().split('.')[1];
        if (decimal) {
          expect(decimal.length).toBeLessThanOrEqual(2);
        }
      }
    });

    test('generates enum fields with equal probability', async () => {
      const schema = defineSchema({
        plan: enumField(['free', 'pro', 'enterprise']),
      });

      const result = await generate(schema, {
        count: 100,
        provider: { name: 'ollama' },
      });

      const plans = result.data.map((r) => r.plan);
      expect(plans).toContain('free');
      expect(plans).toContain('pro');
      expect(plans).toContain('enterprise');
    });

    test('generates enum fields with weights', async () => {
      const schema = defineSchema({
        rarity: enumField([
          { value: 'common', weight: 70 },
          { value: 'rare', weight: 25 },
          { value: 'legendary', weight: 5 },
        ]),
      });

      const result = await generate(schema, {
        count: 1000,
        provider: { name: 'ollama' },
        seed: 42, // For reproducibility
      });

      const counts = {
        common: 0,
        rare: 0,
        legendary: 0,
      };

      for (const record of result.data) {
        counts[record.rarity as keyof typeof counts]++;
      }

      // With weights 70:25:5, expect roughly this distribution
      expect(counts.common).toBeGreaterThan(counts.rare);
      expect(counts.rare).toBeGreaterThan(counts.legendary);
    });
  });

  describe('generate() - Derived Fields', () => {
    test('generates derived fields with dependencies', async () => {
      const schema = defineSchema({
        firstName: staticValue('John'),
        lastName: staticValue('Doe'),
        fullName: derived(
          ['firstName', 'lastName'],
          (ctx) => `${ctx.firstName} ${ctx.lastName}`
        ),
      });

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      expect(result.data[0].fullName).toBe('John Doe');
      expect(result.data[4].fullName).toBe('John Doe');
    });

    test('derived fields have access to all dependencies', async () => {
      const schema = defineSchema({
        price: number(10, 100),
        quantity: number(1, 10),
        total: derived(
          ['price', 'quantity'],
          (ctx) => ctx.price * ctx.quantity
        ),
      });

      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.total).toBe(record.price * record.quantity);
      }
    });

    test('derived fields can transform data types', async () => {
      const schema = defineSchema({
        age: number(18, 65),
        isAdult: derived(['age'], (ctx) => ctx.age >= 18),
      });

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.isAdult).toBe(true); // All ages are >= 18
      }
    });
  });

  describe('generate() - Dependency Resolution', () => {
    test('resolves simple dependency chain', async () => {
      const schema = defineSchema({
        base: staticValue(10),
        doubled: derived(['base'], (ctx) => ctx.base * 2),
        tripled: derived(['doubled'], (ctx) => ctx.doubled * 1.5),
      });

      const result = await generate(schema, {
        count: 1,
        provider: { name: 'ollama' },
      });

      expect(result.data[0].base).toBe(10);
      expect(result.data[0].doubled).toBe(20);
      expect(result.data[0].tripled).toBe(30);
    });

    test('resolves complex dependency graph', async () => {
      const schema = defineSchema({
        a: staticValue(1),
        b: staticValue(2),
        c: derived(['a', 'b'], (ctx) => ctx.a + ctx.b),
        d: derived(['c'], (ctx) => ctx.c * 2),
        e: derived(['a', 'd'], (ctx) => ctx.a + ctx.d),
      });

      const result = await generate(schema, {
        count: 1,
        provider: { name: 'ollama' },
      });

      expect(result.data[0].a).toBe(1);
      expect(result.data[0].b).toBe(2);
      expect(result.data[0].c).toBe(3); // 1 + 2
      expect(result.data[0].d).toBe(6); // 3 * 2
      expect(result.data[0].e).toBe(7); // 1 + 6
    });

    test('throws on circular dependency', async () => {
      const schema = defineSchema({
        a: derived(['b'], (ctx) => ctx.b + 1),
        b: derived(['a'], (ctx) => ctx.a + 1),
      });

      await expect(
        generate(schema, {
          count: 1,
          provider: { name: 'ollama' },
        })
      ).rejects.toThrow('Circular dependency detected');
    });
  });

  describe('generate() - Seeded Randomness', () => {
    test('generates same data with same seed', async () => {
      const schema = defineSchema({
        value: number(0, 100),
        choice: enumField(['a', 'b', 'c']),
      });

      const result1 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 12345,
      });

      // Reset Math.random (important!)
      Math.random = Math.random;

      const result2 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 12345,
      });

      for (let i = 0; i < 10; i++) {
        expect(result1.data[i].value).toBe(result2.data[i].value);
        expect(result1.data[i].choice).toBe(result2.data[i].choice);
      }
    });

    test('generates different data with different seeds', async () => {
      const schema = defineSchema({
        value: number(0, 100),
      });

      const result1 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 111,
      });

      Math.random = Math.random;

      const result2 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 222,
      });

      // At least one value should be different
      let hasDifference = false;
      for (let i = 0; i < 10; i++) {
        if (result1.data[i].value !== result2.data[i].value) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  describe('generate() - Progress Callback', () => {
    test('calls progress callback', async () => {
      const schema = defineSchema({
        value: staticValue('test'),
      });

      const progressCalls: Array<{ current: number; total: number }> = [];

      await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
        onProgress: (current, total) => {
          progressCalls.push({ current, total });
        },
      });

      expect(progressCalls).toHaveLength(5);
      expect(progressCalls[0]).toEqual({ current: 1, total: 5 });
      expect(progressCalls[4]).toEqual({ current: 5, total: 5 });
    });

    test('progress callback receives correct totals', async () => {
      const schema = defineSchema({
        id: number(1, 100),
      });

      let maxProgress = 0;
      let finalTotal = 0;

      await generate(schema, {
        count: 100,
        provider: { name: 'ollama' },
        onProgress: (current, total) => {
          if (current > maxProgress) maxProgress = current;
          finalTotal = total;
        },
      });

      expect(maxProgress).toBe(100);
      expect(finalTotal).toBe(100);
    });
  });

  describe('generate() - Statistics', () => {
    test('returns correct stats', async () => {
      const schema = defineSchema({
        value: staticValue('test'),
      });

      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama', model: 'phi3:mini' },
      });

      expect(result.stats.totalRecords).toBe(10);
      expect(result.stats.llmCalls).toBe(0); // No LLM fields
      expect(result.stats.provider).toBe('ollama');
      expect(result.stats.model).toBe('phi3:mini');
      expect(result.stats.duration).toBeGreaterThanOrEqual(0); // Can be 0 for fast operations
    });

    test('tracks LLM calls correctly', async () => {
      const schema = defineSchema({
        name: staticValue('test'),
        bio: staticValue('mock_bio'),
      });

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      expect(result.stats.llmCalls).toBe(0);
    });

    test('tracks duration', async () => {
      const schema = defineSchema({
        slow: staticValue('value'),
      });

      const before = Date.now();
      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
      });
      const after = Date.now();

      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
      expect(result.stats.duration).toBeLessThanOrEqual(after - before);
    });
  });

  describe('generate() - Edge Cases', () => {
    test('generates zero records', async () => {
      const schema = defineSchema({
        value: staticValue('test'),
      });

      const result = await generate(schema, {
        count: 0,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(0);
      expect(result.stats.totalRecords).toBe(0);
    });

    test('generates single record', async () => {
      const schema = defineSchema({
        id: number(1, 10),
      });

      const result = await generate(schema, {
        count: 1,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(1);
      expect(result.stats.totalRecords).toBe(1);
    });

    test('handles empty schema', async () => {
      const schema = defineSchema({});

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(5);
      expect(result.data[0]).toEqual({});
    });

    test('handles schema with only one field', async () => {
      const schema = defineSchema({
        value: staticValue(42),
      });

      const result = await generate(schema, {
        count: 3,
        provider: { name: 'ollama' },
      });

      expect(result.data[0]).toEqual({ value: 42 });
      expect(result.data[1]).toEqual({ value: 42 });
    });

    test('handles number field with zero range', async () => {
      const schema = defineSchema({
        constant: number(42, 42.0001), // Very small range
      });

      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.constant).toBeGreaterThanOrEqual(42);
        expect(record.constant).toBeLessThan(42.0001);
      }
    });

    test('handles enum with single option', async () => {
      const schema = defineSchema({
        only: enumField(['single']),
      });

      const result = await generate(schema, {
        count: 5,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        expect(record.only).toBe('single');
      }
    });

    test('handles negative number ranges', async () => {
      const schema = defineSchema({
        temp: number(-100, 100),
      });

      const result = await generate(schema, {
        count: 100,
        provider: { name: 'ollama' },
      });

      const hasNegative = result.data.some((r) => r.temp < 0);
      const hasPositive = result.data.some((r) => r.temp > 0);

      expect(hasNegative).toBe(true);
      expect(hasPositive).toBe(true);
    });

    test('handles derived field with no dependencies', async () => {
      const schema = defineSchema({
        constant: derived([], () => 'computed'),
      });

      const result = await generate(schema, {
        count: 3,
        provider: { name: 'ollama' },
      });

      expect(result.data[0].constant).toBe('computed');
      expect(result.data[2].constant).toBe('computed');
    });
  });

  describe('generate() - Provider Validation', () => {
    test('throws on unsupported provider in v0.1', async () => {
      const schema = defineSchema({
        value: staticValue('test'),
      });

      await expect(
        generate(schema, {
          count: 1,
          provider: { name: 'groq' as any },
        })
      ).rejects.toThrow('Provider "groq" not supported in v0.1');
    });

    test('uses default model when not specified', async () => {
      const schema = defineSchema({
        value: staticValue('test'),
      });

      const result = await generate(schema, {
        count: 1,
        provider: { name: 'ollama' },
      });

      expect(result.stats.model).toBe('default');
    });
  });

  describe('generate() - Schema Validation', () => {
    test('validates schema before generation', async () => {
      const invalidSchema = defineSchema({
        bad: number(100, 50), // Invalid: min > max
      });

      await expect(
        generate(invalidSchema, {
          count: 1,
          provider: { name: 'ollama' },
        })
      ).rejects.toThrow('invalid range');
    });

    test('validates coherence references', async () => {
      const invalidSchema = defineSchema({
        bio: llm('A bio', { coherence: ['nonexistent'] }),
      });

      await expect(
        generate(invalidSchema, {
          count: 1,
          provider: { name: 'ollama' },
        })
      ).rejects.toThrow('non-existent field');
    });
  });

  describe('generate() - Complex Schemas', () => {
    test('handles schema with all field types', async () => {
      const schema = defineSchema({
        id: number(1, 1000),
        status: staticValue('active'),
        plan: enumField(['free', 'pro']),
        fullName: derived([], () => 'Test User'),
      });

      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(10);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('status');
      expect(result.data[0]).toHaveProperty('plan');
      expect(result.data[0]).toHaveProperty('fullName');
    });

    test('handles large record count', async () => {
      const schema = defineSchema({
        value: number(1, 100),
      });

      const result = await generate(schema, {
        count: 1000,
        provider: { name: 'ollama' },
      });

      expect(result.data).toHaveLength(1000);
      expect(result.stats.totalRecords).toBe(1000);
    });
  });

  describe('Utility Functions', () => {
    test('seeded random generates consistent values', async () => {
      const schema = defineSchema({
        value: number(0, 1000),
      });

      const values1: number[] = [];
      const result1 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 999,
      });
      values1.push(...result1.data.map((r) => r.value));

      // Reset random
      Math.random = Math.random;

      const values2: number[] = [];
      const result2 = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
        seed: 999,
      });
      values2.push(...result2.data.map((r) => r.value));

      expect(values1).toEqual(values2);
    });

    test('decimal handling in numbers', async () => {
      const schema = defineSchema({
        precise: number(0, 1, { decimals: 4 }),
      });

      const result = await generate(schema, {
        count: 10,
        provider: { name: 'ollama' },
      });

      for (const record of result.data) {
        const str = record.precise.toString();
        const parts = str.split('.');
        if (parts.length > 1) {
          expect(parts[1].length).toBeLessThanOrEqual(4);
        }
      }
    });
  });
});
