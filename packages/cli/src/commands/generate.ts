/**
 * Generate command - Extremely configurable and versatile CLI
 * Designed for both human users and LLM consumption
 */

import * as clack from '@clack/prompts';
import { OllamaProvider } from 'gannicus';
import { getModelForUseCase, getModelById } from 'gannicus';
import type { Schema, GenerateOptions as CoreGenerateOptions } from 'gannicus';

interface GenerateCLIOptions {
  // Schema input
  schema?: string;
  schemaFile?: string;
  schemaStdin?: boolean;
  
  // Generation parameters
  count?: number;
  seed?: number;
  
  // Model configuration
  model?: string;
  useCase?: 'development' | 'production' | 'fastest' | 'bestQuality';
  temperature?: number;
  baseURL?: string;
  
  // Output configuration
  output?: string;
  format?: 'json' | 'ndjson' | 'csv' | 'yaml' | 'tsv';
  pretty?: boolean;
  indent?: number;
  
  // Behavior flags
  quiet?: boolean;
  verbose?: boolean;
  events?: boolean;
  stream?: boolean;
  noProgress?: boolean;
  
  // Advanced options
  maxRetries?: number;
  timeout?: number;
  batchSize?: number;
  concurrency?: number;
  
  // Configuration file
  config?: string;
  
  // Help
  help?: boolean;
}

/**
 * Parse command-line arguments with extensive support
 */
function parseArgs(args: string[]): GenerateCLIOptions {
  const options: GenerateCLIOptions = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    const nextArg = args[i + 1];

    // Schema options
    if (arg === '--schema' || arg === '-s') {
      options.schema = nextArg;
      i += 2;
      continue;
    }
    if (arg === '--schema-file' || arg === '--file' || arg === '-f') {
      options.schemaFile = nextArg;
      i += 2;
      continue;
    }
    if (arg === '--schema-stdin' || arg === '--stdin') {
      options.schemaStdin = true;
      i++;
      continue;
    }

    // Generation parameters
    if (arg === '--count' || arg === '-c' || arg === '-n') {
      options.count = parseInt(nextArg);
      i += 2;
      continue;
    }
    if (arg === '--seed' || arg === '--random-seed') {
      options.seed = parseInt(nextArg);
      i += 2;
      continue;
    }

    // Model configuration
    if (arg === '--model' || arg === '-m') {
      options.model = nextArg;
      i += 2;
      continue;
    }
    if (arg === '--use-case' || arg === '--usecase') {
      options.useCase = nextArg as any;
      i += 2;
      continue;
    }
    if (arg === '--temperature' || arg === '--temp' || arg === '-t') {
      options.temperature = parseFloat(nextArg);
      i += 2;
      continue;
    }
    if (arg === '--base-url' || arg === '--ollama-url') {
      options.baseURL = nextArg;
      i += 2;
      continue;
    }

    // Output configuration
    if (arg === '--output' || arg === '-o') {
      options.output = nextArg;
      i += 2;
      continue;
    }
    if (arg === '--format') {
      options.format = nextArg as any;
      i += 2;
      continue;
    }
    if (arg === '--pretty') {
      options.pretty = true;
      i++;
      continue;
    }
    if (arg === '--indent') {
      options.indent = parseInt(nextArg);
      i += 2;
      continue;
    }

    // Behavior flags
    if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
      i++;
      continue;
    }
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
      i++;
      continue;
    }
    if (arg === '--events' || arg === '-e') {
      options.events = true;
      i++;
      continue;
    }
    if (arg === '--stream') {
      options.stream = true;
      i++;
      continue;
    }
    if (arg === '--no-progress') {
      options.noProgress = true;
      i++;
      continue;
    }

    // Advanced options
    if (arg === '--max-retries') {
      options.maxRetries = parseInt(nextArg);
      i += 2;
      continue;
    }
    if (arg === '--timeout') {
      options.timeout = parseInt(nextArg);
      i += 2;
      continue;
    }
    if (arg === '--batch-size') {
      options.batchSize = parseInt(nextArg);
      i += 2;
      continue;
    }
    if (arg === '--concurrency') {
      options.concurrency = parseInt(nextArg);
      i += 2;
      continue;
    }

    // Configuration file
    if (arg === '--config' || arg === '--config-file') {
      options.config = nextArg;
      i += 2;
      continue;
    }

    // Help
    if (arg === '--help' || arg === '-h' || arg === 'help') {
      options.help = true;
      i++;
      continue;
    }

    // Unknown argument
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      console.error('Use --help for usage information');
      process.exit(1);
    }

    // Positional argument (treat as schema if not set)
    if (!options.schema && !options.schemaFile && !options.schemaStdin) {
      options.schema = arg;
    }

    i++;
  }

  return options;
}

