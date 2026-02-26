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
- Cut `feat/phase-1-ingestion` branch and begin ingestion pipeline ✅

---

### 2026-02-26 — Phase 1: File Ingestion Pipeline

**Built:**
-

**Decisions:**
-

**Problems:**
-

**Next:**
-

---

### [Date] — Phase 2: Retrieval & Claude Integration

**Built:**
- 

**Decisions:**
- 

**Problems:**
- 

**Next:**
- 

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
