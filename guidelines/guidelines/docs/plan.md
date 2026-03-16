> **DEPRECATED** — Implementation plans are now created as Beads tasks
> with dependencies instead of markdown documents. See `guidelines/workflow.md`
> for the current workflow. This template is preserved for historical reference.

# Plan (PLAN) Structure

## 1. Meta Information

- **Created Date:**
- **Implemented Date:**
- **Ticket ID:**
- **Branch:**
- **PRD:** \[link-to-prd]
- **SPEC:** \[link-to-spec]

## 2. User stories

### 2.1. User story 1: \[Name 1]

As a \[role], I want \[goal], so that \[benefit].

#### 2.1.1. Acceptance criteria

```
Given [initial state],
When [action],
Then [expected result]
```

(Repeat for each condition)

#### 2.1.2. Tasks

| Name              | Type | Estimate (hrs) |
| ----------------- | ---- | -------------- |
| FE: Build UI form | FE   | 2              |
| BE: Add API route | BE   | 3              |
| TXT: Write labels | TXT  | 1              |
| TST: Write tests  | TST  | 2              |
| QA: Manual check  | QA   | 1              |
| INFR: Install SDK | INFR | 0.5            |

(Repeat this structure for each story)

### 2.N. User story N: \[Name N]

...

## 3. Roadmap

### 3.1. Critical path

List tasks/stories that are on the critical path, including justification. For example:

- "BE: Add Google OAuth" is critical because FE can't proceed without the auth tokens.
- "INFR: Set up OAuth credentials" blocks all auth-related tasks.

### 3.2. Backlog

Final ordered list of all planned tasks:

| #   | Type | Name                  | Importance | Estimate (hrs) |
| --- | ---- | --------------------- | ---------- | -------------- |
| 1   | BE   | Add OAuth endpoint    | Must       | 3              |
| 2   | INFR | Configure credentials | Must       | 1              |
| 3   | FE   | OAuth login button    | Should     | 2              |
| 4   | QA   | Test login flow       | Must       | 1              |

## 4. Whole Project Estimate

Summarize the total scope of effort across all tasks:

| Type      | Total Hours |
| --------- | ----------- |
| FE        | X hrs       |
| BE        | Y hrs       |
| TXT       | Z hrs       |
| TST       | A hrs       |
| QA        | C hrs       |
| INFR      | D hrs       |
| **Total** | **Sum** hrs |

Break down effort by role or time frame as needed for planning and resourcing.

---

> Aim to keep stories tight and testable. Each task should be no larger than \~2–3 hours.
> Always review alignment with the PRD/SPEC and confirm edge cases, risks, and dependencies.