/**
 * Load configuration from file
 */
async function loadConfigFile(path: string): Promise<Partial<GenerateCLIOptions>> {
  try {
    const file = Bun.file(path);
    const content = await file.text();
    const config = JSON.parse(content);
    return config;
  } catch (error) {
    throw new Error(`Failed to load config file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load schema from various sources
 */
async function loadSchema(options: GenerateCLIOptions): Promise<Schema> {
  // Try config file first
  if (options.config) {
    const config = await loadConfigFile(options.config);
    if (config.schema) {
      options.schema = config.schema;
    }
    if (config.schemaFile) {
      options.schemaFile = config.schemaFile;
    }
  }

  // Load from stdin
  if (options.schemaStdin || options.schema === '-') {
    const stdinText = await Bun.stdin.text();
    return JSON.parse(stdinText);
  }

  // Load from file
  if (options.schemaFile) {
    const file = Bun.file(options.schemaFile);
    return await file.json();
  }

  // Load from schema string (file path or JSON string)
  if (options.schema) {
    // Try as file path first
    try {
      const file = Bun.file(options.schema);
      if (await file.exists()) {
        return await file.json();
      }
    } catch {
      // Not a file, try as JSON string
    }

    // Try parsing as JSON
    try {
      return JSON.parse(options.schema);
    } catch {
      // Not JSON, try as example schema name
      return await loadExampleSchema(options.schema);
    }
  }

  throw new Error('Schema required. Use --schema, --schema-file, --schema-stdin, or provide schema file path');
}

/**
 * Event emitter for LLM consumption
 * Emits structured NDJSON events to stderr
 */
function emitEvent(type: string, data: any, options: GenerateCLIOptions) {
  if (!options.events) return;
  
  const event = {
    type,
    ...data,
    timestamp: Date.now(),
  };
  console.error(JSON.stringify(event));
}

/**
 * Determine model configuration
 */
function getModelConfig(options: GenerateCLIOptions): { model: string; temperature: number } {
  let model: string;
  let temperature: number;

  if (options.useCase) {
    const recommended = getModelForUseCase(options.useCase);
    model = recommended.id;
    temperature = options.temperature ?? recommended.temperature.recommended;
  } else if (options.model) {
    const recommended = getModelById(options.model);
    if (recommended) {
      model = recommended.id;
      temperature = options.temperature ?? recommended.temperature.recommended;
    } else {
      model = options.model;
      temperature = options.temperature ?? 0.1;
    }
  } else {
    const defaultModel = getModelForUseCase('production');
    model = defaultModel.id;
    temperature = options.temperature ?? defaultModel.temperature.recommended;
  }

  return { model, temperature };
}

/**
 * Format output data
 */
function formatOutput(data: any[], format: string, options: GenerateCLIOptions): string {
  const indent = options.pretty ? (options.indent ?? 2) : 0;

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, indent);
    
    case 'ndjson':
      return data.map(r => JSON.stringify(r)).join('\n');
    
    case 'csv':
      return formatCSV(data);
    
    case 'tsv':
      return formatTSV(data);
    
    case 'yaml':
      return formatYAML(data, indent);
    
    default:
      return JSON.stringify(data, null, indent);
  }
}

/**
 * Format as CSV
 */
function formatCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(record =>
    headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Format as TSV
 */
function formatTSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(record =>
    headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
    }).join('\t')
  );
  
  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Format as YAML (simple implementation)
 */
function formatYAML(data: any[], indent: number = 2): string {
  // Simple YAML formatter - for production use a proper YAML library
  return data.map((item, idx) => {
    const prefix = '- '.repeat(Math.floor(indent / 2));
    return `${prefix}${JSON.stringify(item, null, indent).replace(/^/gm, '  ')}`;
  }).join('\n');
}

/**
 * Programmatic mode - Non-interactive, highly configurable
 * Perfect for LLMs and automation
 */
export async function generate(args: string[]) {
  const options = parseArgs(args);

  // Show help
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Determine mode
  const isProgrammatic = Object.keys(options).length > 0 && !options.help;

  if (isProgrammatic) {
    await programmaticMode(options);
  } else {
    await interactiveMode();
  }
}

async function programmaticMode(options: GenerateCLIOptions) {
  try {
    // Load config file if specified
    if (options.config) {
      const config = await loadConfigFile(options.config);
      Object.assign(options, { ...config, ...options }); // CLI args override config
    }

    // Defaults
    const count = options.count ?? 10;
    const format = options.format ?? 'json';
    const quiet = options.quiet ?? false;
    const verbose = options.verbose ?? false;
    const events = options.events ?? false;
    const stream = options.stream ?? false;
    const noProgress = options.noProgress ?? false;

    // Emit start event
    emitEvent('start', { count, format, options }, options);

    // Load schema
    const schema = await loadSchema(options);
    emitEvent('schema_loaded', { fields: Object.keys(schema), fieldCount: Object.keys(schema).length }, options);

    // Get model configuration
    const { model, temperature } = getModelConfig(options);
    emitEvent('model_selected', { model, temperature }, options);

    // Create provider
    const provider = new OllamaProvider({
      model,
      temperature,
      baseURL: options.baseURL,
    });

    // Health check
    if (!quiet || verbose) {
      emitEvent('health_check_start', {}, options);
    }
    const health = await provider.healthCheck();
    if (!health.ok) {
      emitEvent('error', { message: health.message, stage: 'health_check' }, options);
      if (!quiet) console.error(`Error: ${health.message}`);
      process.exit(1);
    }
    emitEvent('health_check', { status: 'ok', model }, options);

    // Generate data
    const { generate: generateData } = await import('gannicus');
    const generatedRecords: any[] = [];
    const startTime = Date.now();
    let lastProgressPercent = 0;

    const generateOptions: CoreGenerateOptions = {
      count,
      provider: { name: 'ollama', model },
      seed: options.seed,
      onProgress: (current, total) => {
        const percent = Math.floor((current / total) * 100);
        
        if (!noProgress && (percent >= lastProgressPercent + 10 || current === total)) {
          lastProgressPercent = percent;
          emitEvent('progress', { current, total, percent }, options);
          
          if (!quiet && !events) {
            console.error(`Progress: ${current}/${total} (${percent}%)`);
          }
        }

        // Stream records as they're generated
        if (stream) {
          // Note: This is a limitation - we can't stream until generation completes
          // For true streaming, we'd need to modify the generator
        }
      },
    };

    const result = await generateData(schema, generateOptions);
    const duration = Date.now() - startTime;

    // Format output
    const outputData = formatOutput(result.data, format, options);

    // Output to file or stdout
    if (options.output) {
      await Bun.write(options.output, outputData);
      emitEvent('file_saved', { path: options.output, records: result.data.length, size: outputData.length }, options);
      if (!quiet && !events) {
        console.error(`Saved ${result.data.length} records to ${options.output}`);
      }
    } else {
      // Output to stdout
      console.log(outputData);
    }

    // Emit complete event
    emitEvent('complete', {
      records: result.stats.totalRecords,
      llmCalls: result.stats.llmCalls,
      duration,
      provider: result.stats.provider,
      model: result.stats.model,
      avgTimePerRecord: duration / result.stats.totalRecords,
    }, options);

    if (!quiet && !events) {
      console.error(`\nStats: ${result.stats.llmCalls} LLM calls | ${duration}ms | ${result.stats.provider} (${result.stats.model})`);
    }

    process.exit(0);
  } catch (error) {
    emitEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, options);

    if (options.quiet) {
      console.error(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

/**
 * Interactive mode - User-friendly CLI
 */
async function interactiveMode() {
  const spinner = clack.spinner();

  try {
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
  3. Run: ollama pull qwen2.5:7b`,
        'Installation Guide'
      );
      process.exit(1);
    }

    spinner.stop('Ollama ready ✓');

    const count = await clack.text({
      message: 'How many records to generate?',
      placeholder: '10',
      initialValue: '10',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Must be a positive number';
        if (num > 10000) return 'Maximum 10000 records';
      },
    });

    if (clack.isCancel(count)) {
      clack.cancel('Generation cancelled');
      process.exit(0);
    }

    const recordCount = parseInt(count);

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

    const schema = await loadExampleSchema(schemaChoice as string);
    spinner.start(`Generating ${recordCount} records...`);

    const { generate: generateData } = await import('gannicus');
    const startTime = Date.now();
    let lastProgress = 0;

    const result = await generateData(schema, {
      count: recordCount,
      provider: { name: 'ollama', model: 'qwen2.5:7b' },
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

    clack.note(
      JSON.stringify(result.data.slice(0, 3), null, 2) +
        (result.data.length > 3 ? '\n... and more' : ''),
      'Sample Output'
    );

    clack.log.success(
      `Stats: ${result.stats.llmCalls} LLM calls | ${result.stats.provider} (${result.stats.model})`
    );

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
  const { defineSchema, llm, number, enumField, derived } = await import('gannicus');

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
 * Show help message
 */
function showHelp() {
  console.log(`
Gannicus Generate - LLM-powered synthetic data generation

USAGE:
  gannicus generate [options]
  gannicus gen [options]

SCHEMA INPUT:
  --schema, -s <path|json|name>    Schema file path, JSON string, or example name
  --schema-file, --file, -f <path> Schema file path
  --schema-stdin, --stdin         Read schema from stdin

GENERATION:
  --count, -c, -n <number>        Number of records to generate (default: 10)
  --seed <number>                  Random seed for reproducibility

MODEL CONFIGURATION:
  --model, -m <name>               Model name (e.g., qwen2.5:7b)
  --use-case <type>                Auto-select model: development, production, fastest, bestQuality
  --temperature, -t <number>        Temperature (0.0-1.0, default: from model recommendation)
  --base-url <url>                 Ollama server URL (default: http://localhost:11434)

OUTPUT:
  --output, -o <path>              Output file path (default: stdout)
  --format <type>                  Output format: json, ndjson, csv, tsv, yaml (default: json)
  --pretty                         Pretty-print JSON output
  --indent <number>                Indentation level (default: 2)

BEHAVIOR:
  --quiet, -q                      Suppress non-essential output
  --verbose, -v                    Verbose output including stack traces
  --events, -e                     Emit NDJSON events to stderr
  --stream                         Stream records as generated (future)
  --no-progress                    Disable progress updates

ADVANCED:
  --max-retries <number>           Maximum retry attempts (future)
  --timeout <ms>                   Request timeout (future)
  --batch-size <number>            Batch size for generation (future)
  --concurrency <number>           Concurrent requests (future)

CONFIGURATION:
  --config, --config-file <path>   Load options from JSON config file

EXAMPLES:
  # Generate 100 user records
  gannicus generate --schema user --count 100

  # Use specific model
  gannicus generate --schema schema.json --model llama3.2:3b --count 50

  # Auto-select production model
  gannicus generate --schema schema.json --use-case production --count 200

  # Read schema from stdin
  echo '{"name": "llm(\"A name\")"}' | gannicus generate --schema-stdin --count 10

  # Output as CSV
  gannicus generate --schema user --count 50 --format csv --output users.csv

  # With events for LLM consumption
  gannicus generate --schema user --count 10 --events > output.json

  # Using config file
  gannicus generate --config config.json

For more information, visit: https://github.com/yourusername/gannicus
`);
}
