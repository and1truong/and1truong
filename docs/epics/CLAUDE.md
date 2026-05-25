# Working the epics

This directory holds implementation plans for **fulmar**, broken into epics and tasks. Read this before picking up or modifying any epic/task.

## What this directory is

- `index.md` — the **live** epics map: epics in flight / ready to pick up, build order, and brand-critical guardrails
- `index.shipped.md` — the **archive**: one row per `done` epic (status, task counts, goal, source/deviation note). An epic's row lives in exactly one of the two index files — `index.md` while it has unfinished work, `index.shipped.md` once it's `done`
- `NNN-<slug>/` — one epic (a coherent chunk of v0.1), e.g. `006-smart-views/`
- `NNN-<slug>/README.md` — epic overview: status, goal, demo-at-close, task table, rationale
- `NNN-<slug>/task-NNN.md` — one task: a thin vertical slice, with frontmatter + What to build / Acceptance criteria / Notes

The plan these decompose is [`../brainstorm/002-first-version-plan.html`](../brainstorm/002-first-version-plan.html). The locked product spec is [`../brainstorm/001-cross-platform-kanban.html`](../brainstorm/001-cross-platform-kanban.html). **Do not relitigate decisions in those docs** — wedge, framework (Flutter + later Rust core), pure-Dart-for-v0.1, sync model, pricing, personal-only, bright lines are all settled. If a task seems to contradict them, the task is wrong; flag it, don't silently diverge.

## Task frontmatter

```yaml
id: NNN-MMM          # epic-task, e.g. 006-001 — globally unique, used in blocked_by
title: ...
status: ready        # see lifecycle below
type: AFK            # AFK = no human needed | HITL = needs a human decision/judgment
blocked_by: []       # list of task ids that must be done first
epic: NNN-slug
created: YYYY-MM-DD
```

## Status lifecycle

`ready` → `in-progress` → `done`. Also: `blocked` (has unmet `blocked_by`), `cancelled`.

- **ready** — no unmet blockers; can be picked up now
- **blocked** — at least one `blocked_by` task is not yet `done`
- **in-progress** — actively being worked
- **done** — acceptance criteria all checked and verified
- **cancelled** — abandoned (say why in Notes)

A task is `ready` iff every id in its `blocked_by` is `done`. When you mark a task `done`, check whether any `blocked` task just became `ready` and update it.

## AFK vs HITL

- **AFK** tasks can be implemented and merged without a human in the loop.
- **HITL** tasks need a human: an architectural call, a notarization/signing step, or a subjective judgment. The two HITL tasks in v0.1 are `002-001` (drag-drop spike — a human judges "calm" against the pass/fail bar) and `007-003` (notarized build + polish sign-off). Do NOT self-approve a HITL gate.

## Keeping status in sync (important)

Status lives in **three places** and they must agree:
1. The task file's `status:` frontmatter (source of truth for that task)
2. The epic `README.md` — both the top `**Status:**` line (`N/M tasks done`, what's ready) and the **Status column** in the task table
3. The index — split in two: [`index.md`](./index.md) for epics still in flight (its **In flight / ready to pick up** section), and [`index.shipped.md`](./index.shipped.md) for `done` epics. An epic's row lives in exactly one of them.

When you change a task's status, update the task frontmatter, its epic README, AND the relevant index in the same change. While an epic is in flight its row + counts live in `index.md`; when a task becomes `done`, also re-check `index.md`'s **In flight / ready to pick up** section — promote any newly-unblocked tasks and drop the one you finished. **When the last task in an epic becomes `done`, set the epic README status line to `done` and MOVE the epic's row out of `index.md` into `index.shipped.md`** (with its source/deviation note) — don't leave a `done` row in the live index.

## Picking up a task

1. Read the task file and confirm every `blocked_by` is `done` (don't start a `blocked` task).
2. Read the linked brainstorm section(s) in the Notes for full context.
3. Set the task to `in-progress` (frontmatter + epic README).
4. Implement to satisfy the Acceptance criteria. Honor the locked decisions and the per-task Notes (they encode real constraints, e.g. "notes is TEXT not BLOB", "no assignee UI", "destructive import only").
5. Verify against the acceptance criteria before claiming done — run it, don't assert. For `006-001` specifically, tests come first and must be green before any UI.
6. Set the task to `done`; promote any newly-unblocked tasks to `ready`.

## Build order & the critical path

Rough dependency order: **001 → 002 → 003 → 004 → 005 → 006 → 007**. But `blocked_by` is the real gate — independent tasks can be grabbed out of order:
- `005-001` (markdown parser) is pure and has **no blockers** — grab it any time.
- `006-001` (completion state machine) depends only on `001-003` — build it **early and test-first**, not at the end. It is the highest-risk piece in v0.1.

## Two things that protect the brand (don't cut)

1. **`002-001` drag-drop spike** comes before real Board view. Stuttery drag kills the "calm" positioning. If no package clears the auto-scroll bar, escalate it as a project-level risk.
2. **`006-001` completion state machine** is test-first, a pure `(card, action, board) → newCardState` function called by both the checkbox and the drag handler. Its failure mode is silent distrust, not a crash. This is the one place test-first is non-negotiable.

## Decision log (`implementation-notes.md` per epic)

Every epic folder has (or gets) an `implementation-notes.md`. Log each **non-trivial implementation decision** there as it's made — package choices, schema/API shape calls, trade-offs, anything a future reader would otherwise have to reverse-engineer. Keep entries short and dated:

```
## YYYY-MM-DD — <task id> — <decision title>
**Decision:** what was chosen.
**Why:** the reasoning / alternatives rejected.
**Affects:** downstream tasks or files this constrains.
```

Decisions are made autonomously during implementation (no asking) — the log is how they stay reviewable after the fact. Trivial choices (naming a local variable) don't belong here; anything that closes off an alternative or would surprise a reader does.

## Editing conventions

- Task slices are vertical (cut through schema → repo → UI → tests), not horizontal layers.
- Keep Acceptance criteria as checkable `- [ ]` items; tick them as they're met.
- Avoid hard-coding file paths in task bodies — they rot. Inline a decision-rich snippet (schema, state-machine rules) only when prose is less precise.
- Don't add new epics/tasks without a corresponding entry in the brainstorm plan, or a note explaining the deviation.
