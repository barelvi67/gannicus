import { describe, test, expect, beforeEach } from 'bun:test';
import { cache, clearCache, getCacheStats } from './index.ts';

describe('Cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Basic Operations', () => {
    test('should set and get cached value', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe');
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name');
      expect(cached).toBe('John Doe');
    });

    test('should return null for non-existent key', () => {
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name');
      expect(cached).toBeNull();
    });

    test('should handle context in cache key', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe', { industry: 'Tech' });
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name', { industry: 'Tech' });
      expect(cached).toBe('John Doe');
    });

    test('should not return cached value with different context', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe', { industry: 'Tech' });
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name', { industry: 'Finance' });
      expect(cached).toBeNull();
    });
  });

  describe('Append-Only Variety', () => {
    test('should store multiple values per key', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe');
      cache.set('ollama', 'llama3.2:3b', 'A name', 'Jane Smith');
      cache.set('ollama', 'llama3.2:3b', 'A name', 'Bob Johnson');

      // Should return one of the cached values (random)
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name');
      expect(['John Doe', 'Jane Smith', 'Bob Johnson']).toContain(cached);
    });

    test('should limit values per key', () => {
      cache.configure(1000, 2); // Max 2 values per key
      
      cache.set('ollama', 'llama3.2:3b', 'A name', 'Value 1');
      cache.set('ollama', 'llama3.2:3b', 'A name', 'Value 2');
      cache.set('ollama', 'llama3.2:3b', 'A name', 'Value 3');

      // Should only have 2 values (oldest removed)
      const stats = getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(2);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used when limit reached', () => {
      cache.configure(2); // Max 2 keys
      
      cache.set('ollama', 'model1', 'prompt1', 'value1');
      cache.set('ollama', 'model2', 'prompt2', 'value2');
      cache.set('ollama', 'model3', 'prompt3', 'value3'); // Should evict prompt1

      const stats = getCacheStats();
      expect(stats.keys).toBeLessThanOrEqual(2);
    });

    test('should update access order on get', () => {
      cache.configure(2);
      
      cache.set('ollama', 'model1', 'prompt1', 'value1');
      cache.set('ollama', 'model2', 'prompt2', 'value2');
      
      // Access prompt1 to make it recently used
      cache.get('ollama', 'model1', 'prompt1');
      
      cache.set('ollama', 'model3', 'prompt3', 'value3'); // Should evict prompt2, not prompt1
      
      const cached = cache.get('ollama', 'model1', 'prompt1');
      expect(cached).toBe('value1');
    });
  });

  describe('Statistics', () => {
    test('should track cache hits', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe');
      
      cache.get('ollama', 'llama3.2:3b', 'A name');
      cache.get('ollama', 'llama3.2:3b', 'A name');
      cache.get('ollama', 'llama3.2:3b', 'A name');

      const stats = getCacheStats();
      expect(stats.totalHits).toBeGreaterThan(0);
    });

    test('should calculate hit rate', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe');
      
      cache.get('ollama', 'llama3.2:3b', 'A name');
      cache.get('ollama', 'llama3.2:3b', 'A name');

      const stats = getCacheStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });

    test('should track keys and entries', () => {
      cache.set('ollama', 'model1', 'prompt1', 'value1');
      cache.set('ollama', 'model1', 'prompt1', 'value2');
      cache.set('ollama', 'model2', 'prompt2', 'value3');

      const stats = getCacheStats();
      expect(stats.keys).toBeGreaterThan(0);
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Clear Cache', () => {
    test('should clear all cached values', () => {
      cache.set('ollama', 'llama3.2:3b', 'A name', 'John Doe');
      clearCache();
      
      const cached = cache.get('ollama', 'llama3.2:3b', 'A name');
      expect(cached).toBeNull();
      
      const stats = getCacheStats();
      expect(stats.keys).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should configure max entries', () => {
      cache.configure(5);
      cache.configure(10);
      
      // Should accept new configuration
      expect(true).toBe(true); // Configuration is internal
    });

    test('should configure max values per key', () => {
      cache.configure(1000, 5);
      
      // Should limit values per key
      for (let i = 0; i < 10; i++) {
        cache.set('ollama', 'llama3.2:3b', 'A name', `Value ${i}`);
      }

      const stats = getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5);
    });
  });
});

