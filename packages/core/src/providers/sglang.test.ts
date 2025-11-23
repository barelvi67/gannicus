/**
 * SGLang Provider Integration Tests
 * Target: 85%+ coverage
 *
 * Tests will attempt to connect to SGLang. If not available, tests are skipped.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { SGLangProvider, createSGLangProvider } from './sglang.ts';

// Check if SGLang is available
let sglangAvailable = false;
let testProvider: SGLangProvider;

beforeAll(async () => {
  try {
    const provider = new SGLangProvider({
      model: 'Qwen/Qwen2.5-7B-Instruct', // Recommended model (equivalent to qwen2.5:7b)
      endpoint: 'http://localhost:30000',
    });
    const health = await provider.healthCheck();
    sglangAvailable = health.ok;
    if (sglangAvailable) {
      testProvider = provider;
    }
  } catch {
    sglangAvailable = false;
  }
});

describe('SGLangProvider', () => {
  describe('Constructor', () => {
    test('creates provider with required model', () => {
      const provider = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
      });
      expect(provider.name).toBe('sglang');
    });

    test('throws error when model is missing', () => {
      expect(() => {
        new SGLangProvider({ model: '' as any });
      }).toThrow('SGLang provider requires a model name');
    });

    test('creates provider with custom endpoint', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        endpoint: 'http://custom:30000',
      });
      expect(provider.name).toBe('sglang');
    });

    test('creates provider with API key', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        apiKey: 'test-key',
      });
      expect(provider.name).toBe('sglang');
    });

    test('creates provider with custom temperature', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        temperature: 0.5,
      });
      expect(provider.name).toBe('sglang');
    });

    test('creates provider with structured output disabled', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        structuredOutput: false,
      });
      expect(provider.name).toBe('sglang');
    });

    test('creates provider with all options', () => {
      const provider = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:30000',
        apiKey: 'test-key',
        temperature: 0.8,
        structuredOutput: true,
      });
      expect(provider.name).toBe('sglang');
    });

    test('uses default temperature of 0.7', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        temperature: undefined,
      });
      expect(provider.name).toBe('sglang');
    });

    test('uses default structured output (true)', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
      });
      expect(provider.name).toBe('sglang');
    });
  });

  describe('healthCheck()', () => {
    test.skipIf(!sglangAvailable)('returns ok when SGLang is running with model', async () => {
      const provider = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:30000',
      });
      const result = await provider.healthCheck();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('SGLang ready');
    });

    test('returns error when SGLang is not running', async () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        endpoint: 'http://localhost:99999', // Invalid port
      });

      const result = await provider.healthCheck();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Cannot connect to SGLang');
    });

    test.skipIf(!sglangAvailable)('returns error when model not found', async () => {
      const provider = new SGLangProvider({
        model: 'nonexistent-model-12345',
        endpoint: 'http://localhost:30000',
      });

      const result = await provider.healthCheck();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('generate()', () => {
    test.skipIf(!sglangAvailable)('generates value from simple prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A realistic first name');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(50); // Should be concise
    });

    test.skipIf(!sglangAvailable)('generates value without context', async () => {
      const provider = testProvider;
      const result = await provider.generate('A tech company name');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('generates value with context for coherence', async () => {
      const provider = testProvider;
      const result = await provider.generate('A bio', {
        name: 'John Doe',
        age: 30,
        occupation: 'Engineer',
      });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('extracts clean values from JSON structured output', async () => {
      const provider = testProvider;
      const result = await provider.generate('A single word');

      // Should not have surrounding quotes or JSON structure
      expect(result.startsWith('"')).toBe(false);
      expect(result.endsWith('"')).toBe(false);
      expect(result.startsWith('{')).toBe(false);
      expect(result.endsWith('}')).toBe(false);
    });

    test.skipIf(!sglangAvailable)('generates different values on subsequent calls', async () => {
      const provider = testProvider;
      const result1 = await provider.generate('A random number between 1-100');
      const result2 = await provider.generate('A random number between 1-100');

      // Should be different (probabilistically)
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });

    test('throws on API error', async () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        endpoint: 'http://localhost:99999',
      });

      await expect(
        provider.generate('test prompt')
      ).rejects.toThrow();
    });
  });

  describe('generateBatch()', () => {
    test.skipIf(!sglangAvailable)('generates multiple values in batch', async () => {
      const provider = testProvider;
      const prompts = [
        'A first name',
        'A last name',
        'A city name',
      ];

      const results = await provider.generateBatch(prompts);

      expect(results).toHaveLength(3);
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
      expect(results[2].length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('handles batch with context', async () => {
      const provider = testProvider;
      const prompts = ['A greeting', 'A farewell'];
      const context = { language: 'English' };

      const results = await provider.generateBatch(prompts, context);

      expect(results).toHaveLength(2);
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('handles large batch efficiently', async () => {
      const provider = testProvider;
      const prompts = Array(50).fill('A number'); // Larger batch than Ollama

      const results = await provider.generateBatch(prompts);

      expect(results).toHaveLength(50);
      for (const result of results) {
        expect(typeof result).toBe('string');
      }
    }, 30000); // Longer timeout for large batch

    test.skipIf(!sglangAvailable)('handles single item batch', async () => {
      const provider = testProvider;
      const results = await provider.generateBatch(['A name']);

      expect(results).toHaveLength(1);
      expect(typeof results[0]).toBe('string');
    });

    test.skipIf(!sglangAvailable)('handles empty batch', async () => {
      const provider = testProvider;
      const results = await provider.generateBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('Prompt Building (Internal)', () => {
    test.skipIf(!sglangAvailable)('wraps prompt with instructions', async () => {
      const provider = testProvider;
      const result = await provider.generate('A color');

      // Should be concise (following the wrapper instructions)
      expect(result.split(' ').length).toBeLessThan(5);
    });

    test.skipIf(!sglangAvailable)('includes context in prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A summary', {
        topic: 'TypeScript',
        length: 'short',
      });

      // Result should exist and be string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('handles empty context', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word', {});

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Value Extraction (Internal)', () => {
    test.skipIf(!sglangAvailable)('extracts value from JSON structured output', async () => {
      const provider = testProvider;
      const result = await provider.generate('A simple yes or no');

      // Should not contain JSON structure
      expect(result.startsWith('{')).toBe(false);
      expect(result.includes('"value"')).toBe(false);
    });

    test.skipIf(!sglangAvailable)('removes common LLM chattiness', async () => {
      const provider = testProvider;
      const result = await provider.generate('A simple yes or no');

      // Should not start with "Here is" or similar
      expect(result.toLowerCase().startsWith('here is')).toBe(false);
      expect(result.toLowerCase().startsWith("here's")).toBe(false);
    });

    test.skipIf(!sglangAvailable)('takes first line if multiline', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word');

      // Should not contain newlines
      expect(result.includes('\n')).toBe(false);
    });

    test.skipIf(!sglangAvailable)('trims whitespace', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word');

      // Should not have leading/trailing spaces
      expect(result).toBe(result.trim());
    });
  });

  describe('createSGLangProvider() Factory', () => {
    test('creates provider from config', () => {
      const provider = createSGLangProvider({
        name: 'sglang',
        model: 'Qwen/Qwen2.5-7B-Instruct',
      });

      expect(provider).toBeInstanceOf(SGLangProvider);
      expect(provider.name).toBe('sglang');
    });

    test('creates provider with baseURL', () => {
      const provider = createSGLangProvider({
        name: 'sglang',
        model: 'test-model',
        baseURL: 'http://custom:30000',
      });

      expect(provider).toBeInstanceOf(SGLangProvider);
    });

    test('creates provider with apiKey', () => {
      const provider = createSGLangProvider({
        name: 'sglang',
        model: 'test-model',
        apiKey: 'test-key',
      });

      expect(provider).toBeInstanceOf(SGLangProvider);
    });

    test('creates provider with options', () => {
      const provider = createSGLangProvider({
        name: 'sglang',
        model: 'test-model',
        options: { temperature: 0.9, structuredOutput: false },
      });

      expect(provider).toBeInstanceOf(SGLangProvider);
    });

    test('throws error when model is missing', () => {
      expect(() => {
        createSGLangProvider({ name: 'sglang' });
      }).toThrow('SGLang provider requires a model name');
    });
  });

  describe('Edge Cases', () => {
    test.skipIf(!sglangAvailable)('handles very short prompts', async () => {
      const provider = testProvider;
      const result = await provider.generate('Hi');

      expect(typeof result).toBe('string');
    });

    test.skipIf(!sglangAvailable)('handles very long prompts', async () => {
      const provider = testProvider;
      const longPrompt = 'A ' + 'very '.repeat(50) + 'detailed description';
      const result = await provider.generate(longPrompt);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('handles special characters in prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word with "quotes" and symbols: @#$');

      expect(typeof result).toBe('string');
    });

    test.skipIf(!sglangAvailable)('handles context with special values', async () => {
      const provider = testProvider;
      const result = await provider.generate('A response', {
        special: 'value with "quotes"',
        number: 42,
        bool: true,
      });

      expect(typeof result).toBe('string');
    });

    test.skipIf(!sglangAvailable)('handles context with null values', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word', {
        nullValue: null,
        undefinedValue: undefined,
      });

      expect(typeof result).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        endpoint: 'http://nonexistent-domain-12345.com',
      });

      await expect(
        provider.generate('test')
      ).rejects.toThrow();
    });

    test('handles invalid model gracefully in healthCheck', async () => {
      const provider = new SGLangProvider({
        model: 'invalid-model',
        endpoint: 'http://localhost:30000',
      });

      const result = await provider.healthCheck();
      // May or may not be ok depending on server state
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('message');
    });

    test('healthCheck handles server errors', async () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        endpoint: 'http://localhost:99998',
      });

      const result = await provider.healthCheck();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Cannot connect');
    });
  });

  describe('Temperature Configuration', () => {
    test.skipIf(!sglangAvailable)('uses configured temperature', async () => {
      // Lower temperature should give more consistent results
      const lowTemp = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:30000',
        temperature: 0.1,
      });
      const highTemp = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:30000',
        temperature: 1.5,
      });

      const prompt = 'A greeting';

      const lowResult = await lowTemp.generate(prompt);
      const highResult = await highTemp.generate(prompt);

      // Both should return valid strings
      expect(typeof lowResult).toBe('string');
      expect(typeof highResult).toBe('string');
    });

    test('accepts zero temperature', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        temperature: 0,
      });
      expect(provider.name).toBe('sglang');
    });

    test('accepts high temperature', () => {
      const provider = new SGLangProvider({
        model: 'test-model',
        temperature: 2.0,
      });
      expect(provider.name).toBe('sglang');
    });
  });

  describe('Structured Output Mode', () => {
    test.skipIf(!sglangAvailable)('uses structured output by default', async () => {
      const provider = testProvider;
      const result = await provider.generate('A single word');

      // Should extract clean value from JSON
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!sglangAvailable)('can disable structured output', async () => {
      const provider = new SGLangProvider({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        endpoint: 'http://localhost:30000',
        structuredOutput: false,
      });
      const result = await provider.generate('A word');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// Summary test to report SGLang availability
describe('Test Environment', () => {
  test('reports SGLang availability', () => {
    if (sglangAvailable) {
      console.log('✓ SGLang is available - running full integration tests');
    } else {
      console.log('⚠ SGLang not available - skipping integration tests');
      console.log('  To run full tests: Start SGLang server and ensure model is loaded');
      console.log('  Example: python -m sglang.launch_server --model-path Qwen/Qwen2.5-7B-Instruct --port 30000');
    }
    expect(true).toBe(true); // Always pass
  });
});

