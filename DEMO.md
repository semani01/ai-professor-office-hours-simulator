# Demo & Submission Guide — Maieutic

---

## The Submission Requirements (from Wealthsimple)

1. **Demo video** — 2–3 minutes. Show the system actually working.
2. **Written explanation** — max 500 words covering:
   - What the human can now do that they couldn't before
   - What AI is responsible for
   - Where AI must stop
   - What would break first at scale
3. **Salary expectation** and years of hands-on experience with AI tools or systems
4. **Deadline** — Monday, March 2 at 11:59pm EST

No decks. No resumes.

---

## Salary Guidance

The role is based in Toronto, so the salary will be in **CAD**.

**Market data (as of early 2026):**
- Wealthsimple SWE entry level (GTA): CA$133K
- Wealthsimple SWE median (GTA): CA$162K total comp
- AI Engineer median in Canada: CA$103K
- AI Engineer 75th percentile in Canada: CA$138K

**Recommended ask: CA$110,000 – CA$130,000**

This is defensible as an early-career candidate with genuine hands-on AI project experience (AI Stock Picker, PEGASUS summarizer, FloraSense, Colorado crash analysis) while being competitive and not undervaluing the specialized nature of this role. Do not go lower — Wealthsimple compensates well and this is a niche role, not a standard junior SWE position.

---

## Demo Video Script

**Total target length: 2 minutes 30 seconds**
**Format: Screen recording with face camera + voiceover**
**Live URL: https://ai-professor-office-hours-simulator.vercel.app**

---

### Opening — The Problem (0:00–0:20)

Open with a real ChatGPT screenshot answering "What is the critical path method?"

> *Narration:* "It's 11pm before an exam. You're stuck. You open ChatGPT and ask. The answer is technically correct — but it's generic. It's never seen your lecture notes. It doesn't know how your professor framed this. And it just gave you the answer — so you wrote it down and learned nothing."

Cut to the Maieutic login screen.

> *Narration:* "This is Maieutic."

---

### Study Session Start (0:20–0:45)

Sign in. The **Start Study Session** button is visible in the header.

Click it. The 4-step wizard opens:
1. Choose intent: **Exam Prep**
2. Select topics from the syllabus (check 2–3: Scheduling, Risk Management, Agile)
3. Set a time goal: 30 minutes
4. AI generates a personalized study plan — show it briefly

> *Narration:* "Before I even ask a question, Maieutic plans my session. It looks at my course topics, my goal, and builds a structured study path."

Click **Start Session**. The **ActiveSessionBanner** appears at the top with a live timer.

---

### File Upload & Course Brain (0:45–1:05)

Drag two or three SPM files into the upload zone — a lecture PDF, notes, the syllabus.

> *Narration:* "I drop in my actual lecture slides and notes. The system reads them, chunks them into searchable pieces, and embeds them locally — no third-party indexing service. It only knows what my professor taught me."

Show the ingested file list with sourceType badges (Lecture · Week 5, Syllabus, Notes).

---

### The Core Interaction — Socratic Exchange (1:05–1:45)

Ask: *"What is the critical path method?"*

> *Narration:* "Same question I asked ChatGPT."

The AI responds with a guiding question back, citing the specific week: *"Before we get to the full method — in your Week 5 lecture on scheduling, your professor introduced task dependencies. What do you think it means for one task to be dependent on another?"*

Do two or three exchanges. Guide yourself to the answer. On the final exchange:

> *AI:* "Exactly. The critical path is the longest chain of dependent tasks — any delay there cascades to the end date. That's from Week 5, Section 3. You got there."

> *Narration:* "It never gave me the answer. It made me find it."

---

### Quest System (1:45–2:00)

Show the **Quest Panel** on the right sidebar. Quests were generated from the session plan — e.g. "Deep dive: Scheduling methods", "Quiz: Risk categories".

Click **Go →** on one quest to navigate directly to the Topic Room.

> *Narration:* "The AI generated a set of quests from my study plan. Each one is a concrete next action — not just a vague suggestion."

---

### Topic Room (2:00–2:15)

