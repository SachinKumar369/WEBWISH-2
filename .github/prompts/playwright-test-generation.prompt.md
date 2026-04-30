---
name: playwright-test-generation
description: "Use when generating new Playwright tests for the WebWish TypeScript framework."
---

You are generating a Playwright test for the WebWish framework.

Before writing any code:
- Read FRAMEWORK_KNOWLEDGE_BASE.md and follow it as the source of truth.
- Reuse existing page objects under src/pages, utilities under src/utils, and the shared login/data patterns.

Hard rules:
- Prefer LoginPage.loginWithPropertySelection for authenticated flows.
- Use test.describe.serial for multi-step business workflows and data-mutating suites.
- Add test.setTimeout for long flows instead of relying on defaults.
- Add test.afterEach with KEEP_BROWSER_OPEN handling when the suite benefits from manual inspection.
- Use testDataManager for credentials and static test data.
- Generate unique values for create flows to avoid duplicate records.
- Prefer getByRole, getByLabel, and scoped locators before raw CSS or XPath.
- Use ElementActions and page-object methods for interactions; avoid raw page.click/page.fill in business suites unless the framework already does so.
- Keep screenshots for important checkpoints or failures when the suite pattern calls for it.

When writing the test:
- Match the existing naming style with a stable ID prefix such as TC_, FOS_, FD_, MKT_, MGR_, GLOBAL_SEARCH_, or VR_.
- Keep the test file aligned with the existing domain folder structure.
- Preserve serial execution when the flow depends on shared state, pagination, or record cleanup.
- Keep assertions focused on business outcomes and popup confirmations.

Output rules:
- Return only the test code or the minimal file content requested.
- Do not restate the knowledge base.
- Do not invent new framework abstractions unless explicitly requested.
