import { describe, test, expect } from 'bun:test';
import {
  getRecommendedModels,
  getModelById,
  getModelForUseCase,
  getDefaultModel,
  getModelsByUseCase,
  getModelsByPriority,
  isRecommended,
} from './index.ts';

describe('Model Recommendations', () => {
  describe('getRecommendedModels', () => {
    test('should return array of models', () => {
      const models = getRecommendedModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('should return models with required fields', () => {
      const models = getRecommendedModels();
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('family');
        expect(model).toHaveProperty('size');
        expect(model).toHaveProperty('performance');
        expect(model).toHaveProperty('temperature');
      });
    });
  });

  describe('getModelById', () => {
    test('should return model by id', () => {
      const model = getModelById('llama3.2:3b');
      expect(model).toBeDefined();
      expect(model?.id).toBe('llama3.2:3b');
    });

    test('should return undefined for non-existent id', () => {
      const model = getModelById('nonexistent:model');
      expect(model).toBeUndefined();
    });
  });

  describe('getModelForUseCase', () => {
    test('should return model for development use case', () => {
      const model = getModelForUseCase('development');
      expect(model).toBeDefined();
      expect(model.id).toBe('llama3.2:3b');
    });

    test('should return model for production use case', () => {
      const model = getModelForUseCase('production');
      expect(model).toBeDefined();
      expect(model.id).toBe('qwen2.5:7b');
    });

    test('should return model for fastest use case', () => {
      const model = getModelForUseCase('fastest');
      expect(model).toBeDefined();
      expect(model.id).toBe('llama3.2:3b');
    });

    test('should return model for bestQuality use case', () => {
      const model = getModelForUseCase('bestQuality');
      expect(model).toBeDefined();
      expect(model.id).toBe('qwen2.5:7b');
    });
  });

  describe('getDefaultModel', () => {
    test('should return default model', () => {
      const model = getDefaultModel();
      expect(model).toBeDefined();
      expect(model.id).toBe('qwen2.5:7b');
    });
  });

  describe('getModelsByUseCase', () => {
    test('should return models for development use case', () => {
      const models = getModelsByUseCase('development');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.id === 'llama3.2:3b')).toBe(true);
    });

    test('should return models for production use case', () => {
      const models = getModelsByUseCase('production');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('getModelsByPriority', () => {
    test('should return models sorted by priority', () => {
      const models = getModelsByPriority();
      expect(Array.isArray(models)).toBe(true);
      
      // Should be sorted by priority (ascending)
      for (let i = 1; i < models.length; i++) {
        expect(models[i].priority).toBeGreaterThanOrEqual(models[i - 1].priority);
      }
    });
  });

  describe('isRecommended', () => {
    test('should return true for recommended model', () => {
      expect(isRecommended('llama3.2:3b')).toBe(true);
      expect(isRecommended('qwen2.5:7b')).toBe(true);
    });

    test('should return false for non-existent model', () => {
      expect(isRecommended('nonexistent:model')).toBe(false);
    });
  });
});

