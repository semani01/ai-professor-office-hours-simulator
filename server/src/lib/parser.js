const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Infer source type from filename keywords.
 * Returns one of: 'lecture' | 'notes' | 'assignment' | 'syllabus' | 'material'
 */
function inferSourceType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('lecture') || lower.includes('slides') || lower.includes('lec')) return 'lecture';
  if (lower.includes('notes') || lower.includes('note')) return 'notes';
  if (lower.includes('assignment') || lower.includes('hw') || lower.includes('homework')) return 'assignment';
  if (lower.includes('syllabus') || lower.includes('outline') || lower.includes('schedule')) return 'syllabus';
  return 'material';
}

/**
 * Infer week number from filename. e.g. Lecture_04 → 4, Week3 → 3.
 * Returns integer or null.
 */
function inferWeekNumber(fileName) {
  const match = fileName.match(/(?:week|lec(?:ture)?|module|unit|wk)[_\s-]*0*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Parse a file and return its raw text + metadata.
 * @param {string} filePath - absolute path to the temp file
 * @param {string} mimeType - MIME type string
 * @param {string} originalName - original filename from the upload
 * @returns {{ text: string, fileName: string, sourceType: string, weekNumber: number|null }}
 */
async function parseFile(filePath, mimeType, originalName) {
  const fileName = originalName || path.basename(filePath);
  const sourceType = inferSourceType(fileName);
  const weekNumber = inferWeekNumber(fileName);
  let text = '';

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    text = data.text;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.pptx')
  ) {
    // pptx files are zip archives — extract text from each slide's XML
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const slideTexts = [];

    entries.forEach((entry) => {
      // Slide XML files are at ppt/slides/slide*.xml
      if (entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)) {
        const xml = entry.getData().toString('utf8');
        // Extract text from <a:t> tags (DrawingML text runs)
        const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ');
        if (slideText.trim()) slideTexts.push(slideText.trim());
      }
    });

    text = slideTexts.join('\n\n');
  } else {
    throw new Error(`Unsupported file type: ${mimeType} (${fileName})`);
  }

  return { text: text.trim(), fileName, sourceType, weekNumber };
}

module.exports = { parseFile };
