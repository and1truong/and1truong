---
description: Pick an epic and grind every ready task to done. Each task runs through a developer subagent that plans (superpowers:writing-plans) then executes (superpowers:executing-plans). Status and the decision log stay in sync. Fully autonomous.
argument-hint: [epic-number, e.g. 001 — optional]
---

You are the **orchestrator** for shipping one epic end to end. Work fully autonomously: make every decision yourself, never stop to ask. Your only outputs to the human are progress notes and a final summary.

## 0. Ground yourself

Read `docs/epics/CLAUDE.md` in full first. It is the source of truth for the task lifecycle, the status-sync rule (status lives in BOTH the task frontmatter AND the epic README — they must always agree), the AFK/HITL distinction, and the decision-log format. Everything below assumes you have read it.

## 1. Choose the epic

- If `$ARGUMENTS` names an epic (a number like `1`/`001` or a slug), use that epic.
- Otherwise pick the first epic in build order (`001 → 007`) whose README status is not `done` and that has at least one task with `status: ready`.

Read the epic's `README.md` and every `task-NNN.md` in it. Then create a TodoWrite list — one item per task in the epic — so progress is visible.

## 2. The work loop

Repeat until no task in the epic is `ready`:

1. **Select** the next task whose `status: ready` (every id in its `blocked_by` is `done`), preferring lowest id. Read the task file and the brainstorm section(s) its Notes link to.
2. **Mark in-progress** in BOTH places: the task's `status:` frontmatter and the epic README (top status line + the Status column). Update the TodoWrite item to in_progress.
3. **Dispatch the developer subagent** (see §3). Wait for it to finish.
4. **Verify, don't assert.** Confirm each acceptance criterion is actually met — run what can be run (`flutter test`, `flutter run -d macos`, etc.). Tick the `- [ ]` boxes in the task file only for criteria you have evidence for. If verification fails, re-dispatch the developer with the specific failure rather than marking done.
5. **Mark done** in BOTH places: task frontmatter `status: done`, epic README status line (`N/M tasks done`, recompute what's `ready`) and Status column. Then **promote** any task whose blockers are now all `done` from `blocked` to `ready` (frontmatter + README). Update TodoWrite.
6. **Log decisions** (see §4).

When all tasks are `done`, set the epic README top status line to `done`, then write a final summary covering: what shipped, what was verified and how, every decision logged, and any cross-epic `blocked_by` that left tasks still blocked. Persist this summary as `docs/epics/<epic>/implementation-summary.md` (the durable epic-close artifact — distinct from the running `implementation-notes.md` decision log) AND surface it to the human in your closing message.

## 3. The developer subagent

For each task, dispatch a subagent with the Agent tool (`subagent_type: general-purpose`). It is "the developer". Give it a prompt of this shape:

> You are the **developer** for task `<id>` of epic `<epic>`, working autonomously. Do not ask questions — decide and proceed.
>
> 1. Read `docs/epics/CLAUDE.md`, the task file `docs/epics/<epic>/task-<id>.md`, the epic README, and the brainstorm section(s) the task's Notes link to. Honor every locked decision and per-task Note — they encode real constraints.
> 2. Invoke the **`superpowers:writing-plans`** skill (via the Skill tool) and produce an implementation plan for this task from its What-to-build + Acceptance criteria. Save the plan inside the epic dir.
> 3. When the plan is ready, invoke the **`superpowers:executing-plans`** skill and implement the plan. There is no human at the review checkpoints — make the call yourself at each one and record any non-trivial choice (see below).
> 4. Verify against the task's acceptance criteria by running it, not by asserting. The work for this task should land as one coherent commit on a feature branch (not directly on `main`).
> 5. Append every non-trivial decision to `docs/epics/<epic>/implementation-notes.md` using the repo's format (`## YYYY-MM-DD — <id> — <title>` / **Decision:** / **Why:** / **Affects:**). Today is the current date.
> 6. Return a concise report: what you built, the verification commands you ran and their results, the decisions you logged, and anything that needs the orchestrator's attention.

(The developer is a subagent, so it skips the `using-superpowers` bootstrap — but it MUST still explicitly invoke `writing-plans` then `executing-plans` as instructed above.)

## 4. Decision logging — non-negotiable

Every non-trivial implementation decision goes into the epic's `implementation-notes.md`, dated, in the repo's format. Trivial choices (local variable names) do not. The orchestrator logs decisions it makes (epic/task selection rationale, verification calls, re-dispatch reasons); the developer logs decisions made during planning and implementation.

## 5. HITL gates — fully autonomous override

`docs/epics/CLAUDE.md` says HITL tasks (`002-001`, `007-003`) must not be self-approved. This command **deliberately overrides that** and self-approves them too. When you do, you MUST log it loudly in `implementation-notes.md` as a decision titled `HITL self-approval` — what gate, what you judged, and on what evidence — so the override is reviewable after the fact. Treat the subjective bar (e.g. "drag feels calm") as something you assess yourself and justify in the log.
