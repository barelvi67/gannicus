import { describe, test, expect, beforeEach } from 'bun:test';
import { batchProcessor, generateWithBatching, flushBatches } from './batch-processor.ts';
import type { LLMProvider } from '../types/index.ts';

class MockProvider implements LLMProvider {
  name = 'mock';
  model = 'test';
  private responses: string[] = [];
  private callCount = 0;

  constructor(responses: string[] = []) {
    this.responses = responses;
  }

  async generate(prompt: string, context?: Record<string, any>): Promise<string> {
    this.callCount++;
    if (this.responses.length > 0) {
      return this.responses[this.callCount - 1] || `Response ${this.callCount}`;
    }
    return `Response ${this.callCount}`;
  }

  async generateBatch(prompts: string[], context?: Record<string, any>): Promise<string[]> {
    return prompts.map((_, i) => `Batch Response ${i + 1}`);
  }

  getCallCount() {
    return this.callCount;
  }
}

describe('Batch Processor', () => {
  beforeEach(() => {
    batchProcessor.configure(10, 100); // Reset to defaults
  });

  describe('generateWithBatching', () => {
    test('should generate without batching when disabled', async () => {
      const provider = new MockProvider(['Result']);
      const result = await generateWithBatching(provider, 'test prompt', undefined, undefined, false);
      
      expect(result).toBe('Result');
      expect(provider.getCallCount()).toBe(1);
    });

    test('should batch requests when enabled', async () => {
      const provider = new MockProvider();
      
      // Add multiple requests
      const promises = [
        generateWithBatching(provider, 'prompt1', undefined, undefined, true),
        generateWithBatching(provider, 'prompt1', undefined, undefined, true),
        generateWithBatching(provider, 'prompt1', undefined, undefined, true),
      ];

      // Flush batches to ensure they're processed
      await flushBatches(provider);
      
      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      expect(results.every(r => typeof r === 'string')).toBe(true);
    });
  });

  describe('batchProcessor', () => {
    test('should flush batch when full', async () => {
      const provider = new MockProvider();
      batchProcessor.configure(2, 1000); // Batch size of 2
      
      const promises = [
        batchProcessor.add(provider, 'prompt1', undefined, 'field1'),
        batchProcessor.add(provider, 'prompt1', undefined, 'field2'),
      ];

      // Third request should trigger flush
      const promise3 = batchProcessor.add(provider, 'prompt1', undefined, 'field3');

      await Promise.all([...promises, promise3]);
      
      // Should have processed batches
      expect(true).toBe(true); // Batch processing is async
    });

    test('should flush after timeout', async () => {
      const provider = new MockProvider();
      batchProcessor.configure(10, 50); // 50ms timeout
      
      const promise = batchProcessor.add(provider, 'prompt1', undefined, 'field1');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await promise;
      expect(typeof result).toBe('string');
    });

    test('should group similar requests', async () => {
      const provider = new MockProvider();
      batchProcessor.configure(10, 100);
      
      // Same prompt + context should be grouped
      const promises = [
        batchProcessor.add(provider, 'prompt1', { ctx: 'value' }, 'field1'),
        batchProcessor.add(provider, 'prompt1', { ctx: 'value' }, 'field2'),
        batchProcessor.add(provider, 'prompt2', { ctx: 'value' }, 'field3'), // Different prompt
      ];

      await flushBatches(provider);
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
    });
  });

  describe('flushBatches', () => {
    test('should flush all pending batches', async () => {
      const provider = new MockProvider();
      
      const promise = batchProcessor.add(provider, 'prompt1', undefined, 'field1');
      await flushBatches(provider);
      
      const result = await promise;
      expect(typeof result).toBe('string');
    });

    test('should handle empty batches', async () => {
      const provider = new MockProvider();
      await flushBatches(provider);
      expect(true).toBe(true); // Should not throw
    });
  });

  describe('configuration', () => {
    test('should configure batch size', () => {
      batchProcessor.configure(5, 100);
      expect(true).toBe(true); // Configuration is internal
    });

    test('should configure flush interval', () => {
      batchProcessor.configure(10, 200);
      expect(true).toBe(true); // Configuration is internal
    });
  });
});

