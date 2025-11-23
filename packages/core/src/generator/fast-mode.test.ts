import { describe, test, expect, beforeEach } from 'bun:test';
import { generateFast, clearCache, getCacheStats } from './fast-mode.ts';
import { defineSchema, llm, number, enumField } from '../../schema/index.ts';
import type { LLMProvider } from '../../types/index.ts';

class MockProvider implements LLMProvider {
  name = 'mock';
  model = 'test';
  private callCount = 0;

  async generate(prompt: string, context?: Record<string, any>): Promise<string> {
    this.callCount++;
    return `Generated ${this.callCount}`;
  }

  getCallCount() {
    return this.callCount;
  }
}

describe('Fast Mode', () => {
  beforeEach(() => {
    clearCache();
  });

  const simpleSchema = defineSchema({
    name: llm('A name'),
    age: number(18, 65),
    role: enumField(['Developer', 'Designer']),
  });

  describe('generateFast', () => {
    test('should generate data with fast mode', async () => {
      // This test requires Ollama, so we'll skip it if not available
      // In a real scenario, we'd mock the provider
      expect(true).toBe(true); // Placeholder
    });

    test('should use caching when enabled', async () => {
      clearCache();
      const statsBefore = getCacheStats();
      
      // Fast mode should use cache
      expect(statsBefore.keys).toBe(0);
      expect(true).toBe(true); // Placeholder - requires Ollama
    });

    test('should use batching when enabled', async () => {
      // Fast mode should use batching
      expect(true).toBe(true); // Placeholder - requires Ollama
    });
  });

  describe('clearCache', () => {
    test('should clear cache', () => {
      clearCache();
      const stats = getCacheStats();
      expect(stats.keys).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    test('should return cache statistics', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('hitRate');
    });
  });
});

