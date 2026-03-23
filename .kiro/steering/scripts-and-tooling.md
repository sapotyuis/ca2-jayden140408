---
inclusion: fileMatch
fileMatchPattern: "_extras/api-docs/**,_extras/nodemon.json,package.json,.eslintrc*,.prettierrc*,.vscode/**"
---

# Scripts & Tooling

- `npm run db` runs `node src/db/seed.js` to reset and seed the database.
- `npm run dev` starts the dev server with nodemon (config at `_extras/nodemon.json`).
- `npm test` runs Jest with `--roots=_extras/tests` to find test files.
- `GET /api/health` returns 200 with JSON body.
- `_extras/api-docs/swagger.js` handles Swagger auto-generation and UI setup. It is imported by `index.js` on startup.
- Dev server must show clear error on port conflict.
- `.vscode/extensions.json`: recommend SQLite viewer + REST Client extensions.
