#!/usr/bin/env bun
/**
 * Gannicus CLI - LLM-powered synthetic data generation
 */

import * as clack from '@clack/prompts';
import { generate } from './commands/generate.ts';
import { init } from './commands/init.ts';
import { version } from '../package.json';
import { GANNICUS_TITLE } from './utils/art.ts';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log(GANNICUS_TITLE);
  clack.intro(`v${version}`);

  switch (command) {
    case 'generate':
    case 'gen':
      await generate(args.slice(1));
      break;

    case 'init':
      await init();
      break;

    case 'init':
      await init();
      break;

    case 'version':
    case '-v':
    case '--version':
      console.log(`v${version}`);
      break;

    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;

    default:
      // Interactive mode
      await interactiveMode();
      break;
  }

  clack.outro('✨ Done!');
}

async function interactiveMode() {
  const action = await clack.select({
    message: 'What would you like to do?',
    options: [
      { value: 'generate', label: 'Generate synthetic data' },
      { value: 'help', label: 'Show help' },
      { value: 'exit', label: 'Exit' },
    ],
  });

  if (clack.isCancel(action)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  switch (action) {
    case 'generate':
      await generate([]);
      break;
    case 'help':
      showHelp();
      break;
    case 'exit':
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
Gannicus v${version} - LLM-powered synthetic data generation

USAGE:
  gannicus [command] [options]

COMMANDS:
  generate, gen       Generate synthetic data
  version, -v        Show version
  help, -h           Show this help

EXAMPLES:
  gannicus               Run in interactive mode
  gannicus generate      Generate data from current schema
  gannicus --version     Show version

For more info, visit: https://github.com/yourusername/gannicus
`);
}

main().catch((error) => {
  clack.log.error(error.message);
  process.exit(1);
});
