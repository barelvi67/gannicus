/**
 * Generate command - Creates synthetic data from schema
 */

import * as clack from '@clack/prompts';
import { OllamaProvider } from '@gannicus/core';

export async function generate(args: string[]) {
  const spinner = clack.spinner();

  try {
    // 1. Check Ollama health
    spinner.start('Checking Ollama...');
    const provider = new OllamaProvider();
    const health = await provider.healthCheck();

    if (!health.ok) {
      spinner.stop('Ollama check failed');
      clack.log.error(health.message);
      clack.note(
        `To install Ollama:
  1. Visit https://ollama.ai
  2. Download and install
  3. Run: ollama pull phi3:mini`,
        'Installation Guide'
      );
      process.exit(1);
    }

    spinner.stop('Ollama ready ✓');

    // 2. Get generation parameters
    const count = await clack.text({
      message: 'How many records to generate?',
      placeholder: '10',
      initialValue: '10',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Must be a positive number';
        if (num > 1000) return 'Maximum 1000 records for MVP';
      },
    });

    if (clack.isCancel(count)) {
      clack.cancel('Generation cancelled');
      process.exit(0);
    }

    const recordCount = parseInt(count);

    // 3. Select example schema
    const schemaChoice = await clack.select({
      message: 'Choose an example schema:',
      options: [
        { value: 'user', label: 'User Profile (name, email, age)' },
        { value: 'company', label: 'Tech Company (name, industry, size)' },
        { value: 'product', label: 'Product (name, description, price)' },
      ],
    });

    if (clack.isCancel(schemaChoice)) {
      clack.cancel('Generation cancelled');
      process.exit(0);
    }

    // 4. Import and load schema
    const schema = await loadExampleSchema(schemaChoice as string);

    // 5. Generate data
    spinner.start(`Generating ${recordCount} records...`);

    const { generate: generateData } = await import('@gannicus/core');

    const startTime = Date.now();
    let lastProgress = 0;

    const result = await generateData(schema, {
      count: recordCount,
      provider: { name: 'ollama', model: 'phi3:mini' },
      onProgress: (current, total) => {
        const progress = Math.floor((current / total) * 100);
        if (progress > lastProgress + 10) {
          spinner.message(`Generating ${recordCount} records... ${progress}%`);
          lastProgress = progress;
        }
      },
    });

    const duration = Date.now() - startTime;
    spinner.stop(`Generated ${recordCount} records in ${(duration / 1000).toFixed(1)}s ✓`);

    // 6. Display results
    clack.note(
      JSON.stringify(result.data.slice(0, 3), null, 2) +
        (result.data.length > 3 ? '\n... and more' : ''),
      'Sample Output'
    );

    clack.log.success(
      `Stats: ${result.stats.llmCalls} LLM calls | ${result.stats.provider} (${result.stats.model})`
    );

    // 7. Ask to save
    const shouldSave = await clack.confirm({
      message: 'Save to file?',
    });

    if (clack.isCancel(shouldSave)) {
      return;
    }

    if (shouldSave) {
      const filename = await clack.text({
        message: 'Filename:',
        placeholder: 'output.json',
        initialValue: 'output.json',
      });

      if (!clack.isCancel(filename)) {
        await Bun.write(filename, JSON.stringify(result.data, null, 2));
        clack.log.success(`Saved to ${filename}`);
      }
    }
  } catch (error) {
    spinner.stop('Generation failed');
    if (error instanceof Error) {
      clack.log.error(error.message);
    }
    process.exit(1);
  }
}

async function loadExampleSchema(choice: string) {
  const { defineSchema, llm, number, enumField, derived } = await import('@gannicus/core');

  switch (choice) {
    case 'user':
      return defineSchema({
        name: llm('A realistic full name'),
        age: number(18, 65),
        email: derived(['name'], (ctx) => {
          return ctx.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
        }),
      });

    case 'company':
      return defineSchema({
        name: llm('A creative tech startup name', {
          examples: ['Vercel', 'Stripe', 'Linear'],
        }),
        industry: enumField(['SaaS', 'Fintech', 'DevTools', 'AI', 'E-commerce']),
        size: enumField([
          { value: 'Seed', weight: 40 },
          { value: 'Series A', weight: 30 },
          { value: 'Series B+', weight: 20 },
          { value: 'Public', weight: 10 },
        ]),
      });

    case 'product':
      return defineSchema({
        name: llm('An innovative tech product name'),
        description: llm('A one-line product description', {
          coherence: ['name'],
        }),
        price: number(9, 999, { decimals: 2 }),
        category: enumField(['Productivity', 'Development', 'Design', 'Analytics']),
      });

    default:
      throw new Error('Unknown schema');
  }
}
