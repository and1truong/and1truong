---
description: Convert a brainstorm/design HTML into an epic scaffold under docs/epics/ — README + vertical-slice tasks + an index.md entry, all three status places in sync. The middle of the trilogy: /brainstorm → /to-epic → /ship-epic. Stops at the scaffold; writes no code, commits nothing.
argument-hint: [brainstorm path or NNN/slug — optional; defaults to newest unmapped brainstorm]
---

You are the **orchestrator** for turning one brainstorm into one epic. Work autonomously: make every decision yourself, never stop to ask. You write **no code**, create **no branches**, and **do not commit** — the output is the epic scaffold (docs only), which the human reviews and then ships with `/ship-epic`.

## 0. Ground yourself

Read these in full first — they define the target format and the invariant you must not break:

- `docs/epics/CLAUDE.md` — the task lifecycle, the task frontmatter, AFK vs HITL, and the **three-place status-sync rule** (status lives in the task frontmatter, the epic README, AND `index.md` — they must always agree). Everything below assumes you've read it.
- `docs/brainstorm/CLAUDE.md` — the source-doc conventions (how brainstorm HTMLs are named and structured; the `index.html` / `index.shipped.html` split).
- The root `CLAUDE.md` (the test-runner split, the `lib/data` Flutter-free rule).

## 1. Resolve the brainstorm source

- If `$ARGUMENTS` names a brainstorm — a path (`docs/brainstorm/012-responsive-shell-min-window.html`) or a bare number/slug (`012`, `responsive-shell-min-window`) — use that file.
- Otherwise **auto-pick the newest unmapped brainstorm**: list `docs/brainstorm/[0-9]*.html` (the digit glob already excludes `index.html`, `index.shipped.html`, and the `.css`/`.js` assets). Exclude `001` and `002` — the locked spec + v0.1 plan are the settled backdrop, not a fresh epic. From the rest, pick the **highest-numbered** brainstorm that is **not** already referenced by any epic. To check "mapped," grep each brainstorm's `NNN-<slug>.html` filename across `docs/epics/*/README.md` (the `**Source:**` line) and `docs/epics/index.md`.

If you cannot find any unmapped brainstorm, stop and say so (everything's already an epic). State the chosen brainstorm file before continuing.

## 2. Allocate the epic number and slug

- The new epic number is `(max existing epic dir number) + 1`, zero-padded to three digits (`ls docs/epics/` → highest `NNN-*` + 1). Fulmar's epic and brainstorm numbers have converged, so this will usually equal the brainstorm number — but the epic-dir max is the authority, not the brainstorm number.
- The slug is the brainstorm's slug (filename minus the `NNN-` prefix and `.html`), trimmed tight. The epic directory is `docs/epics/NNN-<slug>/`.

State the allocated `NNN-<slug>` before continuing.

## 3. Dispatch the epic-decomposer subagent

Dispatch the **epic-decomposer** subagent (Agent tool, `subagent_type: epic-decomposer`). Give it:

- the absolute path to the chosen brainstorm HTML,
- the allocated epic number `NNN` and slug, and the target epic directory path,
- the layers it likely touches (schema / repo / riverpod controller / widget / native runner — infer from the brainstorm's architecture + touch-points; fulmar is one Flutter app, no subrepos),
- whether this is **net-new beyond the v0.1 plan** (`002-first-version-plan.html`) — if so it needs a **deviation note** in the README and index entry, per the `docs/epics/CLAUDE.md` "no new epics without a brainstorm entry or a deviation note" rule (cf. epics 008–012),
- any auto-memory entries relevant to the topic,
- **explicit instruction**: the user is unavailable — make every call yourself; produce a richly-specified epic (tasks as thin vertical slices with real What-to-build + checkable Acceptance criteria pulled from the brainstorm's contracts/touch-points), keep all three status places in sync, write no code, commit nothing.

Wait for it. Then read every file it wrote.

## 4. Verify the scaffold — don't assert

Open the files the decomposer produced and confirm:

1. **Files exist:** `docs/epics/NNN-<slug>/README.md`, one `task-NNN-MMM.md` per task, and the `index.md` entry.
2. **Three-place sync holds** (the core invariant): the per-task `status:` frontmatter, the README's top `**Status:**` line + Status column, and `index.md`'s row + **Ready to pick up now** list all agree. Every task starts `ready` or `blocked`; the epic status line is `ready · 0/M tasks done`.
3. **Dependency graph is sound:** every id in every `blocked_by` references a real task in this epic (or an explicitly-noted cross-epic id); there are no cycles; **at least one task is `ready`** (empty `blocked_by`), or the epic can never start.
4. **Provenance:** the README's `**Source:**` line points at the brainstorm file; the **Locked decisions** match the brainstorm's load-bearing calls (don't relitigate them); task Notes link back to brainstorm sections (`...html#section`). If net-new beyond the v0.1 plan, the deviation note is present in both the README and the index entry.
5. **No code, no commit, no branch** was created.

If any check fails, re-dispatch the decomposer with the specific defect rather than hand-patching — except for a trivial single-line sync fix, which you may apply directly and note.

## 5. Hand off

Do **not** commit. End with a single message containing:

1. The epic path (`docs/epics/NNN-<slug>/README.md`) and the source brainstorm it came from.
2. The **goal** and **demo-at-close** in one or two sentences.
3. The **task table**: id, title, type (AFK/HITL), and `blocked_by` — so the human can sanity-check the slicing and the dependency order at a glance.
4. The **locked decisions** carried over from the brainstorm (the load-bearing calls) and anything the decomposer marked `assumed` — the things most worth review.
5. Any **HITL** tasks, and any **spec amendment / deviation note** the brainstorm implies (e.g. crossing a bright line, cf. `011-001`) — now a task or a note, not yet acted on.
6. The next step: review, then `/ship-epic NNN` to build it.

Do NOT write code, create branches, commit, or invoke `writing-plans`/`executing-plans`. This command stops at the reviewable epic scaffold.
