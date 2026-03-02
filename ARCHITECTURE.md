# Architecture — Maieutic

---

## System Overview

Maieutic is a RAG-based (Retrieval-Augmented Generation) application with a pedagogical constraint layer on top. The retrieval infrastructure grounds all AI responses in the student's actual course materials. The constraint layer — enforced through Claude's system prompt — prevents the AI from simply returning answers, forcing it into Socratic interaction instead.

The system has three distinct phases of operation:

1. **Ingestion** — Student uploads course materials. Files are parsed, chunked, embedded, and stored in a vector database.
2. **Retrieval** — When the student asks a question, the question is embedded and a similarity search returns the most relevant chunks from the course materials.
3. **Generation** — The retrieved chunks, conversation history, and the student's question are passed to Claude with a strict Socratic system prompt. Claude responds with a guiding question or hint, never a direct answer.

---

## Full Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  INGESTION FLOW                                                  │
│                                                                  │
│  Student uploads file (PDF / PPTX / DOCX)                       │
│         ↓                                                        │
│  Express /upload endpoint receives multipart form data           │
│         ↓                                                        │
│  parser.js — extracts raw text based on file type               │
│    · pdf-parse for PDFs                                          │
│    · mammoth for DOCX                                            │
│    · pptx-parser for PowerPoint slides                           │
│         ↓                                                        │
│  chunker.js — splits text into ~500 token semantic segments     │
│    · preserves metadata: source file, type, week number         │
│         ↓                                                        │
│  embeddings.js — runs all-MiniLM-L6-v2 locally (Transformers.js)│
│    · returns 384-dimension vector per chunk                      │
│         ↓                                                        │
│  supabase.js — stores chunk text + vector + metadata            │
│    · table: chunks                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  QUERY FLOW                                                      │
│                                                                  │
│  Student sends message in chat UI                               │
│         ↓                                                        │
│  Express /chat endpoint receives { message, history, sessionId }│
│         ↓                                                        │
│  embeddings.js — embeds the user's question                     │
│         ↓                                                        │
│  retrieval.js — pgvector similarity search                      │
│    · returns top 5 chunks with source metadata                  │
│         ↓                                                        │
│  claude.js — constructs prompt:                                  │
│    · system prompt (Socratic tutor persona)                     │
│    · retrieved chunks as course context with source labels      │
│    · conversation history (last N messages)                     │
│    · user's current message                                     │
│         ↓                                                        │
│  Claude API call → response                                     │
│         ↓                                                        │
│  Response + source citations returned to frontend               │
│         ↓                                                        │
│  Interaction logged to Supabase interactions table              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WEAK SPOT TRACKING FLOW                                         │
│                                                                  │
│  Each chat interaction → logged to interactions table           │
│    · session_id, topic_tag, question, hints_needed, resolved    │
│         ↓                                                        │
│  WeakSpotDashboard queries interactions grouped by topic        │
│    · color-coded by resolution difficulty                       │
│    · green = resolved quickly, yellow = needed hints,           │
│      red = unresolved                                           │
│         ↓                                                        │
│  Session summary generated at end of study session             │
│    · what was demonstrated, what to revisit, no readiness score │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack — Decisions & Rationale

### Frontend: React + Vite
Plain React without Next.js framework complexity. Vite for fast local dev server. This is a client-side app that talks to an Express backend — there is no need for SSR, routing complexity, or Next.js conventions. Keep it simple.

### Styling: Tailwind CSS
Fastest path to a clean, polished UI without writing custom CSS files. Utility classes keep component styles co-located and easy to read. Use the standard Tailwind palette — no custom theme needed for the demo.

### Backend: Node.js + Express
Lightweight, familiar, no boilerplate overhead. The backend has exactly three jobs: receive file uploads, run the ingestion pipeline, and handle chat requests. Express is the right tool for this scope.

### AI Chat: Claude API — claude-haiku-4-5-20251001
Haiku is fast, cost-efficient, and follows complex system prompt instructions reliably. The Socratic constraint requires a model that can resist adversarial prompting ("just tell me the answer") while maintaining a coherent tutoring persona. Use the claude-haiku-4-5-20251001 model string.

### AI Embeddings: Transformers.js — all-MiniLM-L6-v2 (local)
Embeddings run locally in Node.js via `@xenova/transformers`. No OpenAI account or API key required. The `all-MiniLM-L6-v2` model produces 384-dimension vectors and is well-suited for semantic similarity tasks. The model (~50MB) is downloaded once on first run and cached locally. Zero ongoing cost.

