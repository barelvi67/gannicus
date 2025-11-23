
import { OllamaProvider } from '../packages/core/src/providers/ollama.ts';
import { getRecommendedModels } from '../packages/core/src/models/index.ts';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get models from recommended models configuration
const recommendedModels = getRecommendedModels();
const MODELS = recommendedModels.map(m => m.id);

// Test cases
const TEST_CASES = [
  {
    id: 'simple_entity',
    prompt: 'A technology company name',
    expected: 'entity' 
  },
  {
    id: 'strict_format',
    prompt: 'Generate a price between 10 and 50. NUMBER ONLY.',
    expected: 'number'
  },
  {
    id: 'complex_instruction',
    prompt: 'A short SQL database error phrase. No quotes, no explanations.',
    expected: 'code_snippet'
  },
  {
      id: 'json_object',
      prompt: 'Generate a JSON object with key "status" and value "ok". JSON ONLY.',
      expected: 'json'
  }
];

async function pullModel(model: string) {
    console.log(`⬇️  Downloading/Verifying ${model}...`);
    try {
        await execAsync(`ollama pull ${model}`);
        console.log(`✅ ${model} ready.`);
    } catch (e) {
        console.error(`❌ Error downloading ${model}:`, e.message);
        return false;
    }
    return true;
}

async function runBenchmark() {
  console.log('🔥 STARTING SOTA MODELS BENCHMARK 🔥\n');
  
  const results = [];

  for (const model of MODELS) {
    console.log(`\n----------------------------------------`);
    console.log(`🤖 Preparing model: ${model}`);
    
    // 1. Auto-pull
    const available = await pullModel(model);
    if (!available) {
        console.log(`⚠️ Skipping ${model} due to download error.`);
        continue;
    }

    try {
        const provider = new OllamaProvider({ model, temperature: 0.1 }); 
        
        let modelStats = {
            model,
            successCount: 0,
            failures: [],
            avgTime: 0,
            totalTime: 0
        };

        for (const test of TEST_CASES) {
            process.stdout.write(`   - Test ${test.id}... `);
            
            const start = Date.now();
            let response;
            try {
                response = await provider.generate(test.prompt);
            } catch (e) {
                process.stdout.write('❌ API Error\n');
                modelStats.failures.push({ test: test.id, reason: 'API Error' });
                continue;
            }
            const duration = Date.now() - start;
            
            const clean = isCleanResponse(response, test.expected);
            const displayText = clean.cleaned || response;
            
            if (clean.isClean) {
                process.stdout.write(`✅ (${duration}ms) -> "${displayText.substring(0, 50)}${displayText.length > 50 ? '...' : ''}"\n`);
                modelStats.successCount++;
                modelStats.totalTime += duration;
            } else {
                process.stdout.write(`❌ (${duration}ms) -> "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"\n`);
                modelStats.failures.push({ 
                    test: test.id, 
                    output: response,
                    reason: clean.reason || 'Unknown error'
                });
            }
        }
        
        if (modelStats.successCount > 0) {
            modelStats.avgTime = Math.round(modelStats.totalTime / modelStats.successCount);
        }
        
        results.push(modelStats);

    } catch (e) {
        console.error(`   ❌ Critical failure testing ${model}:`, e);
    }
  }

  console.log('\n\n📊 FINAL SUMMARY 📊');
  console.table(results.map(r => ({
      Model: r.model,
      Score: `${r.successCount}/${TEST_CASES.length}`,
      'Avg Time': `${r.avgTime}ms`,
      Failures: r.failures.length
  })));
  
  // Detailed failure analysis
  results.forEach(r => {
      if (r.failures.length > 0) {
          console.log(`\nFailures for ${r.model}:`);
          r.failures.forEach(f => {
              const outputPreview = f.output.length > 60 
                  ? `${f.output.substring(0, 60)}...` 
                  : f.output;
              console.log(`  - ${f.test}: ${f.reason} [Output: "${outputPreview}"]`);
          });
      }
  });
  
  // Summary statistics
  const totalTests = results.length * TEST_CASES.length;
  const totalPassed = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failures.length, 0);
  const avgTimeAll = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
  
  console.log(`\n📈 GLOBAL STATISTICS:`);
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log(`   Failed: ${totalFailed} (${Math.round(totalFailed/totalTests*100)}%)`);
  console.log(`   Average time: ${Math.round(avgTimeAll)}ms`);
  
  // Interpretation guide
  printInterpretationGuide(results);
}

