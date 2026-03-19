---
name: adr
description: "Write Architecture Decision Records (ADRs) to docs/decisions/. Use this skill whenever the user wants to record a technical decision, write an ADR, log an architecture decision, document a design choice, or says /adr. Also trigger when the user says 'decision record', 'design decision', or 'document why we chose'."
user_invocable: true
---

# Architecture Decision Record (ADR)

This skill creates ADR files in `docs/decisions/` following the project's established format.

## Workflow

### 1. Gather the decision details

Ask the user (if not already provided) for:

- **Title**: A short descriptive title (e.g., "Use chi as HTTP Router")
- **Context**: What problem or need prompted this decision?
- **Decision**: What was decided?
- **Rationale**: Why this option over others?
- **Alternatives Considered**: What other options were evaluated and why were they rejected?

Use `AskUserQuestion` to collect any missing details. Do not invent technical decisions — every section must come from the user.

### 2. Determine the next ADR number

Scan `docs/decisions/` for existing files matching the pattern `NNN-*.md`. Find the highest number and increment by 1. Zero-pad to 3 digits.

```bash
ls docs/decisions/ | grep -oP '^\d+' | sort -n | tail -1
```

If the directory is empty, start at `001`.

### 3. Generate the filename

Convert the title to a slug: lowercase, replace spaces and special characters with hyphens, strip consecutive hyphens.

Format: `docs/decisions/{NNN}-{slug}.md`

Example: title "Use chi as HTTP Router" with number 11 → `docs/decisions/011-use-chi-as-http-router.md`

### 4. Write the ADR file

Use this exact template — it matches all existing ADRs in the project:

```markdown
# {NNN}: {Title}

**Status**: {Status}
**Date**: {YYYY-MM-DD}

## Context

{Context — describe the problem, need, or trigger for this decision. Keep it concise but complete enough that a future reader understands why this decision was needed.}

## Decision

{Decision — state clearly what was decided. Be specific about the technology, pattern, or approach chosen.}

## Rationale

{Rationale — explain why this decision was made. Use numbered points if there are multiple reasons. Reference concrete technical benefits.}

## Alternatives Considered

{Alternatives — list each alternative with a brief explanation of why it was not chosen. Use bullet points with bold alternative names.}
```

### 5. Status values

Use one of these statuses:

| Status | When to use |
|---|---|
| `Accepted` | Decision is final and in effect (default) |
| `Proposed` | Decision is under discussion, not yet final |
| `Deprecated` | Decision was accepted but is no longer relevant |
| `Superseded by {NNN}` | Replaced by a newer ADR (reference the new ADR number) |

Default to `Accepted` unless the user specifies otherwise.

### 6. Date

Use today's date in `YYYY-MM-DD` format.

## Style guidelines

Match the tone and depth of existing ADRs in the project:

- **Context**: 1-3 sentences explaining the problem or need
- **Decision**: 1-3 sentences stating what was chosen, with specifics (package names, patterns, limits)
- **Rationale**: Numbered list of concrete technical reasons (not vague benefits). Each point should have a **bold label** followed by an explanation
- **Alternatives**: Bullet list with **bold alternative name** followed by why it was rejected

Keep each ADR focused on a single decision. If multiple related decisions need to be recorded, create separate ADRs.

## Checklist

Before considering the ADR done:

- [ ] Number is sequential (no gaps, no duplicates)
- [ ] Filename follows `NNN-slug.md` pattern
- [ ] Title line matches `# NNN: Title` format
- [ ] Status is one of: Accepted, Proposed, Deprecated, Superseded by NNN
- [ ] Date is in YYYY-MM-DD format
- [ ] All four sections present: Context, Decision, Rationale, Alternatives Considered
- [ ] Content comes from the user, not invented
- [ ] Tone and depth matches existing ADRs in `docs/decisions/`
