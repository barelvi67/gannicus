/**
 * Schema Builder Unit Tests
 * Target: 90%+ coverage
 */

import { describe, test, expect } from 'bun:test';
import {
  llm,
  staticValue,
  number,
  enumField,
  derived,
  defineSchema,
  validateSchema,
} from './index.ts';

describe('Schema Builders', () => {
  describe('llm()', () => {
    test('creates LLM field with prompt only', () => {
      const field = llm('A realistic name');

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('A realistic name');
      expect(field.coherence).toBeUndefined();
      expect(field.examples).toBeUndefined();
      expect(field.description).toBeUndefined();
    });

    test('creates LLM field with coherence', () => {
      const field = llm('A bio', { coherence: ['name', 'age'] });

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('A bio');
      expect(field.coherence).toEqual(['name', 'age']);
    });

    test('creates LLM field with examples', () => {
      const field = llm('A tech company', {
        examples: ['Vercel', 'Stripe', 'Linear'],
      });

      expect(field.type).toBe('llm');
      expect(field.examples).toEqual(['Vercel', 'Stripe', 'Linear']);
    });

    test('creates LLM field with description', () => {
      const field = llm('A name', { description: 'User full name' });

      expect(field.type).toBe('llm');
      expect(field.description).toBe('User full name');
    });

    test('creates LLM field with all options', () => {
      const field = llm('A company name', {
        coherence: ['industry'],
        examples: ['Apple', 'Google'],
        description: 'Company name in tech industry',
      });

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('A company name');
      expect(field.coherence).toEqual(['industry']);
      expect(field.examples).toEqual(['Apple', 'Google']);
      expect(field.description).toBe('Company name in tech industry');
    });
  });

  describe('staticValue()', () => {
    test('creates static field with string value', () => {
      const field = staticValue('active');

      expect(field.type).toBe('static');
      expect(field.value).toBe('active');
      expect(field.description).toBeUndefined();
    });

    test('creates static field with boolean value', () => {
      const field = staticValue(true);

      expect(field.type).toBe('static');
      expect(field.value).toBe(true);
    });

    test('creates static field with number value', () => {
      const field = staticValue(42);

      expect(field.type).toBe('static');
      expect(field.value).toBe(42);
    });

    test('creates static field with object value', () => {
      const obj = { plan: 'free', tier: 1 };
      const field = staticValue(obj);

      expect(field.type).toBe('static');
      expect(field.value).toEqual(obj);
    });

    test('creates static field with description', () => {
      const field = staticValue('premium', {
        description: 'Account status',
      });

      expect(field.type).toBe('static');
      expect(field.value).toBe('premium');
      expect(field.description).toBe('Account status');
    });
  });

  describe('number()', () => {
    test('creates number field with min and max', () => {
      const field = number(18, 65);

      expect(field.type).toBe('number');
      expect(field.min).toBe(18);
      expect(field.max).toBe(65);
      expect(field.decimals).toBeUndefined();
      expect(field.description).toBeUndefined();
    });

    test('creates number field with decimals', () => {
      const field = number(0, 100, { decimals: 2 });

      expect(field.type).toBe('number');
      expect(field.min).toBe(0);
      expect(field.max).toBe(100);
      expect(field.decimals).toBe(2);
    });

    test('creates number field with description', () => {
      const field = number(1, 10, { description: 'Rating from 1-10' });

      expect(field.type).toBe('number');
      expect(field.description).toBe('Rating from 1-10');
    });

    test('creates number field with negative range', () => {
      const field = number(-100, 100);

      expect(field.type).toBe('number');
      expect(field.min).toBe(-100);
      expect(field.max).toBe(100);
    });

    test('creates number field with decimals and description', () => {
      const field = number(0, 1, {
        decimals: 4,
        description: 'Probability value',
      });

      expect(field.type).toBe('number');
      expect(field.decimals).toBe(4);
      expect(field.description).toBe('Probability value');
    });
  });

  describe('enumField()', () => {
    test('creates enum field with string array', () => {
      const field = enumField(['small', 'medium', 'large']);

      expect(field.type).toBe('enum');
      expect(field.options).toEqual(['small', 'medium', 'large']);
      expect(field.description).toBeUndefined();
    });

    test('creates enum field with weighted options', () => {
      const options = [
        { value: 'free', weight: 70 },
        { value: 'pro', weight: 25 },
        { value: 'enterprise', weight: 5 },
      ];
      const field = enumField(options);

      expect(field.type).toBe('enum');
      expect(field.options).toEqual(options);
    });

    test('creates enum field with description', () => {
      const field = enumField(['red', 'green', 'blue'], {
        description: 'Color options',
      });

      expect(field.type).toBe('enum');
      expect(field.description).toBe('Color options');
    });

    test('creates enum field with mixed weights', () => {
      const options = [
        { value: 'common', weight: 80 },
        { value: 'rare' }, // No weight
        { value: 'legendary', weight: 1 },
      ];
      const field = enumField(options);

      expect(field.type).toBe('enum');
      expect(field.options).toEqual(options);
    });
  });

  describe('derived()', () => {
    test('creates derived field with single dependency', () => {
      const compute = (ctx: Record<string, any>) => ctx.name.toUpperCase();
      const field = derived(['name'], compute);

      expect(field.type).toBe('derived');
      expect(field.depends).toEqual(['name']);
      expect(field.compute).toBe(compute);
      expect(field.description).toBeUndefined();
    });

    test('creates derived field with multiple dependencies', () => {
      const compute = (ctx: Record<string, any>) =>
        `${ctx.firstName} ${ctx.lastName}`;
      const field = derived(['firstName', 'lastName'], compute);

      expect(field.type).toBe('derived');
      expect(field.depends).toEqual(['firstName', 'lastName']);
      expect(field.compute).toBe(compute);
    });

    test('creates derived field with description', () => {
      const compute = (ctx: Record<string, any>) => ctx.price * ctx.quantity;
      const field = derived(['price', 'quantity'], compute, {
        description: 'Total price',
      });

      expect(field.type).toBe('derived');
      expect(field.description).toBe('Total price');
    });

    test('compute function works correctly', () => {
      const compute = (ctx: Record<string, any>) =>
        ctx.name.toLowerCase().replace(' ', '.');
      const field = derived(['name'], compute);

      const result = field.compute({ name: 'John Doe' });
      expect(result).toBe('john.doe');
    });

    test('compute function with arithmetic', () => {
      const compute = (ctx: Record<string, any>) => ctx.a + ctx.b + ctx.c;
      const field = derived(['a', 'b', 'c'], compute);

      const result = field.compute({ a: 1, b: 2, c: 3 });
      expect(result).toBe(6);
    });
  });

  describe('defineSchema()', () => {
    test('returns schema unchanged', () => {
      const schema = {
        name: llm('A name'),
        age: number(18, 65),
      };

      const result = defineSchema(schema);
      expect(result).toBe(schema);
    });

    test('preserves all field types', () => {
      const schema = defineSchema({
        llmField: llm('Prompt'),
        staticField: staticValue('value'),
        numberField: number(0, 100),
        enumField: enumField(['a', 'b']),
        derivedField: derived(['llmField'], (ctx) => ctx.llmField),
      });

      expect(schema.llmField.type).toBe('llm');
      expect(schema.staticField.type).toBe('static');
      expect(schema.numberField.type).toBe('number');
      expect(schema.enumField.type).toBe('enum');
      expect(schema.derivedField.type).toBe('derived');
    });

    test('works with complex schema', () => {
      const schema = defineSchema({
        name: llm('A name'),
        age: number(18, 65),
        status: staticValue('active'),
        plan: enumField(['free', 'pro']),
        email: derived(['name'], (ctx) => `${ctx.name}@example.com`),
        bio: llm('A bio', { coherence: ['name', 'age'] }),
      });

      expect(Object.keys(schema)).toHaveLength(6);
    });
  });

  describe('validateSchema()', () => {
    test('validates correct schema without errors', () => {
      const schema = defineSchema({
        name: llm('A name'),
        age: number(18, 65),
        email: derived(['name'], (ctx) => `${ctx.name}@example.com`),
      });

      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('throws on LLM coherence with non-existent field', () => {
      const schema = defineSchema({
        bio: llm('A bio', { coherence: ['name', 'age'] }),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Field "bio" declares coherence with non-existent field "name"'
      );
    });

    test('throws on derived field with non-existent dependency', () => {
      const schema = defineSchema({
        email: derived(['name'], (ctx) => `${ctx.name}@example.com`),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Derived field "email" depends on non-existent field "name"'
      );
    });

    test('throws on circular dependency between derived fields', () => {
      const schema = defineSchema({
        a: derived(['b'], (ctx) => ctx.b),
        b: derived(['a'], (ctx) => ctx.a),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Circular dependency detected between "a" and "b"'
      );
    });

    test('throws on invalid number range (min >= max)', () => {
      const schema = defineSchema({
        value: number(100, 50),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Number field "value" has invalid range: min (100) >= max (50)'
      );
    });

    test('throws on number field with equal min and max', () => {
      const schema = defineSchema({
        constant: number(42, 42),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Number field "constant" has invalid range: min (42) >= max (42)'
      );
    });

    test('throws on enum field with empty options', () => {
      const schema = defineSchema({
        empty: enumField([]),
      });

      expect(() => validateSchema(schema)).toThrow(
        'Enum field "empty" has no options'
      );
    });

    test('validates schema with coherence to existing fields', () => {
      const schema = defineSchema({
        name: llm('A name'),
        age: number(18, 65),
        bio: llm('A bio', { coherence: ['name', 'age'] }),
      });

      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates schema with derived field with multiple dependencies', () => {
      const schema = defineSchema({
        firstName: llm('First name'),
        lastName: llm('Last name'),
        fullName: derived(
          ['firstName', 'lastName'],
          (ctx) => `${ctx.firstName} ${ctx.lastName}`
        ),
      });

      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates complex schema with all field types', () => {
      const schema = defineSchema({
        name: llm('A name'),
        age: number(18, 65),
        status: staticValue('active'),
        plan: enumField(['free', 'pro', 'enterprise']),
        email: derived(['name'], (ctx) => `${ctx.name}@example.com`),
        bio: llm('A bio', { coherence: ['name', 'age'] }),
      });

      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('validates derived field depending on another derived field', () => {
      // This is allowed - field order doesn't matter as long as dependencies exist
      const schema = defineSchema({
        email: derived(['fullName'], (ctx) => `${ctx.fullName}@example.com`),
        fullName: derived(['name'], (ctx) => ctx.name),
        name: llm('A name'),
      });

      // Should not throw - all dependencies exist
      expect(() => validateSchema(schema)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('llm with empty prompt string', () => {
      const field = llm('');

      expect(field.type).toBe('llm');
      expect(field.prompt).toBe('');
    });

    test('llm with empty coherence array', () => {
      const field = llm('Prompt', { coherence: [] });

      expect(field.type).toBe('llm');
      expect(field.coherence).toEqual([]);
    });

    test('llm with empty examples array', () => {
      const field = llm('Prompt', { examples: [] });

      expect(field.type).toBe('llm');
      expect(field.examples).toEqual([]);
    });

    test('staticValue with null', () => {
      const field = staticValue(null);

      expect(field.type).toBe('static');
      expect(field.value).toBe(null);
    });

    test('staticValue with undefined', () => {
      const field = staticValue(undefined);

      expect(field.type).toBe('static');
      expect(field.value).toBe(undefined);
    });

    test('number with zero range', () => {
      const field = number(0, 0);

      expect(field.type).toBe('number');
      expect(field.min).toBe(0);
      expect(field.max).toBe(0);
    });

    test('number with 0 decimals', () => {
      const field = number(0, 100, { decimals: 0 });

      expect(field.type).toBe('number');
      expect(field.decimals).toBe(0);
    });

    test('enumField with single option', () => {
      const field = enumField(['only']);

      expect(field.type).toBe('enum');
      expect(field.options).toEqual(['only']);
    });

    test('derived with empty depends array validates', () => {
      const schema = defineSchema({
        constant: derived([], () => 'value'),
      });

      // Should not throw - no dependencies to check
      expect(() => validateSchema(schema)).not.toThrow();
    });

    test('complex nested object in staticValue', () => {
      const complexObj = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
        array: [1, 2, 3],
      };
      const field = staticValue(complexObj);

      expect(field.value).toEqual(complexObj);
    });
  });

  describe('Type Inference', () => {
    test('schema maintains type information', () => {
      const schema = defineSchema({
        name: llm('A name'),
        age: number(18, 65),
      });

      // TypeScript should infer the correct types
      type SchemaType = typeof schema;
      type NameField = SchemaType['name'];
      type AgeField = SchemaType['age'];

      const nameField: NameField = schema.name;
      const ageField: AgeField = schema.age;

      expect(nameField.type).toBe('llm');
      expect(ageField.type).toBe('number');
    });
  });
});
