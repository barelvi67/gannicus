import { describe, test, expect } from 'bun:test';
import { estimateCost, formatCostEstimate, compareProviders } from './index.ts';

describe('Cost Calculator', () => {
  describe('estimateCost', () => {
    test('should calculate cost for local provider', () => {
      const estimate = estimateCost('ollama', 'llama3.2:3b', 1000, 3, 50);
      
      expect(estimate.provider).toBe('ollama');
      expect(estimate.model).toBe('llama3.2:3b');
      expect(estimate.records).toBe(1000);
      expect(estimate.llmFields).toBe(3);
      expect(estimate.cost).toBe(0);
      expect(estimate.totalTokens).toBe(150000);
      expect(estimate.estimatedTime).toBeGreaterThan(0);
      expect(estimate.recordsPerSecond).toBeGreaterThan(0);
    });

    test('should calculate cost for Groq', () => {
      const estimate = estimateCost('groq', 'llama3.1:70b', 10000, 3, 50);
      
      expect(estimate.provider).toBe('groq');
      expect(estimate.cost).toBeGreaterThan(0);
      expect(estimate.totalTokens).toBe(1500000);
      expect(estimate.estimatedTime).toBeGreaterThan(0);
    });

    test('should calculate cost for OpenAI', () => {
      const estimate = estimateCost('openai', 'gpt-4o-mini', 10000, 3, 50);
      
      expect(estimate.provider).toBe('openai');
      expect(estimate.cost).toBeGreaterThan(0);
      expect(estimate.totalTokens).toBe(1500000);
    });

    test('should handle different token counts', () => {
      const estimate1 = estimateCost('groq', 'llama3.1:70b', 1000, 3, 50);
      const estimate2 = estimateCost('groq', 'llama3.1:70b', 1000, 3, 100);
      
      expect(estimate2.totalTokens).toBe(estimate1.totalTokens * 2);
      expect(estimate2.cost).toBeGreaterThan(estimate1.cost);
    });

    test('should handle different record counts', () => {
      const estimate1 = estimateCost('groq', 'llama3.1:70b', 1000, 3, 50);
      const estimate2 = estimateCost('groq', 'llama3.1:70b', 2000, 3, 50);
      
      expect(estimate2.totalTokens).toBe(estimate1.totalTokens * 2);
      expect(estimate2.cost).toBe(estimate1.cost * 2);
    });
  });

  describe('formatCostEstimate', () => {
    test('should format cost estimate correctly', () => {
      const estimate = estimateCost('groq', 'llama3.1:70b', 10000, 3, 50);
      const formatted = formatCostEstimate(estimate);
      
      expect(formatted).toContain('10,000');
      expect(formatted).toContain('$');
      expect(formatted).toContain('rec/s');
    });

    test('should format zero cost correctly', () => {
      const estimate = estimateCost('ollama', 'llama3.2:3b', 1000, 3, 50);
      const formatted = formatCostEstimate(estimate);
      
      expect(formatted).toContain('$0.00');
    });

    test('should format time correctly', () => {
      const estimate = estimateCost('groq', 'llama3.1:70b', 100, 3, 50);
      const formatted = formatCostEstimate(estimate);
      
      // Should contain time format (s, min, or hrs)
      expect(
        formatted.includes('s') || 
        formatted.includes('min') || 
        formatted.includes('hrs')
      ).toBe(true);
    });
  });

  describe('compareProviders', () => {
    test('should compare all providers', () => {
      const comparison = compareProviders(10000, 3, 50);
      
      expect(comparison.length).toBeGreaterThan(0);
      expect(comparison.some(c => c.provider === 'ollama')).toBe(true);
      expect(comparison.some(c => c.provider === 'groq')).toBe(true);
    });

    test('should sort by cost', () => {
      const comparison = compareProviders(10000, 3, 50);
      
      // Should be sorted by cost (ascending)
      for (let i = 1; i < comparison.length; i++) {
        expect(comparison[i].cost).toBeGreaterThanOrEqual(comparison[i - 1].cost);
      }
    });

    test('should include all required fields', () => {
      const comparison = compareProviders(1000, 3, 50);
      
      comparison.forEach(est => {
        expect(est).toHaveProperty('provider');
        expect(est).toHaveProperty('model');
        expect(est).toHaveProperty('records');
        expect(est).toHaveProperty('cost');
        expect(est).toHaveProperty('estimatedTime');
        expect(est).toHaveProperty('recordsPerSecond');
      });
    });
  });
});