/**
 * Print interpretation guide for benchmark results
 */
/**
 * Estimate model size category from name
 */
function getModelSizeCategory(model: string): { category: string; size: string } {
  if (model.includes(':1.5b') || model.includes(':3b') || model.includes(':4b')) {
    return { category: 'Small', size: '1.5B-4B' };
  }
  if (model.includes(':7b') || model.includes(':8b') || model.includes(':9b')) {
    return { category: 'Medium', size: '7B-9B' };
  }
  if (model.includes(':13b') || model.includes(':14b')) {
    return { category: 'Large', size: '13B-14B' };
  }
  return { category: 'Unknown', size: '?' };
}

function printInterpretationGuide(results: any[]) {
  console.log(`\n\n📖 INTERPRETATION GUIDE 📖`);
  console.log(`\n${'='.repeat(60)}`);
  
  // Categorize models by size
  const smallModels = results.filter(r => {
    const cat = getModelSizeCategory(r.model);
    return cat.category === 'Small';
  });
  
  const mediumModels = results.filter(r => {
    const cat = getModelSizeCategory(r.model);
    return cat.category === 'Medium';
  });
  
  const largeModels = results.filter(r => {
    const cat = getModelSizeCategory(r.model);
    return cat.category === 'Large';
  });
  
  // Rank models by score and speed
  const ranked = results
    .map(r => ({
      ...r,
      score: r.successCount / TEST_CASES.length,
      speedScore: 1000 / (r.avgTime || 1000), // Higher is better (inverse of time)
      ...getModelSizeCategory(r.model)
    }))
    .sort((a, b) => {
      // First by score, then by speed
      if (b.score !== a.score) return b.score - a.score;
      return b.speedScore - a.speedScore;
    });
  
  console.log(`\n🏆 OVERALL MODEL RANKING:`);
  ranked.forEach((r, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
    const scorePercent = Math.round(r.score * 100);
    const sizeInfo = r.category !== 'Unknown' ? ` [${r.size}]` : '';
    console.log(`   ${medal} ${r.model.padEnd(25)} - ${scorePercent}% success | ${r.avgTime}ms average${sizeInfo}`);
  });
  
  // Show best by category
  if (smallModels.length > 0) {
    const bestSmall = smallModels
      .map(r => ({ ...r, score: r.successCount / TEST_CASES.length }))
      .sort((a, b) => b.score - a.score || a.avgTime - b.avgTime)[0];
    console.log(`\n📦 BEST SMALL MODEL (1.5B-4B):`);
    console.log(`   ${bestSmall.model} - ${Math.round(bestSmall.successCount / TEST_CASES.length * 100)}% success | ${bestSmall.avgTime}ms`);
    console.log(`   → Ideal for: Fast development, limited resources, low latency`);
  }
  
  if (mediumModels.length > 0) {
    const bestMedium = mediumModels
      .map(r => ({ ...r, score: r.successCount / TEST_CASES.length }))
      .sort((a, b) => b.score - a.score || a.avgTime - b.avgTime)[0];
    console.log(`\n📦 BEST MEDIUM MODEL (7B-9B):`);
    console.log(`   ${bestMedium.model} - ${Math.round(bestMedium.successCount / TEST_CASES.length * 100)}% success | ${bestMedium.avgTime}ms`);
    console.log(`   → Ideal for: Production, quality/speed balance`);
  }
  
  if (largeModels.length > 0) {
    const bestLarge = largeModels
      .map(r => ({ ...r, score: r.successCount / TEST_CASES.length }))
      .sort((a, b) => b.score - a.score || a.avgTime - b.avgTime)[0];
    console.log(`\n📦 BEST LARGE MODEL (13B-14B):`);
    console.log(`   ${bestLarge.model} - ${Math.round(bestLarge.successCount / TEST_CASES.length * 100)}% success | ${bestLarge.avgTime}ms`);
    console.log(`   → Ideal for: Maximum quality, complex tasks`);
  }
  
  console.log(`\n📋 METRICS EXPLANATION:`);
  console.log(`   • Score: Percentage of tests that passed correctly`);
  console.log(`   • Avg Time: Average response time (lower is better)`);
  console.log(`   • Failures: Number of failed tests`);
  
  console.log(`\n💻 RESOURCE REQUIREMENTS (estimated):`);
  console.log(`   • Small models (1.5B-4B): ~4-6 GB RAM, fast`);
  console.log(`   • Medium models (7B-9B): ~8-12 GB RAM, quality/speed balance`);
  console.log(`   • Large models (13B-14B): ~16+ GB RAM, better quality`);
  
  console.log(`\n🔍 FAILURE TYPES:`);
  console.log(`   • "Chatty preamble": Model adds explanations instead of responding directly`);
  console.log(`     → Solution: Improve prompt or use post-processing`);
  console.log(`   • "Not JSON": Model did not generate valid JSON`);
  console.log(`     → Solution: Specify JSON format in prompt or use schema validation`);
  console.log(`   • "Incomplete JSON": Model started JSON but didn't complete it`);
  console.log(`     → Solution: Increase num_predict or improve prompt`);
  console.log(`   • "Invalid JSON": Malformed JSON`);
  console.log(`     → Solution: Use schema validation or post-processing`);
  
  // Recommendations
  console.log(`\n💡 FINAL RECOMMENDATIONS:`);
  
  const perfectModels = results.filter(r => r.successCount === TEST_CASES.length);
  if (perfectModels.length > 0) {
    const fastest = perfectModels.reduce((a, b) => a.avgTime < b.avgTime ? a : b);
    const smallPerfect = perfectModels.filter(r => getModelSizeCategory(r.model).category === 'Small');
    const fastestSmall = smallPerfect.length > 0 
      ? smallPerfect.reduce((a, b) => a.avgTime < b.avgTime ? a : b)
      : null;
    const mediumPerfect = perfectModels.filter(r => getModelSizeCategory(r.model).category === 'Medium');
    const fastestMedium = mediumPerfect.length > 0
      ? mediumPerfect.reduce((a, b) => a.avgTime < b.avgTime ? a : b)
      : null;
    
    console.log(`   ✅ Perfect models (${perfectModels.length}): ${perfectModels.map(m => m.model).join(', ')}`);
    
    if (fastestSmall) {
      console.log(`   🚀 For development/prototyping: ${fastestSmall.model} (${fastestSmall.avgTime}ms, small model)`);
    }
    if (fastestMedium) {
      console.log(`   🚀 For production: ${fastestMedium.model} (${fastestMedium.avgTime}ms, medium model)`);
    }
    if (!fastestSmall && !fastestMedium) {
      console.log(`   🚀 Recommended: ${fastest.model} (fastest with 100% success)`);
    }
  } else {
    const best = ranked[0];
    console.log(`   ⚠️  No model passed all tests`);
    console.log(`   🎯 Best overall option: ${best.model} (${Math.round(best.score * 100)}% success)`);
    
    // Show best by category even if not perfect
    if (smallModels.length > 0) {
      const bestSmall = smallModels
        .map(r => ({ ...r, score: r.successCount / TEST_CASES.length }))
        .sort((a, b) => b.score - a.score || a.avgTime - b.avgTime)[0];
      if (bestSmall.model !== best.model) {
        console.log(`   🎯 Best small: ${bestSmall.model} (${Math.round(bestSmall.successCount / TEST_CASES.length * 100)}% success)`);
      }
    }
  }
  
  const chattyModels = results.filter(r => 
    r.failures.some((f: any) => f.reason === 'Chatty preamble')
  );
  if (chattyModels.length > 0) {
    console.log(`   ⚠️  Models with chatty preambles: ${chattyModels.map(m => m.model).join(', ')}`);
    console.log(`      → Consider using extractValue() or improving prompts`);
  }
  
  const jsonFailures = results.filter(r =>
    r.failures.some((f: any) => f.reason?.includes('JSON'))
  );
  if (jsonFailures.length > 0) {
    console.log(`   ⚠️  Models with JSON issues: ${jsonFailures.map(m => m.model).join(', ')}`);
    console.log(`      → Consider using schema validation or post-processing`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
}

/**
 * Extract JSON from markdown code blocks or return cleaned text
 */
function extractJSON(text: string): string | null {
    const trimmed = text.trim();
    
    // Check if it's just a markdown code block opener without content
    if (trimmed === '```json' || trimmed === '```') {
        return null; // Incomplete markdown block
    }
    
    // Check if it starts with ```json but doesn't have closing ```
    if (trimmed.startsWith('```json') && trimmed.indexOf('```', 7) === -1) {
        return null; // Incomplete markdown block
    }
    
    // Try to extract from markdown code blocks
    const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1].trim()) {
        return jsonBlockMatch[1].trim();
    }
    
    // Try to find JSON object/array in the text (look for complete objects)
    const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
        const candidate = jsonMatch[1].trim();
        // Basic check: should have both opening and closing braces/brackets
        if ((candidate.startsWith('{') && candidate.includes('}')) ||
            (candidate.startsWith('[') && candidate.includes(']'))) {
            return candidate;
        }
    }
    
    // If it starts with { or [, return as-is (might be incomplete, but we'll validate later)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return trimmed;
    }
    
    return null;
}

