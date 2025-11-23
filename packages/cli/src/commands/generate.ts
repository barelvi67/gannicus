/**
 * Generate command - Creates synthetic data from schema
 * Supports both interactive mode and programmatic mode with flags
 */

import * as clack from '@clack/prompts';
import { OllamaProvider } from '@gannicus/core';
import type { Schema } from '@gannicus/core';

interface GenerateOptions {
  schema?: string;
  count?: number;
  model?: string;
  output?: string;
  format?: 'json' | 'ndjson' | 'csv';
  quiet?: boolean;
  events?: boolean;  // Emit events in NDJSON format to stderr
  stream?: boolean;  // Stream records as they're generated
}

export async function generate(args: string[]) {
  // Parse flags
  const options = parseArgs(args);

  // Determine mode: programmatic (has flags) or interactive (no flags)
  const isProgrammatic = Object.keys(options).length > 0;

  if (isProgrammatic) {
    await programmaticMode(options);
  } else {
    await interactiveMode();
  }
}

/**
 * Parse command-line arguments into options
 */
function parseArgs(args: string[]): GenerateOptions {
  const options: GenerateOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--schema':
      case '-s':
        options.schema = args[++i];
        break;
      case '--count':
      case '-c':
        options.count = parseInt(args[++i]);
        break;
      case '--model':
      case '-m':
        options.model = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'json' | 'ndjson' | 'csv';
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      case '--events':
      case '-e':
        options.events = true;
        break;
      case '--stream':
        options.stream = true;
        break;
    }
  }

  return options;
}

/**
 * Event emitter for LLM consumption
 * Emits NDJSON events to stderr
 */
function emitEvent(type: string, data: any) {
  const event = { type, ...data, timestamp: Date.now() };
  console.error(JSON.stringify(event));
}

/**
 * Programmatic mode - Non-interactive execution with flags
 * Perfect for LLMs and automation
 */
async function programmaticMode(options: GenerateOptions) {
  try {
    // Defaults
    const count = options.count || 10;
    const model = options.model || 'phi3:mini';
    const format = options.format || 'json';
    const quiet = options.quiet || false;
    const events = options.events || false;
    const stream = options.stream || false;

    // Emit start event
    if (events) {
      emitEvent('start', { count, model, format });
    }

    // Load schema
    let schema: Schema;

    if (!options.schema) {
      throw new Error('--schema is required in programmatic mode');
    }

    if (options.schema === '-') {
      // Read from stdin
      const stdinText = await Bun.stdin.text();
      schema = JSON.parse(stdinText);
    } else if (options.schema.endsWith('.json')) {
      // Read from file
      const file = Bun.file(options.schema);
      schema = await file.json();
    } else {
      // Load example schema by name
      schema = await loadExampleSchema(options.schema);
    }

    if (events) {
      emitEvent('schema_loaded', { fields: Object.keys(schema) });
    }

    // Check Ollama health (silent in quiet mode)
    const provider = new OllamaProvider({ model });
    const health = await provider.healthCheck();

    if (!health.ok) {
      if (events) {
        emitEvent('error', { message: health.message, stage: 'health_check' });
      } else if (!quiet) {
        console.error(`Error: ${health.message}`);
      }
      process.exit(1);
    }

    if (events) {
      emitEvent('health_check', { status: 'ok', model });
    }

    // Generate data
    const { generate: generateData } = await import('@gannicus/core');
    const generatedRecords: any[] = [];
    const startTime = Date.now();

    const result = await generateData(schema, {
      count,
      provider: { name: 'ollama', model },
      onProgress: (current, total) => {
        const progress = Math.floor((current / total) * 100);

        // Emit progress event
        if (events) {
          emitEvent('progress', { current, total, percent: progress });
        } else if (!quiet && progress % 25 === 0) {
          console.error(`Progress: ${current}/${total} (${progress}%)`);
        }

        // Stream records as they're generated
        if (stream && result.data[current - 1]) {
          const record = result.data[current - 1];
          generatedRecords.push(record);

          if (events) {
            emitEvent('record', { index: current - 1, data: record });
          }

          // If streaming without events, output record immediately
          if (!events && !options.output) {
            console.log(JSON.stringify(record));
          }
        }
      },
    });

    const duration = Date.now() - startTime;

    // Format output
    let outputData: string;

    switch (format) {
      case 'json':
        outputData = JSON.stringify(result.data, null, 2);
        break;
      case 'ndjson':
        outputData = result.data.map((record) => JSON.stringify(record)).join('\n');
        break;
      case 'csv':
        outputData = formatCSV(result.data);
        break;
      default:
        outputData = JSON.stringify(result.data, null, 2);
    }

    // Output to file or stdout (unless streaming already outputted)
    if (options.output) {
      await Bun.write(options.output, outputData);
      if (events) {
        emitEvent('file_saved', { path: options.output, records: result.data.length });
      } else if (!quiet) {
        console.error(`Saved to ${options.output}`);
      }
    } else if (!stream) {
      // Only output all at once if not streaming
      console.log(outputData);
    }

    // Emit complete event
    if (events) {
      emitEvent('complete', {
        records: result.stats.totalRecords,
        llmCalls: result.stats.llmCalls,
        duration,
        provider: result.stats.provider,
        model: result.stats.model,
      });
    } else if (!quiet) {
      // Stats (to stderr so it doesn't interfere with piping)
      console.error(
        `Stats: ${result.stats.llmCalls} LLM calls | ${duration}ms | ${result.stats.provider} (${result.stats.model})`
      );
    }

    process.exit(0);
  } catch (error) {
    if (options.events) {
      emitEvent('error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } else if (options.quiet) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
    }
    process.exit(1);
  }
}

/**
 * Interactive mode - Original clack-based UI
 */
async function interactiveMode() {
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

/**
 * Load example schema by name
 */
async function loadExampleSchema(choice: string): Promise<Schema> {
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
      throw new Error(`Unknown schema: ${choice}`);
  }
}

/**
 * Format data as CSV
 */
function formatCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((record) => {
    return headers
      .map((header) => {
        const value = record[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
