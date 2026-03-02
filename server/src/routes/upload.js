const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { parseFile } = require('../lib/parser');
const { chunkText } = require('../lib/chunker');
const { embedChunks } = require('../lib/embeddings');
const { extractTopicsFromSyllabus } = require('../lib/topicExtractor');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

// Temp directory for multer to land files before processing
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
 *   - courseId — course UUID (from courses table)
 */
router.post('/upload', upload.array('files[]'), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const courseId = req.body.courseId;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

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

      // 4. Insert into Supabase — include user_id and course_fk for RLS + data isolation
      const rows = embeddedChunks.map(({ content, metadata, embedding }) => ({
        course_id: metadata.courseId,   // kept as text for the RPC filter
        course_fk: courseId,            // UUID FK to courses table
        user_id: userId,
        source_file: metadata.sourceFile,
        source_type: metadata.sourceType,
        week_number: metadata.weekNumber,
        content,
        embedding,
      }));

      const { error: insertError } = await db.from('chunks').insert(rows);
      if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

      // 5. Upload original file to Supabase Storage for the viewer
      const fileBuffer = fs.readFileSync(file.path);
      const storagePath = `${userId}/${courseId}/${fileName}`;
      const { error: storageError } = await db.storage
        .from('uploads')
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (storageError) {
        console.error(`[upload] storage upload failed: ${storageError.message}`);
        // non-fatal — chunks are still usable, just viewer won't work
      }

      console.log(`[upload] ingested "${fileName}" — ${rows.length} chunks, sourceType="${sourceType}", week=${weekNumber}`);
      ingested.push({ fileName, sourceType, chunkCount: rows.length });

      // If this is a syllabus, extract topics and store them
      if (sourceType === 'syllabus') {
        try {
          const topics = await extractTopicsFromSyllabus(text);
          if (topics.length > 0) {
            await db.from('course_topics').delete().eq('course_fk', courseId).eq('user_id', userId);
            const topicRows = topics.map((topic, i) => ({
              course_id: courseId,
              course_fk: courseId,
              user_id: userId,
              topic,
              position: i,
            }));
            const { error: topicError } = await db.from('course_topics').insert(topicRows);
            if (topicError) {
              console.error(`[upload] topic insert error: ${topicError.message}`);
            } else {
              console.log(`[upload] extracted ${topics.length} topics from syllabus "${fileName}"`);
              ingested[ingested.length - 1].topicsExtracted = topics.length;
            }
          }
        } catch (topicErr) {
          console.error(`[upload] topic extraction failed: ${topicErr.message}`);
        }
      }
    } catch (err) {
      errors.push({ fileName: file.originalname, error: err.message });
    } finally {
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
