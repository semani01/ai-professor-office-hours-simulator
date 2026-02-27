const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { parseFile } = require('../lib/parser');
const { chunkText } = require('../lib/chunker');
const { embedChunks } = require('../lib/embeddings');
const supabase = require('../db/supabase');

const router = express.Router();

// Store uploads in a temp directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    // Also allow by extension as fallback (browsers send inconsistent MIME types)
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.pdf', '.docx', '.pptx'];
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname}. Only PDF, DOCX, and PPTX are accepted.`));
    }
  },
});

/**
 * POST /api/upload
 * Accepts multipart/form-data with:
 *   - files[]  — one or more files
 *   - courseId — (optional) course identifier, defaults to 'default'
 */
router.post('/upload', upload.array('files[]'), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const courseId = req.body.courseId || 'default';
  const ingested = [];
  const errors = [];

  for (const file of files) {
    try {
      // 1. Parse
      const { text, fileName, sourceType, weekNumber } = await parseFile(
        file.path,
        file.mimetype,
        file.originalname
      );

      if (!text) {
        errors.push({ fileName: file.originalname, error: 'No text extracted from file.' });
        continue;
      }

      // 2. Chunk
      const chunks = chunkText(text, { courseId, sourceFile: fileName, sourceType, weekNumber });

      if (chunks.length === 0) {
        errors.push({ fileName: file.originalname, error: 'File produced no chunks.' });
        continue;
      }

      // 3. Embed
      const embeddedChunks = await embedChunks(chunks);

      // 4. Insert into Supabase
      const rows = embeddedChunks.map(({ content, metadata, embedding }) => ({
        course_id: metadata.courseId,
        source_file: metadata.sourceFile,
        source_type: metadata.sourceType,
        week_number: metadata.weekNumber,
        content,
        embedding,
      }));

      const { error: insertError } = await supabase.from('chunks').insert(rows);
      if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

      console.log(`[upload] ingested "${fileName}" — ${rows.length} chunks, sourceType="${sourceType}", week=${weekNumber}`);
      ingested.push({ fileName, sourceType, chunkCount: rows.length });
    } catch (err) {
      errors.push({ fileName: file.originalname, error: err.message });
    } finally {
      // Clean up temp file
      fs.unlink(file.path, () => {});
    }
  }

  return res.json({
    success: ingested.length > 0,
    ingested,
    ...(errors.length > 0 && { errors }),
  });
});

module.exports = router;
