/**
 * Phase 1 smoke test — ingest a local file and verify chunks land in Supabase.
 *
 * Usage:
 *   node test-ingest.js <path-to-file>
 *
 * Example:
 *   node test-ingest.js ./sample-lecture.pdf
 *
 * What it checks:
 *   1. File parses successfully (logs extracted char count)
 *   2. Chunker produces at least 1 chunk (logs count)
 *   3. Embedder produces 384-dim vectors (logs first chunk's embedding length)
 *   4. Supabase insert succeeds (logs inserted row count)
 *   5. Queries Supabase back and prints 1 sample chunk with its source metadata
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { parseFile } = require('./src/lib/parser');
const { chunkText } = require('./src/lib/chunker');
const { embedChunks } = require('./src/lib/embeddings');
const supabase = require('./src/db/supabase');

const TEST_COURSE_ID = 'test-course';

async function run() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node test-ingest.js <path-to-file>');
    console.error('Example: node test-ingest.js ./sample-lecture.pdf');
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const ext = path.extname(absPath).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  console.log('\n--- Phase 1 Ingestion Test ---');
  console.log(`File: ${absPath}`);

  // Step 1: Parse
  console.log('\n[1/4] Parsing...');
  const { text, fileName, sourceType, weekNumber } = await parseFile(absPath, mimeType, path.basename(absPath));
  console.log(`  fileName:   ${fileName}`);
  console.log(`  sourceType: ${sourceType}`);
  console.log(`  weekNumber: ${weekNumber}`);
  console.log(`  chars extracted: ${text.length}`);

  if (!text) {
    console.error('No text extracted. Exiting.');
    process.exit(1);
  }

  // Step 2: Chunk
  console.log('\n[2/4] Chunking...');
  const chunks = chunkText(text, {
    courseId: TEST_COURSE_ID,
    sourceFile: fileName,
    sourceType,
    weekNumber,
  });
  console.log(`  chunks produced: ${chunks.length}`);
  console.log(`  sample chunk (first 200 chars):\n  "${chunks[0].content.slice(0, 200)}..."`);

  // Step 3: Embed (this downloads the model on first run — may take a minute)
  console.log('\n[3/4] Embedding... (first run downloads ~50MB model, please wait)');
  const embedded = await embedChunks(chunks);
  console.log(`  embedding dims: ${embedded[0].embedding.length}`);
  console.log(`  expected: 384`);
  if (embedded[0].embedding.length !== 384) {
    console.error('Embedding dimension mismatch!');
    process.exit(1);
  }

  // Step 4: Insert into Supabase
  console.log('\n[4/4] Inserting into Supabase...');
  const rows = embedded.map(({ content, metadata, embedding }) => ({
    course_id: metadata.courseId,
    source_file: metadata.sourceFile,
    source_type: metadata.sourceType,
    week_number: metadata.weekNumber,
    content,
    embedding,
  }));

  const { error: insertError } = await supabase.from('chunks').insert(rows);
  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }
  console.log(`  inserted: ${rows.length} rows`);

  // Verify: query back a sample row
  const { data, error: queryError } = await supabase
    .from('chunks')
    .select('id, source_file, source_type, week_number, content')
    .eq('course_id', TEST_COURSE_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  if (queryError) {
    console.error('Query failed:', queryError.message);
    process.exit(1);
  }

  console.log('\n--- Supabase sample row ---');
  console.log(JSON.stringify(data[0], null, 2));

  console.log('\n✅ Phase 1 ingestion pipeline working correctly.\n');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
