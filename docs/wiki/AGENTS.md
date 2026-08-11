# AGENTS\.md

## Purpose

This repository is a persistent personal knowledge base maintained jointly by humans and AI agents\.

Treat the repository as a **knowledge codebase**:

- sources are inputs
- wiki pages are compiled knowledge
- links form the knowledge graph
- `index.md` is the navigation map
- `log.md` is the audit trail
- agents continuously ingest, synthesize, link, refactor, and lint knowledge

Do not let useful knowledge die inside chat history\.

---

## Repository Model

```text
raw/          Original evidence and source material
wiki/         Canonical synthesized knowledge
findings/     Important discovered facts
decisions/    Decisions and rationale
risks/        Risks, concerns, unknowns
projects/     Project-specific knowledge
learning/     Learning notes and explanations

index.md      Global semantic/navigation index
log.md        Append-only knowledge activity log
AGENTS.md     Agent operating contract
```

## Core Principle

```text
raw evidence
     ↓
   agent
     ↓
synthesis / reasoning
     ↓
persistent linked knowledge
     ↓
future reasoning
     ↓
better persistent knowledge
```

Knowledge should **compound over time**\.

---

# 1\. Source of Truth

`raw/` contains primary evidence\.

Examples:

- documents
- transcripts
- interviews
- source code observations
- papers
- articles
- screenshots
- external research
- exported conversations

Rules:

1. Do not silently alter original evidence\.
2. Clearly distinguish observed facts from interpretation\.
3. Preserve source provenance\.
4. Prefer primary sources over summaries\.
5. Never convert uncertain information into fact\.

When sources conflict, preserve the conflict explicitly\.

---

# 2\. Wiki Is Compiled Knowledge

Files under `wiki/` are not raw notes\.

They should represent the best current synthesis of available evidence\.

A good wiki page:

- explains the concept clearly
- merges information from multiple sources
- removes unnecessary duplication
- links related concepts
- records uncertainties
- records contradictions
- distinguishes facts from hypotheses
- remains understandable without reading the original conversation

Do not create one page per conversation or one page per source unless that source itself is important\.

Organize by **concept**, not by ingestion event\.

---

# 3\. Ingestion Workflow

Whenever new evidence arrives:

1. Read the source\.
2. Identify new facts, concepts, entities, relationships, risks, and decisions\.
3. Search existing knowledge before creating new pages\.
4. Update existing canonical pages where appropriate\.
5. Create new pages only when a distinct durable concept exists\.
6. Add or repair links\.
7. Update affected synthesis pages\.
8. Update `index.md` if navigation meaningfully changes\.
9. Append the operation to `log.md`\.

One source may update many pages\.

Do not merely summarize the new source\.

Integrate it into existing knowledge\.

---

# 4\. Conversation → Knowledge

Useful reasoning produced during conversations is also an input\.

After answering a substantial question, ask:

> Did this conversation produce durable knowledge that will be useful later?

If yes, persist it\.

Examples:

- architecture understanding
- comparison between approaches
- newly discovered dependency
- root cause
- important explanation
- unresolved question
- risk
- decision
- corrected misconception
- design principle

Do not persist:

- greetings
- temporary logistics
- trivial questions
- duplicated information
- speculative ideas with no lasting value unless explicitly marked as hypotheses

---

# 5\. Knowledge Types

Use explicit semantics\.

## Fact

Directly supported by evidence\.

```md
**Fact:** ...
```

## Finding

A meaningful conclusion discovered through investigation\.

```md
**Finding:** ...
```

## Hypothesis

Plausible but unverified\.

```md
**Hypothesis:** ...
```

## Risk

Something that may negatively affect the system, project, or decision\.

Include:

- condition
- impact
- evidence
- likelihood if known
- mitigation if known

## Decision

Record:

- decision
- context
- alternatives
- rationale
- consequences
- date if relevant

## Open Question

Something materially unresolved\.

Do not invent an answer merely to make the wiki appear complete\.

---

# 6\. Linking

Use links aggressively but meaningfully\.

Prefer:

```md
[[Concept Name]]
```

Pages should link to:

- dependencies
- related concepts
- parent concepts
- competing approaches
- relevant risks
- decisions
- projects
- people/systems when useful

Avoid link spam\.

A link should represent a useful semantic relationship\.

When creating a page, check whether relevant existing pages should link back to it\.

---

# 7\. Canonical Knowledge

There should normally be one canonical page for one concept\.

Before creating:

```text
wiki/new-concept.md
```

search for:

- synonyms
- older names
- abbreviations
- related pages

Prefer updating or restructuring existing knowledge over creating duplicates\.

If duplicate pages exist:

1. choose the canonical page
2. merge useful content
3. repair incoming links
4. remove or redirect obsolete pages

---

# 8\. Evidence and Provenance

Important claims should be traceable to evidence\.

When practical, record:

