---
description: Brainstorm a feature into a production-grade design HTML, autonomously — a brainstormer subagent answers every question on your behalf.
argument-hint: [description of the thing to brainstorm]
---

You are operating in **fully autonomous mode**. The user will NOT answer questions during this run. Drive the design exploration to completion using best-judgment reasoning, then present the result for review.

The thing to brainstorm:

> $ARGUMENTS

If `$ARGUMENTS` is empty, ask the user once for a description, then proceed autonomously from there.

## Step 1 — Derive the output path

Build the filename from the next sequential doc number and a kebab-case slug of the topic: `docs/brainstorm/NNN-<slug>.html`.

- Numbering is **sequential, zero-padded three digits** — NOT date-prefixed (see `docs/brainstorm/CLAUDE.md`). Find the next number with:

  ```
  ls docs/brainstorm/[0-9]*.html | sort | tail -1
  ```

  Take `highest existing number + 1`. Never reuse or skip a number.
- Keep the slug short and descriptive (e.g. `card-side-peek-panel`, `smart-views-filter`).
- If a file at that path already exists, something is off — re-derive the number rather than overwriting.

State the chosen path (and number) before continuing.

## Step 2 — Surface context for the subagent

Gather, but don't over-research (the subagent reads code itself):

- The root `CLAUDE.md`, `docs/epics/CLAUDE.md` (workflow + locked decisions), and `docs/brainstorm/CLAUDE.md` (doc conventions).
- Any auto-memory entries relevant to the topic.
- Any existing brainstorm in `docs/brainstorm/` that already covers this — so the subagent extends rather than relitigates it. Flag the `locked spec` / `locked plan` docs (`001`, `002`) as settled.

## Step 3 — Dispatch the brainstormer subagent

Dispatch the **brainstormer** subagent (Agent tool, `subagent_type: brainstormer`). Give it:

- the full feature description (`$ARGUMENTS`),
- the context hints and relevant auto-memory entries you found in Step 2,
- **explicit instruction**: the user is unavailable — answer every clarifying question yourself with best-judgment reasoning and a strong v0.1 MVP bias; explore the design space until it's sufficiently resolved,
- the absolute output path and doc number from Step 1.

Wait for it. Read its output file.

## Step 4 — Update the brainstorm index

Per `docs/brainstorm/CLAUDE.md`, the index invariant must hold: whenever a new doc is added, update `docs/brainstorm/index.html` in the same change:

1. Add a new `<li>` to the `<ol class="docs">` **at the bottom** (entries are ordered by number ascending, newest last).
2. Match the existing `<li>` shape: a `.row` with `<span class="num">NNN</span>`, an `<a class="title" href="NNN-<slug>.html">` whose text is the new doc's `<h1>`, and a status `<span class="tag m">awaiting review</span>`.
3. Add a `.desc` div — the one-sentence TL;DR pulled from the doc's executive summary / lede.
4. Add a `.sub` div with the date line (e.g. `2026-05-25 · design`).

## Step 5 — Hand off

End with a single message containing:

1. The output path (clickable).
2. A 2-3 sentence summary of the design that was reached.
3. The load-bearing decisions and anything marked `assumed` — the things most worth the user's review.
4. What was deferred to v2, and any follow-ups the doc flags.

Do NOT write code, create branches, commit, or invoke `writing-plans`. This command stops at the design doc for review.
