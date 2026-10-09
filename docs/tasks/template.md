# Task Batch & Work Session Template

Files in `docs/tasks/` are named sequentially as `NNNN-short-title.md` (e.g. `0001-initial-corrections-oct-05-07.md`, `0002-certificate-handoff-and-access-oct-08-09.md`).

---

## Starter Skeleton

```markdown
# TASK-NNNN: Session Batch — YYYY-MM-DD (Descriptive Theme / Modules)

- **Status:** In Progress | Completed | Deferred
- **Priority:** Critical | High | Medium | Low
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `branch-name` / PR #XX
- **Created:** YYYY-MM-DD HH:MM:SS UTC
- **Started:** YYYY-MM-DD HH:MM:SS UTC
- **Ended:** YYYY-MM-DD HH:MM:SS UTC | In Progress
- **Duration:** X hr Y mins | In Progress

> **How to tick:** change `[ ]` to `[x]`. The table shows the characters, not a clickable box.

---

## 1. Objective

Brief 1-2 sentence description of what this session/batch accomplishes across active modules.

---

## 2. Work Breakdown (Grouped by Module)

### Module A: <Module Name>

- [ ] Task 1 description
- [ ] Task 2 description

### Module B: <Module Name>

- [ ] Task 1 description
- [ ] Task 2 description

### Module C: <Module Name>

- [ ] Task 1 description

---

## 3. Unified Verification Gates

- [ ] `tsc --noEmit` clean
- [ ] `npm test` / `vitest run` clean
- [ ] Build / preview check succeeds
- [ ] Guarded data migration / SQL assertion verified

---

## 4. Deliverables

- **Commits:** `<commit-hash-1>`, `<commit-hash-2>`
- **PR:** #XX
- **Artifacts / Backups:** `out/...`
```

---

## Rules of Thumb

### Use the Same Batch File When:

- Tasks are worked on in the same session, day, or sprint window.
- They ship together in the same PR or release train.
- They share a common quality gate (`tsc`, `vitest`, `lint`).
- Cross-module polish, housekeeping, or contemporaneous bug fixes.

### Start a New Numbered File When:

- A PR is merged and you start a new branch or feature track.
- The scope represents a fundamentally distinct future milestone or large architectural effort.
- A major architectural pivot occurs.

---

## Workflow Integration

- **`current-tasks.md` (Live Dashboard):** Serves as your active HUD while coding. Holds the checklist of everything actively being touched right now across modules during the current session, complete with Started and Ended times.
- **Sequential Batch Files (`0001-...md`, `0002-...md`):** Each file permanently preserves a coherent session, sprint, or PR batch with full audit history and outcomes.
