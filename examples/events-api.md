# Events API - Real-Time Progress Tracking

## Overview

Gannicus CLI emits structured events in NDJSON format to stderr, allowing LLMs and automation tools to track progress, handle errors, and process records as they're generated.

## Event Types

### `start`
Emitted when generation begins.
```json
{
  "type": "start",
  "count": 100,
  "model": "phi3:mini",
  "format": "json",
  "timestamp": 1732381234567
}
```

### `schema_loaded`
Emitted after schema is loaded and validated.
```json
{
  "type": "schema_loaded",
  "fields": ["name", "email", "age"],
  "timestamp": 1732381234598
}
```

### `health_check`
Emitted after Ollama health check succeeds.
```json
{
  "type": "health_check",
  "status": "ok",
  "model": "phi3:mini",
  "timestamp": 1732381234612
}
```

### `progress`
Emitted periodically during generation.
```json
{
  "type": "progress",
  "current": 25,
  "total": 100,
  "percent": 25,
  "timestamp": 1732381235789
}
```

### `record` (with `--stream`)
Emitted for each generated record when streaming is enabled.
```json
{
  "type": "record",
  "index": 0,
  "data": {
    "name": "Sarah Chen",
    "email": "sarah.chen@example.com",
    "age": 29
  },
  "timestamp": 1732381235123
}
```

### `file_saved`
Emitted when output is saved to file.
```json
{
  "type": "file_saved",
  "path": "users.json",
  "records": 100,
  "timestamp": 1732381240567
}
```

### `complete`
Emitted when generation finishes successfully.
```json
{
  "type": "complete",
  "records": 100,
  "llmCalls": 100,
  "duration": 5432,
  "provider": "ollama",
  "model": "phi3:mini",
  "timestamp": 1732381240589
}
```

### `error`
Emitted when an error occurs.
```json
{
  "type": "error",
  "message": "Model 'phi3:mini' not found",
  "stage": "health_check",
  "timestamp": 1732381234623
}
```

## Usage Examples

### Basic Event Tracking

```bash
# Generate with events
gannicus generate --schema user --count 10 --events --quiet 2> events.log > data.json

# Process events in real-time
gannicus generate --schema user --count 100 --events --quiet 2>&1 >/dev/null | \
  while read line; do
    echo "Event: $line" | jq '.type'
  done
```

### Streaming Records

```bash
# Process records as they're generated
gannicus generate --schema user --count 100 --events --stream --quiet 2> events.log | \
  while read record; do
    echo "$record" | jq '.name'
    # Insert into database, process, etc.
  done
```

### Progress Monitoring for LLMs

```typescript
// TypeScript example: LLM monitoring progress
import { spawn } from 'bun';

const proc = spawn([
  'gannicus',
  'generate',
  '--schema', 'user',
  '--count', '1000',
  '--events',
  '--quiet'
]);

// Parse events from stderr
for await (const line of proc.stderr) {
  const event = JSON.parse(line.toString());

  switch (event.type) {
    case 'start':
      console.log(`Starting generation of ${event.count} records`);
      break;

    case 'progress':
      console.log(`Progress: ${event.percent}% (${event.current}/${event.total})`);
      break;

    case 'record':
      // Process record immediately
      await processRecord(event.data);
      break;

    case 'complete':
      console.log(`Done! ${event.records} records in ${event.duration}ms`);
      break;

    case 'error':
      console.error(`Error at ${event.stage}: ${event.message}`);
      break;
  }
}

// Get final data from stdout
const data = await proc.stdout.json();
```

### Parallel Processing

```bash
# Generate and process in parallel
gannicus generate --schema product --count 1000 --events --stream --quiet 2> events.log | \
  xargs -P 10 -I {} bash -c 'process_record "{}"'
```

### Real-Time Dashboard

```typescript
// Build real-time dashboard from events
const stats = {
  current: 0,
  total: 0,
  records: [],
  llmCalls: 0,
  errors: []
};

for await (const event of eventStream) {
  switch (event.type) {
    case 'start':
      stats.total = event.count;
      updateDashboard(stats);
      break;

    case 'progress':
      stats.current = event.current;
      updateDashboard(stats);
      break;

    case 'record':
      stats.records.push(event.data);
      updateDashboard(stats);
      break;

    case 'complete':
      stats.llmCalls = event.llmCalls;
      console.log('Generation complete!');
      break;

    case 'error':
      stats.errors.push(event);
      handleError(event);
      break;
  }
}
```

## CLI Flags for Events

```bash
# Enable events
--events, -e          # Emit NDJSON events to stderr

# Enable streaming
--stream             # Stream records as they're generated

# Combine with other flags
--quiet, -q          # Suppress non-event output
--output, -o         # Save to file (doesn't affect streaming)
--format, -f         # Output format (json, ndjson, csv)
```

## Event Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                 Start Generation                │
│  Event: start {count, model, format}            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Load & Validate Schema              │
│  Event: schema_loaded {fields}                  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│               Check Ollama Health                │
│  Event: health_check {status, model}            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│          Generate Records (Async Loop)           │
│                                                  │
│  For each record:                                │
│    - Call LLM (parallel when possible)           │
│    - Event: progress {current, total, percent}   │
│    - Event: record {index, data} [if --stream]   │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│               Save Output (Optional)              │
│  Event: file_saved {path, records}              │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                  Complete                        │
│  Event: complete {records, llmCalls, duration}   │
└─────────────────────────────────────────────────┘

         [Error can occur at any stage]
                      │
                      ▼
         Event: error {message, stage}
```

## Benefits for LLMs

1. **Real-time awareness**: Know exactly what's happening, when
2. **Async processing**: Handle records as they arrive, don't wait for completion
3. **Error handling**: Catch and handle errors gracefully
4. **Progress tracking**: Show users accurate progress
5. **Parallel workflows**: Start processing while generation continues
6. **Cancellation**: Can cancel generation if needed based on events

## Example: LLM Using Gannicus

```typescript
// LLM needs 1000 users for testing
async function generateTestUsers() {
  console.log('LLM: I need test users. Using Gannicus...');

  const proc = spawn([
    'gannicus',
    'generate',
    '--schema', 'user',
    '--count', '1000',
    '--events',
    '--stream',
    '--quiet'
  ]);

  let processedCount = 0;

  // Monitor events
  for await (const line of proc.stderr) {
    const event = JSON.parse(line.toString());

    if (event.type === 'record') {
      // Process record immediately (insert to DB, validate, etc.)
      await db.users.insert(event.data);
      processedCount++;

      if (processedCount % 100 === 0) {
        console.log(`LLM: Processed ${processedCount}/1000 users`);
      }
    }

    if (event.type === 'error') {
      console.error(`LLM: Generation failed: ${event.message}`);
      return;
    }
  }

  console.log('LLM: All 1000 users generated and inserted!');
}
```

## Performance Considerations

- **Events add minimal overhead** (~1-2% performance impact)
- **Streaming enables parallel processing** - start using data before generation completes
- **NDJSON is efficient** - single line per event, easy to parse
- **Stderr separation** - events don't contaminate data output

---

**This event system makes Gannicus a true "LLM-empowerable" tool - not just a CLI, but a real-time data generation service.**
