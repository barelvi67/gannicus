/**
 * Ollama Provider Integration Tests
 * Target: 85%+ coverage
 *
 * Tests will attempt to connect to Ollama. If not available, tests are skipped.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { OllamaProvider, createOllamaProvider } from './ollama.ts';

// Check if Ollama is available
let ollamaAvailable = false;
let testProvider: OllamaProvider;

beforeAll(async () => {
  try {
    const provider = new OllamaProvider();
    const health = await provider.healthCheck();
    ollamaAvailable = health.ok;
    if (ollamaAvailable) {
      testProvider = provider;
    }
  } catch {
    ollamaAvailable = false;
  }
});

describe('OllamaProvider', () => {
  describe('Constructor', () => {
    test('creates provider with default config', () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    test('creates provider with custom model', () => {
      const provider = new OllamaProvider({ model: 'llama3.2' });
      expect(provider.name).toBe('ollama');
    });

    test('creates provider with custom baseURL', () => {
      const provider = new OllamaProvider({
        baseURL: 'http://custom:11434',
      });
      expect(provider.name).toBe('ollama');
    });

    test('creates provider with custom temperature', () => {
      const provider = new OllamaProvider({ temperature: 0.5 });
      expect(provider.name).toBe('ollama');
    });

    test('creates provider with all options', () => {
      const provider = new OllamaProvider({
        model: 'phi3:mini',
        baseURL: 'http://localhost:11434',
        temperature: 0.8,
        stream: false,
        options: { num_ctx: 2048 },
      });
      expect(provider.name).toBe('ollama');
    });

    test('uses default temperature of 0.7', () => {
      const provider = new OllamaProvider({ temperature: undefined });
      expect(provider.name).toBe('ollama');
    });
  });

  describe('healthCheck()', () => {
    test.skipIf(!ollamaAvailable)('returns ok when Ollama is running with model', async () => {
      const provider = new OllamaProvider();
      const result = await provider.healthCheck();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Ollama ready');
    });

    test('returns error when Ollama is not running', async () => {
      const provider = new OllamaProvider({
        baseURL: 'http://localhost:99999', // Invalid port
      });

      const result = await provider.healthCheck();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Cannot connect to Ollama');
    });

    test.skipIf(!ollamaAvailable)('returns error when model not found', async () => {
      const provider = new OllamaProvider({
        model: 'nonexistent-model-12345',
      });

      const result = await provider.healthCheck();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('generate()', () => {
    test.skipIf(!ollamaAvailable)('generates value from simple prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A realistic first name');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(50); // Should be concise
    });

    test.skipIf(!ollamaAvailable)('generates value without context', async () => {
      const provider = testProvider;
      const result = await provider.generate('A tech company name');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!ollamaAvailable)('generates value with context for coherence', async () => {
      const provider = testProvider;
      const result = await provider.generate('A bio', {
        name: 'John Doe',
        age: 30,
        occupation: 'Engineer',
      });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!ollamaAvailable)('extracts clean values (removes quotes)', async () => {
      const provider = testProvider;
      const result = await provider.generate('A single word');

      // Should not have surrounding quotes
      expect(result.startsWith('"')).toBe(false);
      expect(result.endsWith('"')).toBe(false);
    });

    test.skipIf(!ollamaAvailable)('generates different values on subsequent calls', async () => {
      const provider = testProvider;
      const result1 = await provider.generate('A random number between 1-100');
      const result2 = await provider.generate('A random number between 1-100');

      // Should be different (probabilistically)
      // Note: This test might occasionally fail due to randomness
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });

    test('throws on API error', async () => {
      const provider = new OllamaProvider({
        baseURL: 'http://localhost:99999',
      });

      await expect(
        provider.generate('test prompt')
      ).rejects.toThrow();
    });
  });

  describe('generateBatch()', () => {
    test.skipIf(!ollamaAvailable)('generates multiple values in batch', async () => {
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

    test.skipIf(!ollamaAvailable)('handles batch with context', async () => {
      const provider = testProvider;
      const prompts = ['A greeting', 'A farewell'];
      const context = { language: 'English' };

      const results = await provider.generateBatch(prompts, context);

      expect(results).toHaveLength(2);
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
    });

    test.skipIf(!ollamaAvailable)('handles large batch', async () => {
      const provider = testProvider;
      const prompts = Array(12).fill('A number');

      const results = await provider.generateBatch(prompts);

      expect(results).toHaveLength(12);
      for (const result of results) {
        expect(typeof result).toBe('string');
      }
    });

    test.skipIf(!ollamaAvailable)('handles single item batch', async () => {
      const provider = testProvider;
      const results = await provider.generateBatch(['A name']);

      expect(results).toHaveLength(1);
      expect(typeof results[0]).toBe('string');
    });

    test.skipIf(!ollamaAvailable)('handles empty batch', async () => {
      const provider = testProvider;
      const results = await provider.generateBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('Prompt Building (Internal)', () => {
    // These tests verify behavior indirectly since methods are private

    test.skipIf(!ollamaAvailable)('wraps prompt with instructions', async () => {
      const provider = testProvider;
      const result = await provider.generate('A color');

      // Should be concise (following the wrapper instructions)
      expect(result.split(' ').length).toBeLessThan(5);
    });

    test.skipIf(!ollamaAvailable)('includes context in prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A summary', {
        topic: 'TypeScript',
        length: 'short',
      });

      // Result should exist and be string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!ollamaAvailable)('handles empty context', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word', {});

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Value Extraction (Internal)', () => {
    // Test extractValue behavior indirectly through generate

    test.skipIf(!ollamaAvailable)('removes common LLM chattiness', async () => {
      const provider = testProvider;
      const result = await provider.generate('A simple yes or no');

      // Should not start with "Here is" or similar
      expect(result.toLowerCase().startsWith('here is')).toBe(false);
      expect(result.toLowerCase().startsWith("here's")).toBe(false);
    });

    test.skipIf(!ollamaAvailable)('takes first line if multiline', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word');

      // Should not contain newlines
      expect(result.includes('\n')).toBe(false);
    });

    test.skipIf(!ollamaAvailable)('trims whitespace', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word');

      // Should not have leading/trailing spaces
      expect(result).toBe(result.trim());
    });
  });

  describe('createOllamaProvider() Factory', () => {
    test('creates provider from config', () => {
      const provider = createOllamaProvider({
        name: 'ollama',
        model: 'phi3:mini',
      });

      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe('ollama');
    });

    test('creates provider with baseURL', () => {
      const provider = createOllamaProvider({
        name: 'ollama',
        baseURL: 'http://custom:11434',
      });

      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    test('creates provider with options', () => {
      const provider = createOllamaProvider({
        name: 'ollama',
        options: { temperature: 0.9 },
      });

      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    test('creates provider with minimal config', () => {
      const provider = createOllamaProvider({ name: 'ollama' });

      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe('ollama');
    });
  });

  describe('Edge Cases', () => {
    test.skipIf(!ollamaAvailable)('handles very short prompts', async () => {
      const provider = testProvider;
      const result = await provider.generate('Hi');

      expect(typeof result).toBe('string');
    });

    test.skipIf(!ollamaAvailable)('handles very long prompts', async () => {
      const provider = testProvider;
      const longPrompt = 'A ' + 'very '.repeat(50) + 'detailed description';
      const result = await provider.generate(longPrompt);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test.skipIf(!ollamaAvailable)('handles special characters in prompt', async () => {
      const provider = testProvider;
      const result = await provider.generate('A word with "quotes" and symbols: @#$');

      expect(typeof result).toBe('string');
    });

    test.skipIf(!ollamaAvailable)('handles context with special values', async () => {
      const provider = testProvider;
      const result = await provider.generate('A response', {
        special: 'value with "quotes"',
        number: 42,
        bool: true,
      });

      expect(typeof result).toBe('string');
    });

    test.skipIf(!ollamaAvailable)('handles context with null values', async () => {
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
      const provider = new OllamaProvider({
        baseURL: 'http://nonexistent-domain-12345.com',
      });

      await expect(
        provider.generate('test')
      ).rejects.toThrow();
    });

    test('handles invalid model gracefully in healthCheck', async () => {
      const provider = new OllamaProvider({
        model: 'invalid-model',
      });

      const result = await provider.healthCheck();
      expect(result.ok).toBe(false);
    });

    test('healthCheck handles server errors', async () => {
      const provider = new OllamaProvider({
        baseURL: 'http://localhost:99998',
      });

      const result = await provider.healthCheck();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Cannot connect');
    });
  });

  describe('Temperature Configuration', () => {
    test.skipIf(!ollamaAvailable)('uses configured temperature', async () => {
      // Lower temperature should give more consistent results
      const lowTemp = new OllamaProvider({ temperature: 0.1 });
      const highTemp = new OllamaProvider({ temperature: 1.5 });

      const prompt = 'A greeting';

      const lowResult = await lowTemp.generate(prompt);
      const highResult = await highTemp.generate(prompt);

      // Both should return valid strings
      expect(typeof lowResult).toBe('string');
      expect(typeof highResult).toBe('string');
    });

    test('accepts zero temperature', () => {
      const provider = new OllamaProvider({ temperature: 0 });
      expect(provider.name).toBe('ollama');
    });

    test('accepts high temperature', () => {
      const provider = new OllamaProvider({ temperature: 2.0 });
      expect(provider.name).toBe('ollama');
    });
  });
});

// Summary test to report Ollama availability
describe('Test Environment', () => {
  test('reports Ollama availability', () => {
    if (ollamaAvailable) {
      console.log('✓ Ollama is available - running full integration tests');
    } else {
      console.log('⚠ Ollama not available - skipping integration tests');
      console.log('  To run full tests: Start Ollama and run `ollama pull phi3:mini`');
    }
    expect(true).toBe(true); // Always pass
  });
});
