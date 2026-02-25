# Demo & Submission Guide — AI Professor Office Hours Simulator

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

---

### Opening — The Problem (0:00–0:25)

Open with a split-screen or sequential screenshots:

> *Narration:* "It's 11pm the night before an exam. You're stuck on a concept. You open ChatGPT and ask."

Show a real ChatGPT response to an SPM question — for example, "What is the critical path method?" The response is technically correct but completely generic. No reference to your course, your professor's framing, or your specific materials.

> *Narration:* "Correct. But this has never seen your lecture notes. It doesn't know how your professor taught this. And it just gave you the answer — so you wrote it down and learned nothing."

Pause. Then cut.

---

### The System — Ingestion (0:25–0:55)

Switch to your product in the browser.

> *Narration:* "This is AI Professor Office Hours Simulator. It works from your course materials, not the internet."

Show the drag-and-drop upload zone. Drop in two or three real SPM files — a lecture PDF, your notes, the syllabus. Show the ingestion progress and the success state listing the files with their labels (Lecture 4 — Scheduling, Week 5 — Risk Management, etc.).

> *Narration:* "The system reads your actual lecture slides and notes and builds a searchable course brain. It only knows what your professor taught you."

---

### The Core Interaction — Socratic Exchange (0:55–1:50)

Now ask the same question you showed in the ChatGPT opening.

> *Narration:* "Same question."

The AI responds with a guiding question back, citing the specific week: *"Before we get to the full method, let's build up to it. In your Week 5 lecture on scheduling, your professor introduced the idea of task dependencies. What do you think it means for one task to be dependent on another?"*

You respond with a partial answer. Show the back-and-forth over two or three exchanges. The AI keeps guiding. You get closer. On the final exchange, you arrive at the correct answer with your own reasoning.

> *AI response:* "Exactly right. The critical path is the longest chain of dependent tasks — the sequence where any delay cascades to the project end date. That's from your Week 5 lecture, Section 3. You got there."

> *Narration:* "It never gave me the answer. It made me find it. That's the difference."

---

### Weak Spot Dashboard (1:50–2:15)

Click to the dashboard panel.

> *Narration:* "And it remembers where I struggled."

Show the topic cards. Some are green (resolved in one exchange), one is yellow, one is red.

> *Narration:* "After 20 minutes of studying, I can see exactly which topics I'm solid on and which ones I need to revisit before tomorrow morning."

Point to the session summary at the bottom — topics demonstrated, topics to revisit.

> *Narration:* "It tells me what I've covered. It does not tell me I'm ready. That call is mine."

---

### The Human Decision Moment (2:15–2:30)

Close on the session summary text that reads: *"When to stop studying is your decision."*

> *Narration:* "The AI handles the retrieval, the guidance, the memory. But readiness is a judgment that depends on factors it can't see — time pressure, anxiety, how the professor phrases questions. That decision stays with the student. Always."

Cut.

---

## 500-Word Written Explanation — Draft Structure

Write this after the product is built and the demo is recorded. Use the `IMPLEMENTATION.md` log as raw material. Structure it around the four required questions:

---

**What the human can now do that they couldn't before (~100 words)**

A student can study from their own professor's specific framing of every concept, at any hour, without waiting for office hours. They can ask open-ended questions and receive guided responses that meet them where they are in their understanding — not a generic answer from a textbook they've never read. They can see, at a glance, which topics they've genuinely worked through and which ones they're still shaky on, based on actual interaction data rather than subjective self-assessment.

---

**What AI is responsible for (~125 words)**

The AI owns the full tutoring loop: parsing and indexing the student's course materials, retrieving the most relevant context for each question, constructing a Socratic response that guides without revealing, tracking which topics required the most exchanges, and surfacing a session summary at the end. It does this across any subject, for any course, at any time of day. The cognitive labor of identifying what to ask next, how to scaffold understanding incrementally, and how to maintain the student's engagement without doing their thinking for them — that is the AI's domain.

---

**Where AI must stop (~125 words)**

The system never declares that a student is ready for an exam. Readiness depends on factors the AI cannot observe: how a student performs under timed conditions, their anxiety levels, how their specific professor tends to phrase questions, what was emphasized in the final lecture they missed. An AI-generated readiness signal would create false confidence. Instead, the system presents evidence — what was demonstrated, what wasn't tested — and explicitly surfaces that the decision of when to stop studying belongs to the student. This is not a safety disclaimer. It is a genuine product design decision about where AI confidence ends and human judgment must begin.

---

**What would break first at scale (~150 words)**

Two things. First, retrieval quality degrades with large or poorly structured course materials. A professor who uploads 800 slides with no consistent section headers or topic labels will produce chunks that overlap in meaning and fail to retrieve distinctly. The fix requires smarter chunking — semantic boundary detection rather than fixed token windows — but that adds complexity that is out of scope for this version. Second, the Socratic constraint is probabilistic, not guaranteed. Under sustained adversarial prompting, the model can be nudged toward compliance. A production version would need a lightweight classifier running in parallel that detects shortcut-seeking behavior and re-engages the constraint before the response is returned. Neither of these is unsolvable. Both are worth naming honestly.

---

## Submission Checklist

- [ ] Demo video recorded — 2–3 minutes, shows working system
- [ ] Video uploaded to YouTube (unlisted) or Loom — shareable link ready
- [ ] 500-word write-up drafted and proofread
- [ ] Salary expectation confirmed: CA$110,000 – CA$130,000
- [ ] Years of hands-on AI experience noted (be specific: projects, tools, APIs used)
- [ ] Live demo URL included (from Phase 6 deployment)
- [ ] Submitted before March 2 at 11:59pm EST
