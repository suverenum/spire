# Technical Specification (SPEC) Structure

## 1. Meta Information

- **Branch:**
- **Epic:**
- **PRD:** (link to PRD)

## 2. Context

Briefly summarize the business context, project goals, and the intended outcome. Link to the relevant Product Requirement Document (PRD).

## 3. Key Technical Drivers

Clearly list and explain the main technical priorities and constraints influencing the solution.

- **Driver 1:** Explanation
- **Driver 2:** Explanation
- **Driver N:** Explanation

## 4. Current State

Provide an overview of the current technical state, architecture, and main components, including key technologies and libraries in use.

### 4.1. Component 1

Brief description and technical details.

### 4.N. Component N

Brief description and technical details.

## 5. Considered Options

Outline the different technological solutions or approaches evaluated.

### 5.1. Option 1: \[Option Name]

- **Description:** Briefly describe the option.
- **Pros:** Advantages of this approach.
- **Cons:** Disadvantages or limitations.

### 5.M. Option M: \[Option Name]

- **Description:** Briefly describe the option.
- **Pros:** Advantages of this approach.
- **Cons:** Disadvantages or limitations.

### 5.M+1. Comparison

Summarize the evaluated options in a comparative table:

| Criteria/Driver | Option 1 | ... | Option M |
| --------------- | -------- | --- | -------- |
| Driver 1        | ✔️       | ... | ✔️       |
| Driver 2        | ❌       | ... | ✔️       |
| Driver N        | ✔️       | ... | ❌       |

## 6. Proposed Solution

Detailed description of the chosen technical solution, architecture, main components, technologies, and libraries to be used.

### 6.1. Component 1

Detailed explanation, responsibilities, and technologies.

### 6.K. Component K

Detailed explanation, responsibilities, and technologies.

### 6.K+1. Pros and Cons

Clearly articulate the strengths, potential limitations, and implications of the proposed solution.

- **Pros:** List advantages
- **Cons:** List disadvantages
- **Consequences:** Impacts or trade-offs

## 7. Evaluation Criteria (if RAG/retrieval changes)

If this feature modifies the RAG pipeline (embedding, chunking, reranking, search, or generation), define the evaluation criteria here. The `rag-eval` skill uses these to validate the implementation.

- **Datasets:** Which eval datasets to run (e.g., `sec-10k`, `hotpotqa`, `averitec2`). See `.claude/skills/rag-eval.md` for the full list.
- **Metrics:** Which metrics must improve or not regress, with thresholds (e.g., `ndcg@10 >= 0.38`, `recall@10 no regression > 5%`).
- **Experiment name:** A descriptive name for the DVC experiment run (e.g., `hybrid-search-rrf-weights`).
- **Sample size:** Whether to run on full corpus or a subset (e.g., `SAMPLE = 0.05` for quick validation).

If this feature does not affect the RAG pipeline, remove this section.

## 8. Testing Strategy

Define what needs testing and how. All implementation follows TDD (RED-GREEN-REFACTOR) with a 95% line coverage target.

### 8.1. Unit Tests

List key units to test and critical behaviors to cover.

- **Component/Module 1:** What to test, edge cases
- **Component/Module N:** What to test, edge cases

### 8.2. Integration Tests

Describe integration points that need testing (API boundaries, IPC channels, database interactions).

### 8.3. Coverage Notes

Call out any areas where 95% coverage may not apply (e.g., platform-specific code only testable on CI, generated code, thin wrappers). Justify exceptions.

## 9. Definition of Done

Checklist that must be satisfied before the feature is considered complete. The architect defines feature-specific criteria here; the universal criteria below always apply.

### Universal (always required)

- [ ] All beads tasks under the epic are closed
- [ ] Tests pass (`npm run test`)
- [ ] 95% line coverage on new/changed code (`npm run test:coverage`)
- [ ] TypeScript compiles cleanly (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Spec updated to reflect implementation (`[Updated post-implementation]` if diverged)
- [ ] Spec re-indexed to supermemory
- [ ] RAG evals pass per Section 7 criteria (if applicable — skip if no RAG changes)

### Feature-Specific

Add criteria specific to this feature (e.g., performance benchmarks, accessibility requirements, platform-specific validation, migration scripts tested).

- [ ] Criterion 1
- [ ] Criterion N

## 10. Alternatives Not Chosen

Clearly state the alternatives that were considered but rejected, including reasoning for their rejection.

- **Alternative 1:** Brief reason for rejection.
- **Alternative N:** Brief reason for rejection.

## 11. References

Include references, relevant documentation, benchmarks, or industry best practices that informed this technical decision.

- [Reference 1](URL)
- [Reference N](URL)

---

## Appendix A: Dataset Addition Spec (use instead of Sections 4–6 when adding an eval dataset)

When the spec is about adding a new evaluation dataset to `rag-eval`, replace Sections 4–6 with the structure below. Sections 1–3, 7–11 still apply. See `packages/rag-eval/docs/adding-external-datasets.md` for the full implementation guide.

### A.1. Dataset Overview

- **Name:** Dataset identifier (e.g., `nq`, `fever`)
- **Source:** Where it comes from (HuggingFace, BEIR, custom)
- **Type:** `local` | `huggingface` | `beir` (determines relevance model)
- **Size:** Number of documents, queries, and approximate disk usage
- **Domain:** What kind of content (web pages, scientific papers, tweets, filings, etc.)
- **License:** Usage restrictions if any

### A.2. What They Measured

Describe the original task the dataset was designed for and how relevance is defined:

- **Task:** (e.g., open-domain QA, fact verification, duplicate detection, passage retrieval)
- **Relevance annotations:** How are relevant documents marked? (binary qrels, graded relevance, gold spans, supporting facts, etc.)
- **Annotation method:** (crowdsourced, automatic, expert-labeled)
- **Can we use it?** Does the annotation format map to one of our supported relevance models (`gold_spans`, `qrels`, HuggingFace `context`)? If not, what adapter is needed?

### A.3. Published Benchmarks & Baselines

Reference scores from the original paper or leaderboard for calibration. These are not directly comparable to our setup but provide order-of-magnitude expectations.

| System / Model | Primary Metric | Score | Notes |
|----------------|---------------|-------|-------|
| BM25 baseline  | nDCG@10       | X.XX  | Sparse retrieval |
| State-of-art   | nDCG@10       | X.XX  | Model name, year |
| Our target     | nDCG@10       | X.XX  | Expected range for our embedding + reranker |

### A.4. Integration Plan

- **Prepare script:** What `scripts/prepare_<name>.py` needs to do (download, transform, write corpus/ + questions.jsonl)
- **Profile config:** New entry in `configs/eval-profiles.yaml` — metrics list, generation/judge config if needed
- **Notebook:** New `notebooks/<name>.ipynb` following existing patterns
- **Docker:** Does the dataset need to be baked into the image or downloaded at runtime? (prefer runtime for large datasets)
- **Cost estimate:** Approximate time and cost for a full run and a smoke test (`SAMPLE=0.05`)
- **Smoke test SLA:** Remote smoke test (provision → prepare → ingest → evaluate → terminate) must complete in **under 15 minutes** with a small sample
