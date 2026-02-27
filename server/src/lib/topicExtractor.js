const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

/**
 * Use Claude to extract a clean list of course topics from syllabus text.
 * Returns an array of short topic name strings (e.g. ["Project Lifecycle", "Risk Management"]).
 *
 * @param {string} syllabusText - raw text extracted from the syllabus file
 * @returns {Promise<string[]>}
 */
async function extractTopicsFromSyllabus(syllabusText) {
  // Truncate to ~6000 chars — enough to capture a full syllabus outline without burning tokens
  const truncated = syllabusText.slice(0, 6000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'You are a concise academic assistant. Extract topic names from course syllabi.',
    messages: [
      {
        role: 'user',
        content: `Here is the text of a course syllabus. Extract the main topics or modules covered in this course.
Return ONLY a JSON array of short topic name strings (2–5 words each), ordered as they appear.
No explanations, no extra text — just the JSON array.

Example output: ["Project Lifecycle", "Scope Management", "Risk Management", "Agile Methods"]

Syllabus text:
${truncated}`,
      },
    ],
  });

  const raw = response.content[0].text.trim();

  // Parse the JSON array — be tolerant of minor formatting noise
  try {
    // Strip any markdown code fences if Claude wrapped the response
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const topics = JSON.parse(cleaned);
    if (Array.isArray(topics)) {
      return topics
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0 && t.length <= 60)
        .slice(0, 25); // cap at 25 topics
    }
  } catch {
    // Fall back to splitting on newlines / commas if JSON parse fails
    const lines = raw.split(/[\n,]+/).map((l) => l.replace(/^[-•*"\s]+|[",\s]+$/g, '').trim()).filter((l) => l.length > 2 && l.length <= 60);
    if (lines.length > 0) return lines.slice(0, 25);
  }

  return [];
}

module.exports = { extractTopicsFromSyllabus };