### Vector Database: Supabase + pgvector
Supabase gives us a single platform for the vector store, the interactions log, and file metadata. The pgvector Postgres extension handles similarity search natively — no need to manage a separate vector DB service like Pinecone. The free tier is sufficient for the demo. Setup is fast and the dashboard is easy to inspect during development.

### File Parsing
- `pdf-parse` — handles lecture PDF files
- `mammoth` — handles DOCX notes, clean text extraction
- `pptx-parser` — handles PowerPoint slides, extracts text per slide

### Hosting
- **Vercel** — frontend. Connect GitHub repo, deploys automatically on push. Free tier is sufficient.
- **Railway** — backend. Simple Node.js deployment, environment variable management in dashboard, free tier sufficient for demo traffic.

---

## Supabase Schema

Run the following SQL in the Supabase SQL editor to initialize the database:

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Stores embedded document chunks from uploaded course materials
create table chunks (
  id           uuid primary key default gen_random_uuid(),
  course_id    text not null,
  source_file  text not null,
  source_type  text not null,      -- 'lecture' | 'notes' | 'syllabus' | 'assignment'
  week_number  int,                -- nullable; extracted from file name or content
  content      text not null,
  embedding    vector(384),         -- all-MiniLM-L6-v2 output dimension (local Transformers.js)
  created_at   timestamp default now()
);

-- Create an index for fast similarity search
create index on chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Stores per-session interaction logs for weak spot tracking
create table interactions (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null,
  topic_tag    text,               -- inferred topic (e.g. 'Risk Management', 'Agile')
  question     text not null,
  hints_needed int default 0,
  resolved     boolean default false,
  created_at   timestamp default now()
);
```

---

## API Endpoints

### POST /api/upload
Accepts multipart form data with one or more files. Runs the full ingestion pipeline per file. Returns a list of ingested files with chunk counts.

**Request:** `multipart/form-data` with `files[]` and optional `courseId` field.

**Response:**
```json
{
  "success": true,
  "ingested": [
    {
      "fileName": "Lecture_04_Scheduling.pdf",
      "sourceType": "lecture",
      "chunkCount": 24
    }
  ]
}
```

---

### POST /api/chat
Takes the user's message, conversation history, and session ID. Runs retrieval, calls Claude, returns response with source citations.

**Request:**
```json
{
  "message": "What is the critical path method?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "sessionId": "abc-123",
  "courseId": "spm-fall-2024"
}
```

**Response:**
```json
{
  "response": "Before we get to the full definition, let's build up to it. In your Week 5 lecture on scheduling, your professor introduced the concept of task dependencies. What do you think it means for one task to be 'dependent' on another?",
  "sources": [
    {
      "sourceFile": "Lecture_05_Scheduling.pdf",
      "sourceType": "lecture",
      "weekNumber": 5,
      "excerpt": "Task dependencies define the order in which activities must be completed..."
    }
  ]
}
```

---

## Frontend Component Map

```
App.jsx
  ├── FileUpload.jsx
  │     · Drag-and-drop zone
  │     · Upload progress indicator
  │     · Ingested files list with source labels and chunk counts
  │
  ├── ChatPanel.jsx
  │     · Message thread (user + assistant bubbles)
  │     · Input field + send button
  │     · SourceCitation.jsx inline on each assistant message
  │     · Course context bar at top (active materials)
  │
  └── WeakSpotDashboard.jsx
        · Topic cards color-coded by resolution difficulty
        · Session summary: demonstrated / to revisit
        · Explicit note: readiness is the student's decision
```

---

## Key Design Decisions

**Why chunk at ~500 tokens?**
Large enough to contain meaningful context (a full concept explanation), small enough that similarity search returns focused, relevant passages rather than entire sections. 500 tokens is approximately half a lecture slide worth of content.

**Why top 5 chunks in retrieval?**
Enough context for Claude to answer from the course's specific framing without overwhelming the prompt. Five chunks at ~500 tokens each is approximately 2,500 tokens of course context — manageable within Claude's context window alongside conversation history.

**Why pass full conversation history to Claude?**
The Socratic method requires memory of what the student has already demonstrated or said. Without history, Claude cannot build on previous hints or recognize that the student is cycling back to the same misunderstanding.

**Why log hints_needed per interaction?**
This is the weak spot signal. A topic where the student needed 0 hints is understood. A topic where they needed 3+ hints, or never resolved, is a weak spot. The dashboard visualizes this pattern directly.

**Why not use Next.js?**
Unnecessary complexity for this scope. Next.js adds value for SSR, routing, API routes, and deployment optimization at scale. This project has a single-page frontend and a simple Express backend. Vite + React is faster to set up and easier to reason about.
