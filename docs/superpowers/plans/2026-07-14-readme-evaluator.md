# HumouR Evaluator README Implementation Plan

> **For Codex:** Execute this plan in the current session and verify every repository-relative link before completion.

**Goal:** Rewrite the root README so evaluators can quickly assess HumouR as an end-to-end service while verifying its custom sLLM, operational safeguards, measured results, and known limitations.

**Architecture:** Use an evidence-first narrative. Keep claims traceable to repository code or persisted notebook outputs, distinguish implemented and planned scope, and use compact Mermaid diagrams for service flow, runtime architecture, analysis state graph, and data relationships.

**Tech Stack:** GitHub-flavored Markdown, Mermaid, repository-relative links.

---

### Task 1: Build the evaluator narrative

**Files:**
- Modify: `README.md`
- Reference: `docs/00-overview/`, `docs/02-architecture/`, `docs/07-ai-modeling/`, `docs/09-deployment/`

1. Replace the existing opening with the HumouR logo, one-line product definition, and evaluator summary.
2. Present the problem, solution, user journey, and implemented feature boundary before implementation details.
3. Preserve the principle that AI supports, rather than replaces, a human hiring decision.

### Task 2: Document implementation evidence

**Files:**
- Modify: `README.md`
- Reference: `backend/`, `frontend/`, `database/`, `runpod/`, `.deploy/`, `.github/workflows/`

1. Add runtime and LangGraph diagrams that match actual code paths.
2. Explain custom EXAONE LoRA masking/STAR models and OpenAI fallback without overstating model ownership.
3. Summarize async execution, failure recovery, auth boundaries, data contracts, deployment, data collection, database models, and API surfaces.

### Task 3: Add measured results and honest boundaries

**Files:**
- Modify: `README.md`
- Reference: `llm/eval/`, `llm/train_star_masking/`

1. Report persisted offline metrics with sample sizes and notebook paths.
2. Include prompt/version sensitivity, masked-input information loss, and low-sample caveats.
3. Separate current implementation, known limitations, and future work.

### Task 4: Make the project reproducible

**Files:**
- Modify: `README.md`
- Reference: `backend/requirements.txt`, `frontend/package.json`, `frontend/.env.example`, `docs/01-getting-started/`

1. Add concise local setup, environment variables, run, test, and optional external-service guidance.
2. Link the interface definition workbook and detailed documentation.
3. Add a contribution table based on repository ownership and implementation evidence.

### Task 5: Verify the documentation change

**Files:**
- Verify: `README.md`

1. Parse Markdown links and confirm every repository-relative target exists.
2. Run `git diff --check`.
3. Review the rendered structure, diagrams, metric labels, and implemented/planned wording against the source files.
4. Report documentation-only verification; do not imply application tests were rerun unless they actually were.
