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
- Phase 5a — Polish & dark mode toggle

---

### 2026-02-27 — Phase 5a: Polish & Dark Mode

**Built:**
- `ThemeContext.jsx` — 25+ color token system (dark + light themes); `isDark` flag; `localStorage` persistence; CSS variables on `:root`
- Dark/light toggle (☀️/🌙) in header; all components updated to use `theme.*` tokens
- Auth crash fix: `useAuth()` called only in `App.jsx`, props threaded down to avoid race condition on email confirmation redirect
- Upload race condition fix: `forCourseId` guard prevents stale callbacks from prior courses
- PDF viewer tip strip, DOCX paragraph rendering improvements, CourseTabs loading spinner, FileUpload input reset after upload
- Source citation deduplication by `sourceFile + weekNumber`
- Failed message retry UI in ChatPanel

**Decisions:**
- Theme passed via React context (not CSS-only) — gives components access to computed colors for inline styles and conditional logic
- Tier colors (`green`, `yellow`, `red`) embedded as nested objects on theme object for WeakSpotDashboard compatibility

**Problems:**
- `useAuth()` called in both `App.jsx` and `AuthGate.jsx` caused a blank screen on email confirmation redirects — fixed by passing session/loading as props

**Next:**
- Phase 6 — Gamification + Knowledge Portfolio + UI Redesign

---

### 2026-02-27 — Phase 6: Gamification, Knowledge Portfolio & UI Redesign

**Built:**
- **Socratic fix**: Rewrote SYSTEM_PROMPT rules 2 + 5 in `claude.js` with explicit ❌/✅ examples. AI now points to WHERE to find information instead of quoting it verbatim — addresses core product differentiation from NotebookLM
- **`server/src/routes/xp.js`**: GET /api/xp (totalXp, level, xpToNextLevel, currentStreak, studyDates); `awardXp()` with streak multiplier (1x/1.5x/2x for 1/2/3+ consecutive days); upsert into `user_xp`
- **`server/src/routes/quiz.js`**: POST /api/quiz/generate — `getDiverseChunks()` samples 2 chunks per week for variety; Claude generates 4 MCQs testing understanding not memorization. POST /api/quiz/check — scores + awards XP
- **`server/src/routes/achievements.js`**: 10 badge types (hot_streak, sharpshooter, bookworm, deep_thinker, course_champion, speed_learner, night_owl, early_bird, first_question, quiz_taker); server-side evaluation from chat + quiz routes
- **`chat.js`**: fire-and-forget XP award + achievement check after every message
- **`KnowledgePortfolio.jsx`**: replaces WeakSpotDashboard; SVG ProgressRing per tier; clickable filter buttons; StreakCalendar embedded at bottom
- **`StreakCalendar.jsx`**: 5-week GitHub-style contribution grid; color intensity by question count
- **`XpBar.jsx`**: compact header widget — Level badge + 64px progress bar + streak flame
- **`Achievements.jsx`**: AchievementsButton with trophy icon; full modal badge grid (locked=grayscale+dim, unlocked=colored glow + date)
- **`QuizMode.jsx`**: full-screen overlay; loading → question → reveal (color feedback + explanation) → results; 30s countdown timer per question
- **`App.jsx`**: 3-column layout (Sources 240px | Chat flex | Portfolio 260px); header redesigned with Quiz Me button + XpBar + Achievements trophy; XP re-fetched on quiz close and after messages

**Decisions:**
- XP awarded server-side (not client-side) to prevent client cheating
- Quiz chunks spread across weeks via `getDiverseChunks()` grouping logic — avoids all questions from same lecture
- AchievementsButton manages its own open/close state internally — simpler than lifting state to App.jsx
- 3-column layout uses `flex: 1` for chat center with `minWidth: 0` to prevent overflow blowout

**Problems:**
- `AchievementsButton` signature mismatch: initially passed `isOpen/onToggle/onClose` from App.jsx but component manages its own state — corrected to just pass `token`
- Supabase `user_xp` and `user_achievements` tables must be created manually before Phase 6 features work (SQL in plan file)

**Next:**
- Phase 6b — Topic Rooms, flashcards, mind map, caching fixes

---

### 2026-03-01 — Phase 6b: Topic Rooms, Flashcards, Mind Map & Performance

