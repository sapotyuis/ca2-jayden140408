---
inclusion: fileMatch
fileMatchPattern: "src/db/**,src/models/**,drizzle.config.*"
---

# Database & Models

- libsql client + Drizzle ORM, connection setup in `src/db/connection.js`.
- All table schemas are defined in `src/db/schema.js` — this is the single source of truth for database structure.
- Seed data, seeding function, and database reset logic all live in `src/db/seed.js`. Add new seed inserts there when creating new tables. Running `node src/db/seed.js` (or `npm run db`) deletes the DB file, runs `drizzle-kit push`, and seeds.
- Schema push via `drizzle-kit push` — no migration files. `drizzle.config.js` points to `src/db/schema.js`.
- Model files in `src/models/` contain only CRUD query functions. They import schemas from `src/db/schema.js`. No HTTP concerns in models.
