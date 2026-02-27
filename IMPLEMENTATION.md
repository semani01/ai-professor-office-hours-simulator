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

### 2026-02-26 — Phase 3: Frontend Core

**Built:**
- `client/src/hooks/useUpload.js` — `uploadFiles()` POSTs to `/api/upload`, manages `files`, `uploading`, `error` state
- `client/src/hooks/useChat.js` — `sendMessage()` POSTs to `/api/chat`, manages `messages`, `loading`, stable `sessionId` via `useRef`; history capped to last 10 messages
- `client/src/components/FileUpload.jsx` — drag-and-drop zone, file type + size validation, spinner during upload, ingested file list with color-coded sourceType badges and week labels
- `client/src/components/SourceCitation.jsx` — deduped source chips ("Week 1 · Lecture"), click to expand excerpt tooltip
- `client/src/components/ChatPanel.jsx` — full chat thread with user/assistant bubbles, typing indicator, auto-scroll, active materials bar, integrated textarea + send button
- `client/src/App.jsx` — composes FileUpload + ChatPanel, manages shared `courseId` and `uploadedFiles` state
- `react-markdown` added for proper markdown rendering in AI responses (bold, blockquotes, lists)
- Full dark theme UI pass — consistent `#0f1117`/`#111827` color system, indigo accent, gradient avatars

**Decisions:**
- Inline styles used instead of Tailwind classes for component-level dark theme — avoids Tailwind v4 JIT purge issues with dynamic class names
- `react-markdown` chosen over manual parsing — handles all Claude output formatting reliably
- Source citations deduplicated by `sourceFile` before rendering — prevents showing the same file 5 times when all 5 retrieved chunks are from one document
- `sessionId` generated in `useRef` (not `useState`) so it's stable across re-renders without triggering effects

**Problems:**
- Initial UI had raw markdown rendering (`**bold**` as literal text) — fixed by adding `react-markdown`
- Tailwind dark mode classes inconsistent with browser's system dark theme — switched to explicit inline styles for all color values

**Next:**
- ~~Commit and push Phase 3~~ ✅
- Cut `feat/phase-4-dashboard`, add hints tracking, session summary endpoint, WeakSpotDashboard component

---

### 2026-02-26 — Phase 4: Session Tracking & Weak Spot Dashboard

**Built:**
- `server/src/lib/claude.js` updated — `inferTopicTag()` keyword-matches question against SPM domain terms (scheduling, risk, stakeholders, agile, etc.); `isResolved()` heuristic detects student acknowledgement phrases; `countPriorExchanges()` queries `interactions` table to determine `hints_needed` for the current exchange; history messages stripped to `{ role, content }` before sending to Claude API
- `server/src/routes/session.js` — `GET /api/session/:sessionId/summary` aggregates `interactions` rows by `topic_tag`, computing max `hints_needed`, total exchanges, and resolved status per topic; returns `{ topics[] }`
- Registered session route in `server/src/index.js`
- `client/src/components/WeakSpotDashboard.jsx` — topic cards color-coded green (resolved, ≤1 hint) / yellow (2–3 hints) / red (≥4 hints or unresolved with ≥2 exchanges); "Demonstrated" and "To Revisit" summary lists; "When to stop studying is your decision." footer; polls session summary every 30s and after each chat response
- `client/src/components/ChatPanel.jsx` updated — added `onSessionId` prop, bubbles `sessionId` up to App via `useEffect` on mount
- `client/src/App.jsx` updated — `sessionId` state added; `WeakSpotDashboard` rendered in sidebar below uploaded files list; `onSessionId` wired to `ChatPanel`
- `server/src/lib/retrieval.js` updated — switched from `match_chunks` to `match_chunks_text` RPC; serializes embedding as string `[x,y,z,...]` for Postgres text cast
- Supabase: dropped IVFFlat index, created HNSW index; created `match_chunks_text` function (accepts `text`, casts to `vector(384)` internally, `SECURITY DEFINER`, `SET LOCAL hnsw.ef_search = 100`)

**Decisions:**
- `isResolved()` uses keyword matching (no Claude mini-call) — zero latency, zero cost; the demo's SPM sessions produce clear resolution phrases
- `hints_needed` stored on each interaction row as a point-in-time count of prior exchanges, not as a mutable running counter — simpler schema, correct aggregation in summary endpoint
- Session summary aggregation done server-side in the route (not in SQL GROUP BY) — easier to reason about max/resolved logic in JS with the small row counts expected
- `WeakSpotDashboard` polls every 30s rather than WebSocket — adequate for a single-user demo, much simpler implementation
- HNSW index chosen over IVFFlat: IVFFlat requires training on existing data at creation time; an empty-table IVFFlat produces broken clusters (all identical similarities ~0.44). HNSW builds incrementally and works correctly on small datasets

