/**
 * Generate command - Extremely configurable and versatile CLI
 * Designed for both human users and LLM consumption
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { OllamaProvider } from 'gannicus';
import { getModelForUseCase, getModelById } from 'gannicus';
import type { Schema, GenerateOptions as CoreGenerateOptions } from 'gannicus';
import { GANNICUS_TITLE } from '../utils/art.ts';

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

    if (!quiet && !events) {
      console.log(pc.cyan('🚀 Starting generation...'));
    }

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
      const timeStr = duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;
      console.error(
        `\n${pc.green('✔ Done!')} ${pc.dim('|')} ` +
        `${pc.bold(result.stats.totalRecords.toString())} records ${pc.dim('|')} ` +
        `${pc.yellow(result.stats.llmCalls.toString())} LLM calls ${pc.dim('|')} ` +
        `${timeStr} ${pc.dim('|')} ` +
        `${pc.blue(result.stats.provider)}/${pc.magenta(result.stats.model)}`
      );
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

async function interactiveMode() {
  // Title is already shown in main index.ts for top-level calls, 
  // but if called directly or needed context, clack.intro is good.
  // We'll keep clack intro simple here.
  clack.intro(pc.cyan('⚡ Generator Mode'));

  const group = await clack.group({
    count: () => clack.text({
      message: 'How many records to generate?',
      placeholder: '10',
      initialValue: '10',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Must be a positive number';
        if (num > 10000) return 'Maximum 10000 records';
      },
    }),
    schema: () => clack.select({
      message: 'Choose a schema source:',
      options: [
        { value: 'example:user', label: 'Example: User Profile' },
        { value: 'example:company', label: 'Example: Tech Company' },
        { value: 'example:product', label: 'Example: Product' },
        { value: 'file', label: 'Load from file...' },
        { value: 'wizard', label: 'Create new schema (Wizard)' },
      ],
    }),
    schemaFile: ({ results }) => {
      if (results.schema === 'file') {
        return clack.text({
          message: 'Path to schema file:',
          placeholder: 'gannicus.schema.ts',
          validate: (value) => {
            if (!value) return 'Path is required';
          },
        });
      }
    },
    model: () => clack.select({
      message: 'Select model strategy:',
      options: [
        { value: 'development', label: 'Development (Fastest, cached)', hint: 'llama3.2:3b' },
        { value: 'production', label: 'Production (Best quality)', hint: 'qwen2.5:7b' },
        { value: 'custom', label: 'Custom model...' },
      ],
    }),
    customModel: ({ results }) => {
      if (results.model === 'custom') {
        return clack.text({
          message: 'Enter model name:',
          placeholder: 'llama3:latest',
          validate: (value) => {
            if (!value) return 'Model name is required';
          },
        });
      }
    },
    output: () => clack.select({
      message: 'Output format:',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
        { value: 'ndjson', label: 'NDJSON' },
        { value: 'stdout', label: 'Print to console' },
      ],
    }),
    filename: ({ results }) => {
      if (results.output !== 'stdout') {
        return clack.text({
          message: 'Output filename:',
          placeholder: `output.${results.output}`,
          initialValue: `output.${results.output}`,
        });
      }
    },
  }, {
    onCancel: () => {
      clack.cancel('Operation cancelled');
      process.exit(0);
    },
  });

  const spinner = clack.spinner();
  spinner.start('Preparing generation...');

  try {
    // Load schema based on choice
    let schema: Schema;
    if (group.schema.startsWith('example:')) {
      schema = await loadExampleSchema(group.schema.split(':')[1]);
    } else if (group.schema === 'file') {
      const file = Bun.file(group.schemaFile!);
      if (!(await file.exists())) {
        throw new Error(`File not found: ${group.schemaFile}`);
      }
      // Dynamic import of schema file not supported in this simple implementation
      // We'll assume it's a JSON file for now, or basic TS evaluation
      // For full support we need a proper loader
      schema = await file.json(); 
    } else if (group.schema === 'wizard') {
        // TODO: Implement wizard
        schema = await runSchemaWizard();
    } else {
        throw new Error('Invalid schema selection');
    }

    // Determine model
    const modelName = group.model === 'custom' ? group.customModel! : 
                     group.model === 'development' ? 'llama3.2:3b' : 'qwen2.5:7b'; // Simplified for demo

    spinner.message('Checking Ollama connection...');
    const provider = new OllamaProvider({ model: modelName });
    const health = await provider.healthCheck();
    
    if (!health.ok) {
        spinner.stop('Ollama check failed');
        clack.log.error(health.message);
        process.exit(1);
    }

    spinner.message(`Generating ${group.count} records...`);
    
    const { generate: generateData } = await import('gannicus');
    const startTime = Date.now();
    let lastProgress = 0;

    const result = await generateData(schema, {
      count: parseInt(group.count),
      provider: { name: 'ollama', model: modelName },
      onProgress: (current, total) => {
        const progress = Math.floor((current / total) * 100);
        if (progress > lastProgress + 5) {
          spinner.message(`Generating... ${progress}% (${current}/${total})`);
          lastProgress = progress;
        }
      },
    });

    const duration = Date.now() - startTime;
    spinner.stop(`Generated ${group.count} records in ${(duration / 1000).toFixed(2)}s`);

    // Save output
    if (group.output !== 'stdout' && group.filename) {
        const content = formatOutput(result.data, group.output, { pretty: true });
        await Bun.write(group.filename, content);
        clack.log.success(pc.green(`Saved to ${group.filename}`));
    } else {
        console.log(formatOutput(result.data, 'json', { pretty: true }));
    }

    clack.outro(pc.cyan('✨ Generation complete!'));

  } catch (error) {
    spinner.stop('Generation failed');
    clack.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function runSchemaWizard(): Promise<Schema> {
    clack.log.info(pc.blue('🧙 Schema Wizard'));
    
    // Very basic wizard implementation placeholder
    // In a real version, this would loop to add fields
    const fields = await clack.group({
        fieldName: () => clack.text({ message: 'Field name:' }),
        fieldType: () => clack.select({
            message: 'Field type:',
            options: [
                { value: 'llm', label: 'LLM Generated' },
                { value: 'number', label: 'Number' },
                { value: 'static', label: 'Static Value' }
            ]
        }),
        prompt: ({ results }) => {
            if (results.fieldType === 'llm') {
                return clack.text({ message: 'Prompt (what to generate):' });
            }
        }
    });
    
    const { defineSchema, llm, number, staticValue } = await import('gannicus');
    
    // Construct a simple schema from one field for now
    const schemaObj: any = {};
    if (fields.fieldType === 'llm') {
        schemaObj[fields.fieldName] = llm(fields.prompt!);
    } else if (fields.fieldType === 'number') {
        schemaObj[fields.fieldName] = number(0, 100);
    } else {
        schemaObj[fields.fieldName] = staticValue('test');
    }
    
    return defineSchema(schemaObj);
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
