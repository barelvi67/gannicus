/**
 * Schema builder API for defining synthetic data schemas
 */

import type {
  LLMField,
  StaticField,
  NumberField,
  EnumField,
  DerivedField,
  Schema,
} from '../types/index.ts';

/**
 * Create an LLM-generated field
 *
 * @example
 * ```ts
 * llm('A creative tech company name', {
 *   examples: ['Vercel', 'Stripe', 'Linear'],
 *   coherence: ['industry']
 * })
 * ```
 */
export function llm(
  prompt: string,
  options?: {
    coherence?: string[];
    examples?: string[];
    description?: string;
  }
): LLMField {
  return {
    type: 'llm',
    prompt,
    coherence: options?.coherence,
    examples: options?.examples,
    description: options?.description,
  };
}

/**
 * Create a static value field
 *
 * @example
 * ```ts
 * static('active')
 * static(true)
 * static({ plan: 'free' })
 * ```
 */
export function staticValue<T = any>(value: T, options?: { description?: string }): StaticField {
  return {
    type: 'static',
    value,
    description: options?.description,
  };
}

/**
 * Create a number field with range
 *
 * @example
 * ```ts
 * number(18, 65) // Age between 18-65
 * number(0, 100, { decimals: 2 }) // Percentage with 2 decimals
 * ```
 */
export function number(
  min: number,
  max: number,
  options?: {
    decimals?: number;
    description?: string;
  }
): NumberField {
  return {
    type: 'number',
    min,
    max,
    decimals: options?.decimals,
    description: options?.description,
  };
}

/**
 * Create an enum field with optional weights
 *
 * @example
 * ```ts
 * // Equal probability
 * enumField(['small', 'medium', 'large'])
 *
 * // Weighted distribution
 * enumField([
 *   { value: 'free', weight: 70 },
 *   { value: 'pro', weight: 25 },
 *   { value: 'enterprise', weight: 5 }
 * ])
 * ```
 */
export function enumField(
  options: string[] | { value: string; weight?: number }[],
  config?: { description?: string }
): EnumField {
  return {
    type: 'enum',
    options,
    description: config?.description,
  };
}

/**
 * Create a derived field computed from other fields
 *
 * @example
 * ```ts
 * derived(['firstName', 'lastName'], (ctx) => {
 *   return `${ctx.firstName} ${ctx.lastName}`
 * })
 *
 * derived(['price', 'quantity'], (ctx) => ctx.price * ctx.quantity)
 * ```
 */
export function derived<T = any>(
  depends: string[],
  compute: (context: Record<string, any>) => T,
  options?: { description?: string }
): DerivedField {
  return {
    type: 'derived',
    depends,
    compute,
    description: options?.description,
  };
}

/**
 * Define a complete schema
 *
 * @example
 * ```ts
 * const userSchema = defineSchema({
 *   name: llm('A realistic full name'),
 *   age: number(18, 65),
 *   plan: enumField(['free', 'pro', 'enterprise']),
 *   email: derived(['name'], (ctx) => {
 *     return ctx.name.toLowerCase().replace(' ', '.') + '@example.com'
 *   })
 * })
 * ```
 */
export function defineSchema<T extends Schema>(schema: T): T {
  return schema;
}

/**
 * Validate schema for common issues
 * Throws if schema is invalid
 */
export function validateSchema(schema: Schema): void {
  const fieldNames = Object.keys(schema);

  for (const [fieldName, field] of Object.entries(schema)) {
    // Validate coherence references
    if (field.type === 'llm' && field.coherence) {
      for (const dep of field.coherence) {
        if (!fieldNames.includes(dep)) {
          throw new Error(
            `Field "${fieldName}" declares coherence with non-existent field "${dep}"`
          );
        }
      }
    }

    // Validate derived dependencies
    if (field.type === 'derived') {
      for (const dep of field.depends) {
        if (!fieldNames.includes(dep)) {
          throw new Error(
            `Derived field "${fieldName}" depends on non-existent field "${dep}"`
          );
        }
      }

      // Check for circular dependencies (simple check)
      const depField = schema[field.depends[0]];
      if (depField?.type === 'derived' && depField.depends.includes(fieldName)) {
        throw new Error(
          `Circular dependency detected between "${fieldName}" and "${field.depends[0]}"`
        );
      }
    }

    // Validate number ranges
    if (field.type === 'number') {
      if (field.min >= field.max) {
        throw new Error(
          `Number field "${fieldName}" has invalid range: min (${field.min}) >= max (${field.max})`
        );
      }
    }

    // Validate enum options
    if (field.type === 'enum') {
      if (field.options.length === 0) {
        throw new Error(`Enum field "${fieldName}" has no options`);
      }
    }
  }
}