**Problems:**
- **Claude API 400: `messages.3.sources: Extra inputs are not permitted`** — assistant messages stored in frontend state carried a `sources` field (UI metadata). Sending history directly to Claude API caused validation failure. Fix: `.map(({ role, content }) => ({ role, content }))` before building the messages array.
- **Retrieval returning 0 chunks** — root cause was multi-layered:
  1. IVFFlat index was built on an empty `chunks` table, so all similarity scores were identical (~0.443) and some queries returned 0 results
  2. Supabase JS client serializes a JS number array as JSON when passed to an RPC `vector` parameter — Postgres cannot cast this to `vector`, silently returns no rows
  - Fix: (1) dropped IVFFlat, created HNSW; (2) switched RPC to accept `text`, cast `::vector(384)` inside SQL; (3) added `SECURITY DEFINER` and `SET LOCAL hnsw.ef_search = 100` to prevent result pruning
- Debugging required: adding logging at each layer (chat route, retrieval lib, direct table query, raw RPC result) to isolate which layer was failing

**Next:**
- ~~Commit and push Phase 4~~ ✅
- ~~Dynamic topic extraction from syllabus~~ ✅ (see addendum below)
- Cut `feat/phase-5-features`, build auth + multi-course + file viewer

---

### 2026-02-26 — Phase 4 Addendum: Dynamic Topic Extraction & Dashboard Polish

**Built:**
- `server/src/lib/topicExtractor.js` — `extractTopicsFromSyllabus()` sends syllabus text to Claude haiku, parses JSON array of topic names (up to 25), robust fallback for imperfect JSON output
- `server/src/routes/topics.js` — `GET /api/topics/:courseId` returns stored topics; consumed by frontend to decide whether to show syllabus nudge
- `server/src/routes/upload.js` — when `sourceType === 'syllabus'`, extract topics and store in `course_topics` table (non-fatal: topic extraction failure never blocks ingestion)
- `server/src/lib/claude.js` — `inferTopicTag()` redesigned as async; queries `course_topics` table for the courseId, scores each topic by word-overlap against the question, returns best match or 'General'
- `client/src/components/WeakSpotDashboard.jsx` — "Upload your syllabus" amber nudge shown when `course_topics` is empty; all previously invisible text colors replaced; meta text uses tier accent color; font sizes bumped to 12–13px
- `client/src/App.jsx` — passes `courseId` prop to `WeakSpotDashboard`

**Decisions:**
- Word-overlap scoring (not embeddings, not another Claude call) for topic matching — zero latency, zero cost, accurate enough for course syllabus vocabulary
- `course_topics.position` column preserves syllabus order for deterministic tie-breaking
- Syllabus nudge checks `GET /api/topics/:courseId` on mount — tells user exactly what action to take to unlock topic tracking

**Problems:**
- Syllabus nudge doesn't dismiss immediately after upload (topics re-fetch not triggered on upload completion) — fixed in `feat/phase-5-features` via `topicsVersion` counter prop

---

### 2026-02-26 — Phase 5: Auth, Multi-Course, File Viewer

**Built:**
- Full Supabase email/password auth — `useAuth.js` hook + `AuthGate.jsx` login/signup screen; session persisted automatically by Supabase SDK
- `supabaseWithAuth.js` server factory — `getAuthClient(jwt)` creates an RLS-scoped Supabase client from the user's JWT; `extractJwt()` and `getUserId()` helpers used in every route
- `courses` table with RLS + `GET/POST/DELETE /api/courses` routes; all existing tables (`chunks`, `interactions`, `course_topics`) extended with `user_id uuid` and `course_fk uuid` columns and RLS policies
- `match_chunks_text` RPC updated to accept `match_user_id uuid` parameter — eliminates cross-user chunk contamination
- Multi-course header tabs — `CourseTabs.jsx` with active indigo indicator, `×` per-tab delete, inline `+` input to create new course; auto-creates "My Course" for new users with no courses
- File viewer modal — `FileViewerModal.jsx` slides in from right (CSS `transform` transition); fetches parsed chunk text from `GET /api/files/:courseId/chunks?sourceFile=...`; closes on Escape, backdrop click, or × button
- File emoji icon fallback — `SOURCE_TYPE_ICONS` map by `sourceType` used when extension lookup fails
- Syllabus nudge dismiss fix — `topicsVersion` counter in `App.jsx` increments on syllabus upload; `WeakSpotDashboard` adds it to dependency array so nudge clears immediately after upload
- Chat and upload reset on course switch — `resetMessagesRef` pattern lets `App.jsx` call `useChat.resetMessages()` when `activeCourseId` changes

**Decisions:**
- JWT forwarded as `Authorization: Bearer` header on every client→server request; server never stores tokens
- `getAuthClient(jwt)` pattern (not middleware) keeps route logic explicit and makes RLS violations surface as empty results (not 401s)
- Course UUID used as `course_fk` everywhere — replaces the old hard-coded `course_id='default'` string, fixing stale cross-session chunk contamination
- `useRef` + callback pattern for chat reset (instead of key remounting) to avoid unmount flash

**Problems:**
- ESLint "declared but never used" warnings surfaced several prop/state wiring gaps in `FileUpload.jsx` (token, onFileClick, hoveredIdx) and `index.js` (route registrations) — caught and fixed before commit

**Next:**
- Phase 6 — Deployment (Vercel + Render)

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
