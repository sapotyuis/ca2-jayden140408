---
inclusion: always
---

# Coding Conventions

- ES Modules only. No CommonJS `require`/`module.exports`.
- Arrow functions only — no `function` keyword declarations. Use `export const name = () => {}` or `export const name = async () => {}`.
- `async/await` for all async operations. No `.then()` callbacks or raw Promise chains.
- No `import * as` or `import { x as y }` — avoid the `as` keyword in imports. Name exports so they can be imported directly.
- Use named imports: `import { findAllTasks } from '...'` — not `import * as model from '...'`.
- Model function names must be verbose and include the resource name (e.g., `findAllTasks`, `removeTask` — not `getAll`, `remove`).
- Error responses are structured: `{ error: { code, message, status } }` using centralized error codes (VALIDATION_ERROR, NOT_FOUND, DATABASE_ERROR, etc.)
- Input validation uses `express-validator`.
- `index.js` exports the app for testing and only calls `listen()` when run directly.
- All API routes must use the `/api` prefix (e.g. `/api/health`, `/api/tasks`, `/api/your-resource`).
