# Student Assignment Template

Express.js + libsql + Drizzle ORM starter with no example feature code.

## Quick Start

```bash
npm install
npm run db
npm run dev
```

Open:

- `http://localhost:3000` (starter frontend page)
- `http://localhost:3000/api/health` (health check)
- `http://localhost:3000/api-docs` (Swagger docs)

## What Is Included

- Express server setup with middleware in `index.js`
- Database connection + Drizzle setup in `src/db/connection.js`
- Empty schema/seed starter files in `src/db/schema.js` and `src/db/seed.js`
- Shared error utilities in `src/utils/_errors.js`
- Basic infrastructure tests for health + errors in `_extras/tests/`

## Build Your Feature

1. Define tables in `src/db/schema.js`.
2. Add seed data in `src/db/seed.js`.
3. Run `npm run db` to recreate the database.
4. Create your model, controller, and route files under `src/models`, `src/controllers`, and `src/routes`.
5. Register your routes in `index.js` before the error handler.
6. Build your frontend pages in `src/frontend/`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon |
| `npm run db` | Reset database and run seed script |
| `npm test` | Run test suite |
| `npm run export` | Create `export.zip` for submission |
