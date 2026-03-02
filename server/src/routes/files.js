const express = require('express');
const path = require('path');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * GET /api/files/:courseId/list
 * Returns the distinct files uploaded to a course (one row per file).
 * Response: { files: [{ fileName, sourceType, weekNumber }] }
 */
router.get('/files/:courseId/list', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const db = getAuthClient(jwt);

  // Select one representative chunk per source_file to get the metadata
  const { data, error } = await db
    .from('chunks')
    .select('source_file, source_type, week_number')
    .eq('course_fk', courseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[files] list fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch file list' });
  }

  // Deduplicate by source_file — keep first occurrence
  const seen = new Set();
  const files = [];
  for (const row of (data || [])) {
    if (!seen.has(row.source_file)) {
      seen.add(row.source_file);
      files.push({
        fileName: row.source_file,
        sourceType: row.source_type,
        weekNumber: row.week_number,
      });
    }
  }

  return res.json({ files });
});

/**
 * GET /api/files/:courseId/chunks?sourceFile=<encoded>
 * Returns all stored chunks for a specific file in a course.
 * Used by the file viewer modal.
 * Response: { chunks: [{ id, content, week_number }] }
 */
router.get('/files/:courseId/chunks', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const { sourceFile } = req.query;

  if (!sourceFile) {
    return res.status(400).json({ error: 'sourceFile query parameter is required' });
  }

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('chunks')
    .select('id, content, week_number, source_type')
    .eq('course_fk', courseId)
    .eq('source_file', sourceFile)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[files] chunks fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch file chunks' });
  }

  return res.json({ chunks: data || [] });
});

/**
 * GET /api/files/:courseId/raw?sourceFile=<encoded>
 * Returns all chunks concatenated as continuous document text.
 * Used by the file viewer to render the document as readable prose.
 * Response: { text: string, sourceType: string, weekNumber: number|null, chunkCount: number }
 */
router.get('/files/:courseId/raw', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const { sourceFile } = req.query;

  if (!sourceFile) {
    return res.status(400).json({ error: 'sourceFile query parameter is required' });
  }

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('chunks')
    .select('content, week_number, source_type')
    .eq('course_fk', courseId)
    .eq('source_file', sourceFile)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[files] raw fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch file content' });
  }

  const chunks = data || [];
  const text = chunks.map((c) => c.content).join('\n\n');
  const sourceType = chunks[0]?.source_type ?? 'material';
  const weekNumber = chunks[0]?.week_number ?? null;

  return res.json({ text, sourceType, weekNumber, chunkCount: chunks.length });
});

/**
 * GET /api/files/:courseId/download?sourceFile=<encoded>
 * Returns a short-lived Supabase Storage signed URL for the original file.
 * Redirects the client (iframes follow redirects automatically).
 */
router.get('/files/:courseId/download', async (req, res) => {
  // iframes can't send Authorization headers, so also accept ?token= query param
  const jwt = extractJwt(req) || (req.query.token ? String(req.query.token) : null);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const { courseId } = req.params;
  const { sourceFile } = req.query;
  if (!sourceFile) return res.status(400).json({ error: 'sourceFile is required' });

  // Sanitize: strip any path components so callers can't traverse directories
  const safeName = path.basename(sourceFile);
  const storagePath = `${userId}/${courseId}/${safeName}`;

  const db = getAuthClient(jwt);
  const { data, error } = await db.storage
    .from('uploads')
    .createSignedUrl(storagePath, 60); // 60-second expiry

  if (error || !data?.signedUrl) {
    return res.status(404).json({ error: 'File not found. It may have been uploaded before file storage was enabled.' });
  }

  // Redirect — iframes and browser fetches both follow 302 redirects
  return res.redirect(data.signedUrl);
});

module.exports = router;