The Topic Room opens for **Scheduling**. Show:
- **Overview tab** — Key Concepts, Practice Questions, Coaching Tips
- **Flashcards tab** — flip a card (3D flip animation)
- **Mind Map tab** — the collapsible SVG tree

> *Narration:* "For each topic, I get a structured breakdown, flashcards, and a mind map — all generated from my own materials, not Wikipedia."

---

### Knowledge Portfolio & Session End (2:15–2:30)

Click back. Show the **Knowledge Portfolio** — topic tier rings (Mastered / In Progress / Revisit), color-coded by how much you struggled.

Then click **End Session** in the banner. A loading spinner appears while the AI generates the summary. The **Session Summary panel** slides in:
- What you demonstrated ✅
- What wasn't tested yet ⏳
- Priorities for next time 🎯
- Recommended quests to adopt

> *Narration:* "At the end of my session, I get a map of exactly what I know, what I don't, and what to do next. The AI tracks all of it. But it doesn't tell me I'm ready for the exam. That call is mine."

Close on the summary text: *"When to stop studying is your decision."*

Cut.

---

## 500-Word Written Explanation — Draft Structure

Write this after the product is built and the demo is recorded. Use the `IMPLEMENTATION.md` log as raw material. Structure it around the four required questions:

---

**What the human can now do that they couldn't before (~100 words)**

A student can study from their own professor's specific framing of every concept, at any hour, without waiting for office hours. They can ask open-ended questions and receive guided responses that meet them where they are in their understanding — not a generic answer from a textbook they've never read. They can start a structured AI-planned study session, follow a quest roadmap, explore any topic in depth with flashcards and mind maps built from their own lecture notes, and see — at the end — exactly which topics they've genuinely worked through and which ones they're still shaky on.

---

**What AI is responsible for (~125 words)**

The AI owns the full tutoring loop: parsing and indexing the student's course materials, retrieving the most relevant context for each question, constructing a Socratic response that guides without revealing, planning a personalized study session from the student's intent and topics, generating a quest roadmap to structure the session, producing on-demand flashcards and mind maps per topic, tracking which topics required the most exchanges, and synthesizing a session summary at the end. It does this across any subject, for any course, at any time. The cognitive labor of identifying what to ask next, how to scaffold understanding incrementally, and how to maintain engagement without doing the student's thinking for them — that is the AI's domain.

---

**Where AI must stop (~125 words)**

The system never declares that a student is ready for an exam. Readiness depends on factors the AI cannot observe: how a student performs under timed conditions, their anxiety levels, how their specific professor tends to phrase questions, what was emphasized in the lecture they missed. An AI-generated readiness signal would create false confidence. Instead, the system presents evidence — what was demonstrated, what wasn't tested — and explicitly surfaces that the decision of when to stop studying belongs to the student. This is not a safety disclaimer. It is a genuine product design decision about where AI confidence ends and human judgment must begin.

---

**What would break first at scale (~150 words)**

Two things. First, retrieval quality degrades with large or poorly structured course materials. A professor who uploads 800 slides with no consistent section headers or topic labels will produce chunks that overlap in meaning and fail to retrieve distinctly. The fix requires smarter chunking — semantic boundary detection rather than fixed token windows — but that adds complexity out of scope for this version. Second, the Socratic constraint is probabilistic, not guaranteed. Under sustained adversarial prompting, the model can be nudged toward compliance. A production version would need a lightweight classifier running in parallel that detects shortcut-seeking behavior and re-engages the constraint before the response is returned. Neither of these is unsolvable. Both are worth naming honestly.

---

## Submission Checklist

- [ ] Demo video recorded — 2–3 minutes, shows working system
- [ ] Video uploaded to YouTube (unlisted) or Loom — shareable link ready
- [ ] 500-word write-up drafted and proofread
- [ ] Salary expectation confirmed: CA$110,000 – CA$130,000
- [ ] Years of hands-on AI experience noted (be specific: projects, tools, APIs used)
- [ ] Live demo URL included: https://ai-professor-office-hours-simulator.vercel.app
- [ ] Submitted before March 2 at 11:59pm EST
