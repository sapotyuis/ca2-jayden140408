---
inclusion: fileMatch
fileMatchPattern: "_extras/tests/**,vitest.config.*,**/*.test.js"
---

# Testing

- Vitest + Supertest. Tests in `_extras/tests/` directory.
- Vitest supports ESM directly, so no `--experimental-vm-modules` flag is required.
- Tests import the app from `index.js` (which exports without listening) and use supertest against it.
