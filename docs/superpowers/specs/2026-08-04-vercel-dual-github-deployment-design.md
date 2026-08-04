# Castaway Chronicles: Vercel and Dual-Git Deployment Design

## Goal

Deploy the complete Castaway Chronicles application from the personal GitHub repository
`sapotyuis/ca2-jayden140408` while keeping the existing school repository
`AY26S1-ST0503/ca2-jayden140408` synchronized. A local commit should push the current branch
to both repositories, and pushes to `main` in the personal repository should automatically
create a new Vercel production deployment.

## Current constraints

- The repository contains an Express API at the project root and a React/Vite frontend in
  `frontend/`.
- The current server starts listening as soon as `index.js` is imported, which is suitable for
  local development but needs an app-only export for a serverless deployment.
- The current database defaults to `file:local.db`. A Vercel Function filesystem is not a
  durable shared database, so production must use a remote libSQL database.
- The working tree already contains unrelated user changes. Implementation must not discard,
  stage, or commit those changes.
- GitHub and Vercel authentication are external account actions. Repository configuration can
  be prepared locally, but creating the personal repository, granting Vercel access, adding
  secrets, and the first authenticated push may require the user.

## Approved architecture

### Application deployment

Use one Vercel project connected to the personal GitHub repository. Keep the existing Express
route structure and React application, but separate application construction from local process
startup:

1. Export the configured Express app without calling `listen()`.
2. Keep `index.js` as the local development entry point that imports the app and starts the
   server.
3. Configure Vercel to build `frontend/` and serve its static output while routing `/api/*`
   requests to the Express application running as a Vercel Node.js Function.
4. Preserve SPA fallback behavior for client-side routes such as `/camp` and `/voyage`.

Vercel supports deploying an Express application as a Node.js Function and supports a Vite
build output directory and rewrites through `vercel.json`.

### Production database

Use Turso/libSQL for production because the project already uses `@libsql/client` and Drizzle's
libSQL adapter. The connection layer will continue to support `file:local.db` for local
development and will accept a remote URL plus authentication token in Vercel.

Production environment variables:

- `DATABASE_URL` — the Turso/libSQL database URL.
- `DATABASE_AUTH_TOKEN` — the database token; never commit it.
- `JWT_SECRET_KEY` — a long random signing secret; never commit it.
- `JWT_EXPIRES_IN` — the existing token lifetime, such as `1h`.
- `JWT_ALGORITHM` — the existing signing algorithm, such as `HS256`.
- `NODE_ENV=production`.

The database is initialized once outside the deployment build using the existing schema/seed
workflow. Deployments must not reseed or reset the production database, because that would erase
player progress and create duplicate seed data.

### Git synchronization

Keep the school repository as the existing `origin` remote and add the personal repository as a
second remote. Add a tracked post-commit hook and configure this checkout to use the repository's
`.githooks` directory. The hook pushes the newly committed branch to both remotes and reports
which push failed if either credential or repository access is unavailable.

The hook cannot undo a commit if a network push fails; the commit remains locally available and
can be pushed manually after authentication is fixed. Authentication itself will use the user's
configured GitHub credentials (SSH or personal-access-token-backed HTTPS), never credentials
stored in the repository.

The hook will apply to this checkout after setup. A fresh clone must opt into the tracked hooks
directory explicitly, so the README will document the one-time setup command.

### Vercel deployment flow

```text
local commit
    ↓
post-commit hook
    ├── push school/main
    └── push personal/main
                    ↓
        Vercel GitHub integration
                    ↓
      install → build frontend → deploy
                    ↓
        production site updated
```

Vercel's production branch will be `main`. A push to another branch can create a Vercel Preview
Deployment if branch previews remain enabled, while a push to `main` updates the production
deployment.

## Error handling and safety

- Do not commit `.env`, database tokens, JWT secrets, `local.db`, or Vercel-generated metadata.
- Fail the deployment build if the frontend build fails.
- Keep API errors behind the existing Express error middleware.
- Do not run database reset/seed commands as part of Vercel's build command.
- If one Git push fails, print the failing remote and leave the local commit intact.
- Do not alter or stage existing unrelated working-tree modifications.

## Verification plan

Local verification will include:

1. Root dependency installation and the existing Vitest suite.
2. A production frontend build.
3. A local server/API health check using the exported Express app and local database.
4. Validation that the Vercel configuration parses and points to the intended build output and
   API route.
5. Inspection of Git remotes, hook configuration, and the final diff.

External verification, which depends on the user's account access, will be:

1. Personal repository exists and accepts a push.
2. Vercel project is connected to the personal repository.
3. Vercel production environment variables are present.
4. The initial production deployment succeeds and `/api/health` responds.
5. A later test commit appears in both GitHub repositories and produces a new Vercel deployment.

## Sources

- Vercel Express deployment: https://vercel.com/docs/frameworks/backend/express
- Vercel Git deployments: https://vercel.com/docs/git/vercel-for-github
- Vercel project configuration: https://vercel.com/docs/project-configuration/vercel-json
- Turso/libSQL with Drizzle: https://docs.turso.tech/sdk/ts/orm/drizzle
