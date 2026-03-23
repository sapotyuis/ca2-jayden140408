---
inclusion: always
---

# Project Overview

Base template for 1st-year programming student assignments. Express.js + libsql + Drizzle ORM backend, plain HTML/CSS/JS frontend.

Full requirements: #[[file:.kiro/specs/student-assignment-template/requirements.md]]

## Key Decisions

- ES Modules (`import`/`export`) throughout. `"type": "module"` in package.json.
- Arrow functions only — no `function` keyword declarations. Use `const name = () => {}` or `const name = async () => {}`.
- No `import * as` or `import { x as y }` — avoid the `as` keyword in imports. Name exports descriptively so aliasing is never needed.
- `async/await` only. No `.then()` callbacks or raw Promise chains.
- Verbose function names that include the resource name (e.g., `findAllTasks`, `removeTask` — not `getAll`, `remove`).
- Strict MVC: models have no HTTP concerns, routes have no business logic, controllers sit between them.
- "Additional Recommendations" in the spec are optional — don't implement unless explicitly asked.
- Don't invent style rules (quotes, semicolons, indentation) beyond what the spec states.
- All code should be beginner-readable. Prefer clarity over cleverness.
- Frontend has a `src/frontend/components/` directory for reusable UI components.
