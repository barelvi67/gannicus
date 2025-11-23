/**
 * Basic usage example - Generate user profiles
 */

import { defineSchema, llm, number, enumField, derived, generate } from 'gannicus-core';

// Define schema
const userSchema = defineSchema({
  name: llm('A realistic full name'),
  age: number(18, 65),
  country: enumField(['USA', 'UK', 'Canada', 'Germany', 'France']),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
  }),
});

// Generate data
const result = await generate(userSchema, {
  count: 10,
  provider: {
    name: 'ollama',
    model: 'phi3:mini',
  },
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`);
  },
});

console.log('Generated users:', result.data);
console.log('Stats:', result.stats);
