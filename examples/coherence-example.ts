/**
 * Coherence example - Generate tech companies with related fields
 */

import { defineSchema, llm, number, enumField, derived, generate } from 'gannicus-core';

const companySchema = defineSchema({
  name: llm('A creative tech startup name', {
    examples: ['Vercel', 'Stripe', 'Linear', 'Supabase'],
  }),

  industry: enumField(['SaaS', 'Fintech', 'DevTools', 'AI', 'E-commerce']),

  tagline: llm('A compelling one-line tagline for the company', {
    coherence: ['name', 'industry'],
  }),

  founded: number(2015, 2024),

  employees: enumField([
    { value: '1-10', weight: 40 },
    { value: '11-50', weight: 30 },
    { value: '51-200', weight: 20 },
    { value: '200+', weight: 10 },
  ]),

  website: derived(['name'], (ctx) => {
    return `https://${ctx.name.toLowerCase().replace(/\s+/g, '')}.com`;
  }),
});

// Generate tech companies
const result = await generate(companySchema, {
  count: 5,
  provider: {
    name: 'ollama',
    model: 'phi3:mini',
  },
});

console.log('Generated companies:');
result.data.forEach((company, i) => {
  console.log(`\n${i + 1}. ${company.name}`);
  console.log(`   ${company.tagline}`);
  console.log(`   Industry: ${company.industry}`);
  console.log(`   Founded: ${company.founded}`);
  console.log(`   Employees: ${company.employees}`);
  console.log(`   Website: ${company.website}`);
});

console.log(`\nStats: ${result.stats.llmCalls} LLM calls in ${result.stats.duration}ms`);
