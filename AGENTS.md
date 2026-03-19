# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Copilot, etc.) working on this codebase.

## Before You Start

1. Read `CLAUDE.md` for project overview and architecture
2. Check `specs/` for product requirements and technical specs
3. Run `bun run typecheck && bun run test` to verify the codebase is healthy

## Code Style

- **Biome** handles linting and formatting. Run `bun run lint:fix` before committing.
- **Tabs** for indentation, **double quotes**, **trailing commas**, **semicolons**
- **No comments** unless the logic is non-obvious
- **No docstrings** unless explicitly requested
- **No emojis** in code or commits unless requested

## Writing Code

- Default to **Server Components**. Only add `"use client"` when you need interactivity
- Keep route files thin — business logic belongs in `src/domain/`
- Each domain is self-contained: `actions/`, `components/`, `hooks/`, `queries/`
- Colocate tests: `component.tsx` + `component.test.tsx` in the same directory
- Use `@/` path alias for app imports, `@goldhord/ui` and `@goldhord/utils` for shared packages

## Writing Tests

- Use Vitest + React Testing Library
- Test behavior, not implementation
- Mock at module boundaries (hooks, actions), not internal functions
- Colocate tests next to source files
- Coverage thresholds: 90% lines/functions/branches/statements

## Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- Keep commits focused — one logical change per commit
- Run `bun run lint && bun run typecheck && bun run test` before committing

## Adding a New Domain

```
src/domain/[name]/
├── actions/           # Server actions
├── components/        # Domain UI (colocated tests)
├── hooks/             # Client-side hooks
└── queries/           # Data fetching (server)
```

## Adding a New Shared Package

1. Create `packages/[name]/` with `package.json`, `tsconfig.json`
2. Name it `@goldhord/[name]`
3. Export raw TypeScript (no build step)
4. Add `workspace:*` dependency in consuming packages
5. Add to `transpilePackages` in `apps/web/next.config.ts`

## Key Files

| File | Purpose |
|---|---|
| `apps/web/src/lib/wagmi.ts` | Wallet config (Tempo WebAuthn) |
| `apps/web/src/lib/tempo/client.ts` | RPC client for Tempo chain |
| `apps/web/src/lib/session.ts` | HMAC-signed session cookies |
| `apps/web/src/lib/constants.ts` | Token addresses, chain config |
| `apps/web/src/db/schema.ts` | Drizzle DB schema |
| `biome.json` | Linting + formatting rules |
| `turbo.json` | Task orchestration config |

## Do NOT

- Add dependencies without checking if they're already available in the workspace
- Create new files when editing existing ones would suffice
- Add error handling for impossible scenarios
- Over-abstract — three similar lines are better than a premature helper
- Skip the pre-commit hooks (`--no-verify`)
- Push directly to `main` without a PR

<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:d4f96305 -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