/**
 * Check if text contains chatty preambles
 */
function hasChattyPreamble(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const chattyPatterns = [
        /^sure,?\s+/i,
        /^here'?s?\s+/i,
        /^here is\s+/i,
        /^the answer is\s+/i,
        /^result:?\s+/i,
        /^i can help you/i,
        /^i'll\s+/i,
        /^let me\s+/i,
        /^i would\s+/i,
        /^could you please/i,
        /^please provide/i,
    ];
    
    return chattyPatterns.some(pattern => pattern.test(lower));
}

/**
 * Clean and validate response based on expected type
 */
function isCleanResponse(text: string, type: string): { isClean: boolean, reason?: string, cleaned?: string } {
    let cleaned = text.trim();
    
    // Check for chatty preambles first
    if (hasChattyPreamble(cleaned)) {
        return { isClean: false, reason: 'Chatty preamble' };
    }
    
    // Type-specific validation
    if (type === 'number') {
        // Remove common prefixes/suffixes
        cleaned = cleaned.replace(/^(the number is|the price is|price:?|number:?)\s*/i, '');
        cleaned = cleaned.replace(/[^\d.-]/g, ''); // Keep only digits, dots, and minus
        
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
            return { isClean: false, reason: 'Not a number' };
        }
        if (cleaned.length > 10) {
            return { isClean: false, reason: 'Too long for number' };
        }
        return { isClean: true, cleaned: cleaned };
    }
    
    if (type === 'json') {
        // Try to extract JSON from markdown or text
        const jsonStr = extractJSON(cleaned);
        
        if (!jsonStr) {
            return { isClean: false, reason: 'Not JSON' };
        }
        
        // Try to parse JSON
        try {
            JSON.parse(jsonStr);
            return { isClean: true, cleaned: jsonStr };
        } catch (e) {
            // Check if it's incomplete JSON (starts with { but incomplete)
            if (jsonStr.startsWith('{') && !jsonStr.includes('}')) {
                return { isClean: false, reason: 'Incomplete JSON' };
            }
            return { isClean: false, reason: 'Invalid JSON' };
        }
    }
    
    // For other types, check for multiline (unless it's expected)
    if (cleaned.includes('\n') && type !== 'json' && type !== 'code_snippet') {
        // Take first line if multiline
        cleaned = cleaned.split('\n')[0].trim();
    }
    
    // Remove common wrapping quotes
    if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
        cleaned = cleaned.slice(1, -1);
    }
    
    // Remove trailing punctuation for non-code types
    if (type !== 'code_snippet') {
        cleaned = cleaned.replace(/[.!?]$/, '');
    }
    
    return { isClean: true, cleaned };
}

runBenchmark();