```md
## Sources

- [[raw/...]]
- URL / document / issue / commit / interview reference
```

For inferred conclusions:

```md
**Inference:** ...
```

and identify the evidence used\.

Never present an inference as directly observed fact\.

---

# 9\. Contradictions

When new evidence contradicts existing knowledge:

Do not silently overwrite the old claim\.

Instead:

1. identify the contradiction
2. inspect source quality and recency
3. update the canonical page
4. preserve relevant historical context
5. mark unresolved conflicts explicitly

Example:

```md
## Conflicting Evidence

Source A indicates ...
Source B indicates ...

Current assessment: unresolved.
```

---

# 10\. Temporal Knowledge

Some facts change\.

Examples:

- ownership
- deployment state
- architecture
- release status
- team responsibility
- feature availability

For temporal claims, include dates or periods where useful\.

Avoid turning:

> System X currently uses Y.

into an eternal statement\.

Prefer:

> As of 2026-08, System X uses Y.

---

# 11\. Index

`index.md` is a semantic map, not a dump of every file\.

It should expose major:

- projects
- systems
- concepts
- people
- architecture areas
- research areas
- active investigations

Example:

```md
## Systems

- [[Runbook Platform]]
- [[Cloud Conductor]]

## Architecture

- [[Temporal]]
- [[Capability Registry]]

## Research

- [[Agent Knowledge Systems]]
```

Keep it compact\.

---

# 12\. Activity Log

`log.md` is append\-only\.

Format:

```md
## 2026-08-11 — ingest
Source: ...
Updated:
- [[Page A]]
- [[Page B]]

Key changes:
- ...
```

Operations may include:

- `ingest`
- `query`
- `research`
- `interview`
- `decision`
- `refactor`
- `lint`
- `correction`

Do not use the log as the knowledge store\.

---

# 13\. Refactoring

Agents are expected to refactor the wiki\.

Allowed and encouraged:

- merge duplicate pages
- split oversized pages
- improve names
- reorganize sections
- repair links
- extract concepts
- remove obsolete duplication
- improve synthesis

Preserve meaning and provenance\.

Knowledge quality is more important than preserving accidental file structure\.

---

# 14\. Wiki Lint

Periodically inspect the repository for:

- duplicate concepts
- contradictions
- stale claims
- orphan pages
- broken links
- missing backlinks
- unsupported claims
- uncited important facts
- oversized pages
- fragmented knowledge
- unresolved questions
- missing conceptual pages
- outdated terminology

Fix safe issues directly\.

Record meaningful refactors in `log.md`\.

---

# 15\. Research

When existing knowledge is insufficient:

1. state what is unknown
2. locate primary evidence where possible
3. distinguish external knowledge from repository\-specific facts
4. ingest important findings
5. update canonical pages
6. preserve provenance

Do not fill gaps with confident guesses\.

---

# 16\. Projects vs Knowledge

Projects may change or disappear\.

Knowledge should remain reusable\.

Avoid burying general concepts inside project\-specific pages\.

Example:

Bad:

```text
projects/foo/temporal-retry-behaviour.md
```

if the content applies generally\.

Prefer:

```text
wiki/Temporal Retry Semantics.md
```

and link the project to it\.

---

# 17\. Issues and Work Tracking

Issues represent **work to be done**, not canonical knowledge\.

Use issues for:

- investigations
- tasks
- epics
- bugs
- open research
- proposed changes

When an issue produces durable knowledge, move that knowledge into the wiki and link it back\.

```text
Issue
  ↓ investigation
Finding
  ↓ synthesis
Wiki
```

Closing an issue must not make its useful knowledge disappear\.

---

# 18\. Agent Behaviour

Agents should be proactive knowledge maintainers\.

When meaningful knowledge is discovered:

**update the wiki without waiting to be explicitly asked\.**

Especially persist:

- findings
- risks
- architecture discoveries
- hidden assumptions
- operational behaviour
- ownership boundaries
- dependencies
- failure modes
- security concerns
- significant corrections
- important unresolved questions

Do not interrupt normal work for trivial wiki updates\.

---

# 19\. Writing Style

Prefer:

- concise prose
- explicit claims
- short sections
- diagrams where useful
- concrete examples
- links over repeated explanation

Avoid:

- conversational filler
- generic AI prose
- unnecessary introductions
- duplicated explanations
- speculative certainty

Write for a future reader who has no access to the conversation that created the page\.

---

# 20\. Completion Rule

A knowledge\-producing task is not complete when the answer has been produced\.

It is complete when:

```text
evidence understood
+
answer produced
+
durable knowledge integrated
+
links repaired
+
important provenance preserved
```

The repository should become more useful after every meaningful interaction\.

---

# Prime Directive

**Do not treat the wiki as a collection of notes\.**

Treat it as an evolving model of reality\.

Every new source, investigation, conversation, and decision should make that model more accurate, more connected, and easier for the next human or agent to reason from\.
