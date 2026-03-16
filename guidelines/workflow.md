# Product Improvement Building Workflow

This document outlines the steps to build product improvements using Beads for task management and long-form markdown for specifications.

## Workflow Steps

### 1. Create Branch and Epic

Create a git branch for the feature. Initialize Beads if needed (`bd init`). Create a Beads epic:

```bash
bd create "[branch-name] Feature Name" -t epic -p 1
```

Create a spec folder in `/specs/{branch}/` for long-form documents.

### 2. Prepare Product Requirement Document (PRD)

- **Responsible**: Product Manager (Agent)
- **Task**: Write a Product Requirement Document following the [strict PRD format](docs/prd.md) within the spec folder. Name file `requirements.md`. Here is an [example](docs/prd.example.md).
- **Beads**: Link PRD from epic: `bd update {epic-id} --design "PRD: specs/{branch}/requirements.md"`
- **Gate**: User reviews and approves PRD

### 3. Prepare Technical Specification (SPEC)

- **Responsible**: Software Architect (Agent)
- **Task**: Document technical implementation details, system architecture, and engineering design within the spec folder following [strict SPEC format](docs/spec.md). Name file `spec.md`. Here is an [example](docs/spec.example.md).
- **Beads**: Link SPEC from epic: `bd update {epic-id} --design "SPEC: specs/{branch}/spec.md"`
- **Supermemory**: After SPEC is finalized, save key architectural decisions via `super-save` (type: `spec`, branch tag)
- **Gate**: User reviews and approves SPEC

### 4. Decompose into Beads Tasks

- **Responsible**: Engineering / Project Manager (Agent)
- **Task**: Decompose the PRD and SPEC into Beads tasks with dependencies under the epic. Each task gets a discipline prefix (FE:, BE:, TST:, QA:, INFR:) and design context.
- **Hyperpowers**: After creating all tasks, run `sre-task-refinement` on each task to strengthen success criteria and identify corner cases.
- **Output**: Tasks stored in `.beads/`, reviewable via `npx beads-ui start`
- **Gate**: User reviews task breakdown via beads-ui

### 5. Implement Code

- **Responsible**: Software Engineer (Agent)
- **Task**: Execute tasks via `bd ready` → claim → implement → `bd close {id} --reason "..."`. Follow the PRD (requirements), SPEC (technical decisions), and individual task design context.
- **Supermemory**: Task title + close reason are auto-saved by the `supermemory-on-bd-close` hook when using `--reason`. Use `super-save` manually only for significant findings not captured in the close reason (architectural discoveries, performance insights).
- **Coverage target**: 95% line coverage for all new/changed code. Run `npm run test:coverage` and verify before closing tasks.
- **Hyperpowers** (mandatory):
  - `test-driven-development` — RED-GREEN-REFACTOR cycle for all code changes. Write failing tests BEFORE implementation.
  - `verification-before-completion` — evidence before closing any task
- **Hyperpowers** (when applicable):
  - `executing-plans` — batch execution with checkpoints for complex multi-file tasks
  - `refactoring-diagnosis` → `refactoring-design` → `refactoring-safely` — safe refactoring chain
  - `debugging-with-tools` → `root-cause-tracing` → `fixing-bugs` — systematic debugging chain
  - `dispatching-parallel-agents` — for 3+ independent failures

### 5.5. Run RAG Evaluations (if RAG changes)

- **Responsible**: Software Engineer (Agent)
- **When**: After implementation is complete, if the SPEC defines Evaluation Criteria (Section 7)
- **Task**: Run the eval datasets, metrics, and experiment name specified in the SPEC using the `rag-eval` skill (`.claude/skills/rag-eval.md`). Save and push results via DVC.
- **How**: Run notebooks via `python scripts/test_e2e_notebooks.py --notebooks <dataset1> <dataset2>` or use the Python API. See the skill for full instructions.
- **Gate**: Metrics meet the thresholds defined in the SPEC. No regressions >5% in ndcg@10 or >10% in recall@10 vs previous run.

### 5.6. Update Spec (if needed)

- **Responsible**: Software Engineer (Agent)
- **When**: After implementation is complete, before opening PR
- **Task**: Compare `specs/{branch}/spec.md` against implemented code. Update any sections where implementation diverged from the original spec (changed APIs, dropped features, new edge cases). Mark changed sections with `[Updated post-implementation]`.
- **Supermemory**: Re-index updated spec via `super-save` (type: `spec`, branch tag). Run `.claude/hooks/supermemory-mark-indexed.sh`.
- **Gate**: Spec updates are included in the PR for reviewer visibility

### 6. Write and Execute Tests

- **Responsible**: Software Engineer in Test (Agent)
- **Task**: Develop test cases, write automated tests, and verify the implementation meets acceptance criteria. Create test tasks under the epic if not already present. Target 95% line coverage for all new/changed code.
- **Coverage**: Run `npm run test:coverage` and verify 95% line coverage on new/changed files. If below target, add missing tests before closing.
- **Hyperpowers** (mandatory):
  - `test-driven-development` — all test code follows RED-GREEN-REFACTOR cycle
  - `testing-anti-patterns` — prevent common testing mistakes during test writing
  - `analyzing-test-effectiveness` — audit test quality after test tasks complete
  - `verification-before-completion` — mandatory before closing test tasks (same as Phase 5)

### 7. Close Epic

- **Responsible**: Engineering / Project Manager (Agent)
- **Task**: Verify all tasks closed, run `bd compact` to summarize completed work, close epic: `bd close {epic-id} --reason "Feature shipped. See PR #NNN."`
- **Supermemory**: Save epic summary (what was built, key decisions, lessons learned) via `super-save` (type: `architecture`)
- **Hyperpowers**:
  - `review-implementation` — review all implementation against original SPEC
  - `finishing-a-development-branch` — guided closure with integration options
