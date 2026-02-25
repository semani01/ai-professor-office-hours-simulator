# AI Professor Office Hours Simulator

> An AI tutor that knows your course, refuses to shortcut your thinking, and is available the moment you need it.

---

## What This Is

AI Professor Office Hours Simulator is an AI-native study tool built for a specific problem: at 11pm the night before an exam, no help exists that actually knows your course. Google is generic. ChatGPT has never read your professor's slides. Reddit gives you decontextualized answers. Office hours are tomorrow.

This system lets a student upload their actual course materials — lecture slides, notes, syllabus, assignments — and then ask questions. The AI answers exclusively from those materials, referencing the exact week and framing the professor used. Critically, it never gives the student the direct answer. It uses the Socratic method — guiding questions, hints drawn from the student's own notes, sub-problems — until the student arrives at the answer themselves.

The human always does the cognitive work. The AI just refuses to let them skip it.

---

## What Makes This Different from NotebookLM

NotebookLM is a retrieval tool. Its entire design goal is to surface the answer faster. This system's design goal is the opposite — to create productive friction. The Socratic constraint is not a feature layered on top of retrieval. It is a complete inversion of retrieval's value proposition.

Additionally, NotebookLM has no memory of struggle. Every session starts fresh. This system tracks, across sessions, which topics the student asked about, how many hints they needed, and whether they resolved their confusion. That longitudinal weak spot map is a fundamentally different product theory.

---

## The Human Decision — Where AI Must Stop

The AI never certifies that the student is ready for the exam. It can confirm whether a specific answer is correct. It can surface your weak spot map. But it cannot tell you "you're prepared." Readiness depends on factors the AI cannot fully observe: test anxiety, sleep, time pressure, the specific question framing the professor will use. An AI that declares readiness creates false confidence. At the end of every session, instead of a readiness score, the system surfaces three things: what the student demonstrated understanding of tonight, what they haven't tested themselves on yet, and what to prioritize in remaining time. The decision of when to stop studying is always the student's.

---

## Live Demo

> URL will be added after Phase 6 deployment.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| AI — Chat | Claude API (claude-haiku-4-5-20251001) |
| AI — Embeddings | OpenAI text-embedding-3-small |
| Vector Database | Supabase + pgvector |
| File Parsing | pdf-parse, mammoth, pptx-parser |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
| File + Data Storage | Supabase Storage + Supabase DB |

---

## Environment Variables

Create a `.env` file in `/server` using `.env.example` as the template:

```
CLAUDE_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3001
```

> Never commit `.env`. The `.env.example` file with placeholder values is what goes in the repo.

---

## Local Setup

```bash
# Clone the repo
git clone <repo-url>
cd ai-professor-office-hours-simulator

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Start the backend (from /server)
npm run dev

# Start the frontend (from /client)
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:3001`

---

## Project Structure

```
/ai-professor-office-hours-simulator
  /client                        ← React + Vite frontend
    /src
      /components
        FileUpload.jsx
        ChatPanel.jsx
        WeakSpotDashboard.jsx
        SourceCitation.jsx
      /hooks
        useChat.js
        useUpload.js
      App.jsx
      main.jsx
  /server                        ← Node.js + Express backend
    /routes
      upload.js
      chat.js
    /services
      parser.js
      chunker.js
      embeddings.js
      retrieval.js
      claude.js
    /db
      supabase.js
    index.js
  /docs
    README.md                    ← this file
    ARCHITECTURE.md              ← system design + data flow
    ROADMAP.md                   ← phased build plan
    PROMPTS.md                   ← Claude system prompt + rationale
    DEMO.md                      ← demo video script + submission guide
    IMPLEMENTATION.md            ← running build log (updated each session)
  .env.example
  .gitignore
```

---

## Documentation Index

| File | Contents |
|---|---|
| `ARCHITECTURE.md` | Full system design, data flow, tech decisions, Supabase schema, folder structure |
| `ROADMAP.md` | Phase-by-phase build plan with exit conditions |
| `PROMPTS.md` | Claude system prompt with rationale and tuning notes |
| `DEMO.md` | Demo video script, submission write-up guide, salary notes |
| `IMPLEMENTATION.md` | Running log of what was built, decisions made, problems hit |
