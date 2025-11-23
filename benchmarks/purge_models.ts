#!/usr/bin/env bun

/**
 * Purge unwanted models from Ollama
 * Keeps only the best performing models based on benchmark results
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { getRecommendedModels } from '../packages/core/src/models/index.ts';

const execAsync = promisify(exec);

// Get models to KEEP from recommended models configuration
const recommendedModels = getRecommendedModels();
const KEEP_MODELS = recommendedModels.map(m => m.id);

async function listOllamaModels(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('ollama list');
    const lines = stdout.split('\n').slice(1); // Skip header
    const models: string[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 0) {
          const modelName = parts[0];
          if (modelName && !modelName.includes('NAME')) {
            models.push(modelName);
          }
        }
      }
    }
    
    return models;
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

async function removeModel(model: string): Promise<boolean> {
  try {
    console.log(`🗑️  Removing ${model}...`);
    await execAsync(`ollama rm ${model}`);
    console.log(`✅ Removed ${model}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to remove ${model}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🧹 MODEL PURGE SCRIPT 🧹\n');
  console.log('This will remove all models except the best performers:\n');
  console.log('KEEPING:');
  KEEP_MODELS.forEach(m => console.log(`  ✅ ${m}`));
  console.log('\nREMOVING:');
  REMOVE_MODELS.forEach(m => console.log(`  ❌ ${m}`));
  console.log('\n');

  // List all installed models
  console.log('📋 Checking installed models...\n');
  const installedModels = await listOllamaModels();
  
  if (installedModels.length === 0) {
    console.log('No models found in Ollama.');
    return;
  }

  console.log(`Found ${installedModels.length} installed model(s):`);
  installedModels.forEach(m => console.log(`  - ${m}`));
  console.log('');

  // Find models to remove
  // Remove all models EXCEPT those in KEEP_MODELS
  const toRemove: string[] = [];
  
  for (const installed of installedModels) {
    // Check if this model should be kept
    const shouldKeep = KEEP_MODELS.some(keepModel => {
      const keepBase = keepModel.split(':')[0];
      const keepTag = keepModel.split(':')[1];
      const installedBase = installed.split(':')[0];
      const installedTag = installed.split(':')[1] || 'latest';
      
      // Exact match
      if (installed === keepModel) return true;
      
      // Match by base name and tag (e.g., "llama3.2:3b" matches "llama3.2:3b")
      if (installedBase === keepBase && installedTag === keepTag) return true;
      
      // Match by base name if tags match or one is missing
      if (installedBase === keepBase && (!keepTag || !installedTag || installedTag === keepTag)) return true;
      
      return false;
    });
    
    // If not in keep list, add to remove list
    if (!shouldKeep) {
      toRemove.push(installed);
    }
  }

  if (toRemove.length === 0) {
    console.log('✅ No models to remove. All unwanted models are already purged.');
    return;
  }

  console.log(`\n🗑️  Will remove ${toRemove.length} model(s):`);
  toRemove.forEach(m => console.log(`   - ${m}`));
  console.log('');

  // Confirm removal
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('⚠️  This action cannot be undone!');
    console.log('Run with --yes flag to confirm: bun benchmarks/purge_models.ts --yes\n');
    return;
  }

  // Remove models
  let removed = 0;
  let failed = 0;

  for (const model of toRemove) {
    const success = await removeModel(model);
    if (success) {
      removed++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 PURGE SUMMARY:`);
  console.log(`   Removed: ${removed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n✅ Kept models: ${KEEP_MODELS.join(', ')}`);
}

main().catch(console.error);