**Built:**
- **`server/src/routes/topicRoom.js`**: two new endpoints — `GET /api/topic-room/:courseId?tag=&tier=` generates concepts, practice questions, coaching tips, and a mind map via Claude haiku; `GET /api/topic-room/:courseId/flashcards?tag=&tier=&count=` generates flashcards on-demand separately (3000 max_tokens). Both share a `getContextBlock()` helper that retrieves 6 chunks via `retrieveChunks`. Mind map prompt instructs Claude to return short keyword labels (≤4 words) in a hierarchical JSON array. Main endpoint bumped to 2048 max_tokens to accommodate all content without truncation.
- **`TopicRoom.jsx`** (full rewrite): tab UI — Overview, Flashcards, Mind Map. Header shows tier badge + self-assessment buttons (↑/↓ tier). Overview shows Key Concepts, Practice Questions, Coaching Tips, and a scoped chat input for follow-up questions on this topic. `loadContent()` clears `content` to `null` before each fetch so the shimmer skeleton always shows on topic switches.
- **Flashcards tab**: empty state with "✨ Generate Flashcards" button; on-demand fetch; 3D CSS flip animation (`flip-card`/`flip-inner`/`flip-face` classes); card progress dots; prev/next navigation; custom card creation with `localStorage` persistence keyed by `${courseId}_${topicTag}`; custom cards display ✏️ Custom badge; regenerate button.
- **Mind Map tab**: left-to-right collapsible SVG tree with cubic bezier curves; layout math computes branch Y positions by counting visible children; branch nodes toggle collapse/expand on click with `+`/`−` indicator; tree expand CSS animation on sub-nodes. Empty state shows "↺ Reload Topic" button. SVG rendered with explicit `width`/`height` (not `width: 100%`) inside an `overflow: auto` wrapper for free-scroll.
- **`KnowledgePortfolio.jsx`**: `getTier(topic, overrides)` now checks `overrides[topic.tag]` first; `TopicPill` and bucket counts (Mastered/In Progress/Revisit) respond to manual tier overrides. `tierOverrides` prop accepted.
- **`App.jsx`**: `manualTiers` state initialized from `localStorage`; `handleTierChange()` updates state + localStorage + `activeTopic.manualTier`; `tierOverridesForCourse` slices the flat map to just `{ [tag]: tier }` for the active course; passed to `KnowledgePortfolio` and `TopicRoom`. `flashcardCacheRef` and `topicContentCacheRef` refs added.
- **Achievement pipeline fix** (`quiz.js`): `/quiz/check` now `await`s `checkAchievements` before sending response and includes `newBadges` in the JSON body. `QuizMode.jsx` sends `fastAnswer` bool and calls `onNewBadges`.
- **Caching** (`TopicRoom.jsx`): `contentCache` ref (keyed by `courseId_tag_tier`) used by `loadContent()` — cache hit skips the Claude fetch entirely, serving content synchronously. `useState` initializes `content` and `loadingContent` from cache on mount so re-opens are instant with no shimmer. `flashcardCache` ref (keyed by `courseId_tag`) stores generated AI cards; `aiCards` state initialized from cache on mount and restored on topic switch via `useEffect`.

**Decisions:**
- Flashcard generation separated from main topic-room fetch — avoids token budget pressure on the main endpoint and allows independent regeneration
- `contentCache` key includes tier (`courseId_tag_tier`) so tier promotions always fetch fresh content tailored to the new level; same-tier revisits are instant
- `flashcardCacheRef` and `topicContentCacheRef` are plain `useRef` objects (not `useState`) in `App.jsx` — cache writes don't trigger re-renders; state in `TopicRoom` drives UI updates
- `aiCards` lifted to `TopicRoom` state (not `FlashcardsTab` local state) so it survives tab switches without needing to re-fetch; further lifted to App-level ref cache so it survives back-navigation and topic switches
- Mind map uses `foreignObject` for text inside SVG rects — allows proper text truncation with CSS `textOverflow: ellipsis` and `whiteSpace: nowrap` that native SVG `<text>` can't do
- `cursor: 'grab'` on the mind map scroll container signals it's pannable

**Problems:**
- **Flashcard empty on tab return**: `aiCards` was local state in `FlashcardsTab` — unmounts on tab switch, resets to `null`. Fixed by lifting to `TopicRoom` state and passing as prop.
- **Flashcard lost on back-navigation**: `TopicRoom` unmounts when user clicks Back; local state is lost. Fixed by adding `flashcardCacheRef` in `App.jsx`; `TopicRoom` initializes from cache on mount via `useState(() => cache[key] ?? null)` and writes to cache via `setAiCards()` wrapper.
- **Content re-fetching on every re-open**: same unmount/remount issue for topic overview + mind map. Fixed by `topicContentCacheRef` in `App.jsx`; `loadContent()` returns immediately on cache hit; `useState` lazy initializer reads from cache so first render is already populated.
- **Mind map clipping**: SVG was using `width: '100%'` inside a parent with `padding: '16px 20px'` and `overflowY: auto` — the SVG tried to fit the padded width, leaving the right side cut off. Fixed by explicit `width={SVG_W}` / `height={SVG_H}` on the SVG and a dedicated `overflow: auto` wrapper with `padding: 0` on the mindmap tab.
- **Server route ordering concern**: `GET /topic-room/:courseId/flashcards` registered after `GET /topic-room/:courseId` — Express `:courseId` only matches one path segment so there is no routing conflict; the specific route wins regardless.

