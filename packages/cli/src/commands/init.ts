import * as clack from '@clack/prompts';
import pc from 'picocolors';

export async function init() {
  clack.intro(pc.cyan('🌟 Initialization Mode'));

  const configType = await clack.select({
    message: 'What would you like to initialize?',
    options: [
      { value: 'config', label: 'Configuration file (gannicus.json)' },
      { value: 'schema', label: 'Example Schema (gannicus.schema.ts)' },
      { value: 'both', label: 'Both' },
    ],
  });

  if (clack.isCancel(configType)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  if (configType === 'config' || configType === 'both') {
    await createConfigFile();
  }

  if (configType === 'schema' || configType === 'both') {
    await createSchemaFile();
  }

  clack.outro('✨ Initialization complete!');
}

async function createConfigFile() {
  const config = {
    $schema: "https://raw.githubusercontent.com/Arakiss/gannicus/main/schema.json",
    count: 10,
    format: "json",
    provider: {
      name: "ollama",
      model: "qwen2.5:7b"
    },
    output: "output.json"
  };

  await Bun.write('gannicus.json', JSON.stringify(config, null, 2));
  clack.log.success(pc.green('Created gannicus.json'));
}

async function createSchemaFile() {
  const content = `import { defineSchema, llm, number, enumField, derived } from 'gannicus';

export default defineSchema({
  name: llm('A realistic full name'),
  age: number(18, 65),
  role: enumField(['Admin', 'User', 'Guest']),
  email: derived(['name'], (ctx) => {
    return ctx.name.toLowerCase().replace(/\\s+/g, '.') + '@example.com';
  }),
});`;

  await Bun.write('gannicus.schema.ts', content);
  clack.log.success(pc.green('Created gannicus.schema.ts'));
}

