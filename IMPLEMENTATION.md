# Implementation Log — AI Professor Office Hours Simulator

This is a running log of what was built in each session, decisions made, and problems encountered. Updated at the end of every build session. This log serves as raw material for the 500-word submission write-up in Phase 7.

---

## How to Use This Log

After each build session, add an entry with:
- Date and phase
- What was built or changed
- Any non-obvious decisions made and why
- Problems encountered and how they were resolved
- What's next

Keep entries concise. This is a development journal, not documentation.

---

## Log Entries

---

### 2026-02-25 — Phase 0: Project Setup

**Built:**
- Fresh git repo scoped to `Maieutic/` folder (removed erroneous Documents-level `.git`)
- GitHub repo created: `semani01/ai-professor-office-hours-simulator` (public), `main` as default branch
- Express server: `server/src/index.js` with `/health` endpoint, CORS, JSON middleware, port 3001
- Supabase client: `server/src/db/supabase.js` using `@supabase/supabase-js`
- React + Vite client scaffolded; Tailwind CSS v4 installed via `@tailwindcss/vite` plugin
- Vite proxy configured: `/api` → `http://localhost:3001`
- `App.jsx` cleaned to minimal scaffold, Vite default boilerplate removed

**Decisions:**
- CommonJS (`require`) used throughout server — avoids ESM compatibility issues with `pdf-parse` and `mammoth`
- Tailwind CSS v4 (not v3): uses `@import "tailwindcss"` in CSS and the Vite plugin instead of `tailwind.config.js`
- `nodemon` added as dev dependency for auto-reload during development
- Project renamed from "Maieutic" / "Socratic Tutor" to "AI Professor Office Hours Simulator" across all docs
- Model updated to `claude-haiku-4-5-20251001` in all references

**Problems:**
- Documents-level `.git` existed from a prior project; had to remove it and re-init inside `Maieutic/` only
- Initial commit included co-author tag — reset with `git update-ref -d HEAD` and recommitted cleanly

**Next:**
- ~~Supabase project creation (manual — requires dashboard): enable pgvector, run schema SQL from ARCHITECTURE.md~~ ✅
- ~~Create `server/.env` with API keys~~ ✅
- ~~Verify Supabase connection from server~~ ✅ — both `chunks` and `interactions` tables reachable
- ~~Cut `feat/phase-1-ingestion` branch and begin ingestion pipeline~~ ✅

---

### 2026-02-26 — Phase 1: File Ingestion Pipeline

**Built:**
- `server/src/lib/parser.js` — `parseFile()` extracts raw text from PDF (pdf-parse), DOCX (mammoth), PPTX (adm-zip + DrawingML XML parsing); infers `sourceType` from filename keywords; infers `weekNumber` via regex
- `server/src/lib/chunker.js` — `chunkText()` splits on paragraph boundaries into ~500-token (~2000 char) segments with 200-char overlap; hard-splits oversized single paragraphs
- `server/src/lib/embeddings.js` — `embedChunks()` lazy-loads `all-MiniLM-L6-v2` via `@xenova/transformers`; mean-pools + normalizes to 384-dim float vectors; model cached after first download (~50MB)
- `server/src/routes/upload.js` — `POST /api/upload` wires full pipeline: multer → parse → chunk → embed → Supabase bulk insert → temp file cleanup; returns `{ success, ingested[], errors[] }`
- `server/test-ingest.js` — CLI smoke test; verified against real SWPMS lecture PDF: 8 chunks, 384-dim embeddings, all rows in Supabase

**Decisions:**
- Local embeddings via `@xenova/transformers` (zero cost, no API key) — model downloaded once and cached
- PPTX parsed by reading the zip archive directly with `adm-zip` and extracting `<a:t>` DrawingML text nodes — avoids a heavy PPTX-specific dependency
- `pdf-parse` pinned to `1.1.1` — newer versions export a class instead of a function and flood stderr with minified source on load
- `adm-zip` added as dependency for PPTX support

**Problems:**
- `pdf-parse` latest version breaking change: exports `{ PDFParse }` class, not a callable function; downgraded to `1.1.1` which is the stable well-known API

**Next:**
- ~~Commit and push Phase 1~~ ✅
- Cut `feat/phase-2-retrieval-claude`, create `match_chunks` Supabase RPC, build retrieval + Claude response generation

---

### 2026-02-26 — Phase 2: Retrieval & Claude Integration

**Built:**
- `match_chunks` Supabase RPC — cosine similarity search on `chunks` table filtered by `course_id`, returns top K rows with similarity score; uses `embedding <=>` pgvector operator
- `server/src/lib/retrieval.js` — `retrieveChunks()` embeds the question via `embeddings.js` and calls the RPC; returns top 5 chunks with metadata
- `server/src/lib/claude.js` — `generateResponse()` builds formatted context block from chunks, constructs messages array (context injection + last 10 history + current message), calls `claude-haiku-4-5-20251001`, logs interaction to `interactions` table (fire-and-forget), returns `{ response, sources[] }`
- `server/src/routes/chat.js` — `POST /api/chat` wires retrieveChunks → generateResponse; handles missing message/sessionId and API error cases
- Registered chat route in `server/src/index.js`

**Decisions:**
- System prompt copied verbatim from `PROMPTS.md` — all 7 constraints intact
- Context injected as a synthetic first user/assistant exchange so Claude "sees" materials before history — avoids prompt injection from history and keeps context separate
- Topic tagging done via keyword matching (not a Claude mini-call) — zero latency, zero cost; good enough for the demo's SPM domain
- Interaction logging is fire-and-forget (`.then()`) so it never blocks the chat response

**Problems:**
- None — pipeline worked on first test

**Next:**
- ~~Commit and push Phase 2~~ ✅
- Cut `feat/phase-3-frontend`, build FileUpload, ChatPanel, SourceCitation, useUpload, useChat

---

### [Date] — Phase 3: Frontend Core

**Built:**
- 

**Decisions:**
- 

**Problems:**
- 

**Next:**
- 

---

### [Date] — Phase 4: Session Tracking & Weak Spot Dashboard

**Built:**
- 

**Decisions:**
- 

**Problems:**
- 

**Next:**
- 

---

### [Date] — Phase 5: Polish & Edge Cases

**Built:**
- 

**Decisions:**
- 

**Problems:**
- 

**Next:**
- 

---

### [Date] — Phase 6: Deployment

**Built:**
- 

**Decisions:**
- 

**Problems:**
- 

**Live URL:**
- 

---

## System Prompt Tuning Log

| Date | Issue Observed | Change Made | Result |
|---|---|---|---|
| | | | |