**Next:**
- Phase 7 — Deployment (Vercel for client, Railway/Render for server)

---

### 2026-03-01 — Phase 6c: Study Sessions, Quests & Gamification

**Built:**
- `server/src/routes/studySessions.js` — POST /api/study-sessions (AI plan), GET /api/study-sessions/active, POST /api/study-sessions/:id/end (AI summary), GET /api/study-sessions/latest-summary, POST /api/study-sessions/summaries/:id/dismiss
- `server/src/routes/quests.js` — CRUD for AI-generated quests linked to session summaries
- `server/src/routes/sideQuests.js` — CRUD for user-created to-do tasks
- `server/src/routes/conversations.js` — full conversation + message persistence; internal conversations (`__` prefix) protected from DELETE/PATCH (403); GET filters them from sidebar by default
- New Supabase tables: study_sessions, session_summaries, quests, side_quests, conversations, conversation_messages
- `StudySessionModal.jsx` — 4-step wizard: intent → topic checkboxes → time goal → AI study plan review
- `ActiveSessionBanner.jsx` — 40px banner: elapsed timer, break duration picker (opens downward), End Session button
- `SessionSummaryPanel.jsx` — AI summary overlay: demonstrated skills, gaps, priorities, blindspots; checkbox selection → "Add N Quests"
- `WelcomeBackPanel.jsx` — returning user modal with prior session summary and quest adoption
- `QuestPanel.jsx` — AI quest sidebar: colored left-border per status, status pills, type icons, Go→/Done buttons
- `SideQuestPanel.jsx` — user task list: 18px checkboxes, 13px text, delete on hover, API-backed
- `FocusTimer.jsx` — standalone header timer: 5 presets (5/15/25/45/60 min), pause/resume, full-screen completion modal with break chips
- `useQuests.js` — fetch, adopt, update status, delete, auto-completion based on user actions
- `useChat.js` — extended: lazy conversation auto-creation on first user message (onAutoConversation callback); isSystem flag prevents guided messages from creating conversations
- Resizable left/right panels — `makeDragHandler()`, localStorage persistence (maieutic_left_w, maieutic_right_w)
- Clickable Maieutic logo → clears activeTopic + activeConversationId (home)
- Topic room persistent chat — hidden `__topic__` conversations auto-created per topic; useChat wired with topicConvId
- Session-guided chat — handleSessionStarted creates `__session__` conversation, sends plan message via sendMessageRef after 200ms timeout
- KnowledgePortfolio poll interval reduced from 15s → 5s

**Decisions:**
- Hidden conversations use `__` prefix naming convention — filtered from sidebar, protected from deletion server-side (403)
- Lazy conversation creation in useChat avoids empty conversations for users who never type
- Break menu positioned with `top: calc(100% + 8px)` (not bottom) — banner is near top of page, no room above
- Portfolio version bump on session start and quest adoption ensures sidebar refreshes without sign-out/in

**Problems:**
- Quest icon 🛣️ repeatedly reverted to ⚔️ by linter — kept fixing manually
- StudySessionModal default export vs named import mismatch — fixed import in App.jsx
- Break menu rendering off-screen — fixed positioning from `bottom` to `top`
- Topic chat not persisting — root cause was users deleting `__topic__` conversations from sidebar (not visible but accessible via API); fixed with server-side 403 guard on DELETE/PATCH for `__` prefix titles

---

### 2026-03-01 — Pre-Deployment Hardening

**Built:**
- VITE_API_URL support: all 50 client fetch calls updated to prepend `(import.meta.env.VITE_API_URL ?? '')` — both string and template literal patterns
- `client/src/lib/api.js` — API_BASE helper documenting the pattern
- Explicit 401 guard added to all 8 handlers in `quests.js` and `sideQuests.js`
- CORS scoped to `process.env.FRONTEND_URL || '*'` in `server/src/index.js`
- multer patched (2 DoS CVEs fixed via `npm audit fix`)
- `openai` unused dependency removed
- `console.error` removed from App.jsx session end handler
- `.env.example` files updated with VITE_API_URL and FRONTEND_URL docs

**Decisions:**
- `(import.meta.env.VITE_API_URL ?? '') + '/api/...'` pattern chosen — minimizes file changes, no import needed, works identically in dev (empty string → Vite proxy) and production (Railway URL)
- CORS fallback to `'*'` means dev still works without FRONTEND_URL set

**Problems:**
- All 50 fetch calls required two script passes: first for string `fetch('/api...'` calls (18 occurrences), second for template literal `` fetch(`/api... `` calls (32 occurrences across 12 files) — bash couldn't handle backtick escaping so Node.js script approach used

---

### [Date] — Phase 7: Deployment

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
