# Castaway Chronicles

A raft-survival game with an Express + libSQL/Drizzle REST API and a React (Vite) frontend,
connected by JWT auth. Sweep the night ocean for debris, craft and upgrade your raft, and work
a board of quests that advance as you play.

## Game Theme

You wake adrift on the open ocean clinging to a few planks of driftwood. In **Castaway
Chronicles** you rebuild by sweeping floating debris for raw materials, crafting tools and food,
and applying structural upgrades that grow your raft plank by plank. A bigger raft casts a wider
net — every debris run rewards more — so survival compounds into growth. You sail the ocean in a
real 3D view (first- or third-person), and back at camp a quest board tracks objectives that tick
up automatically as you collect and craft, paying out materials and gear when you claim them.

## Two core mechanics

- **Core Mechanic 1 — the raft-building loop.** Collect debris → earn materials → craft items and
  buy raft upgrades → a bigger raft yields more per run. Debris collection happens live in the 3D
  ocean; crafting and upgrades happen at camp.
- **Core Mechanic 2 — the quest system.** Repeatable objectives (`collect_debris`, `craft_food`,
  `survive_event`) whose progress advances **as a side effect of playing** — collecting or crafting
  automatically ticks matching quests server-side — and whose rewards feed materials and items back
  into the loop when claimed. The two mechanics interact: playing Mechanic 1 drives quest progress,
  and quest rewards fuel more of Mechanic 1.

## Architecture

```
├─ index.js               # Express app entry: mounts API routers, serves the built frontend
├─ src/                   # backend (MVC)
│  ├─ routes/             #   URL + method → controller
│  ├─ controllers/        #   HTTP request/response handling
│  ├─ models/             #   Drizzle data-access functions
│  ├─ middlewares/        #   bcrypt, JWT, current-user, validation
│  ├─ db/                 #   schema.js, connection.js, seed.js
│  ├─ config/             #   game-balance constants
│  └─ utils/              #   shared error handling
└─ frontend/              # React + Vite app (its own npm project)
   ├─ src/pages/          #   login, register, camp (dashboard), voyage (3D)
   ├─ src/components/     #   design-system + game panels
   ├─ src/hooks/          #   game state, count-up
   ├─ src/context/        #   auth session
   ├─ src/lib/            #   API client
   └─ src/ocean/          #   framework-agnostic Three.js scene
```

## Setup & Run

### Prerequisites

- Node.js 18 or later, and npm.

### 1. Backend (API on http://localhost:3000)

```bash
# from the repo root
cp .env.example .env      # then set a long random JWT_SECRET_KEY
npm install               # install backend dependencies
npm run db                # create + seed the SQLite database (local.db)
npm run dev               # start the API with auto-reload (port 3000)
```

### 2. Frontend (React dev server on http://localhost:5173)

In a **second terminal**:

```bash
cd frontend
npm install               # install frontend dependencies
npm run dev               # start Vite (port 5173) — it proxies /api to the backend
```

Open **http://localhost:5173** and sign in. The Vite dev server proxies every `/api` request to
the backend on port 3000, so the two run side by side with no CORS setup needed.

### Optional: one-server production build

To serve everything from the backend on a single origin (no second terminal):

```bash
cd frontend && npm run build && cd ..   # builds frontend/dist
npm run dev                              # backend now also serves the built app on :3000
```

Then open **http://localhost:3000**. (`frontend/dist` is a build artefact and is git-ignored.)

### Seeded logins

`npm run db` creates three survivors you can sign in with:

| Username      | Password         | State                                    |
| ------------- | ---------------- | ---------------------------------------- |
| `SurvivorJay` | `password123`    | Fresh start (raft size 1, no upgrades)   |
| `Ocean`       | `password1234`   | Mid-game (raft size 3, Sail installed)   |
| `Rafter`      | `password12345`  | Late-game (raft size 8, all upgrades)    |

### Scripts

| Where       | Command           | What it does                              |
| ----------- | ----------------- | ----------------------------------------- |
| root        | `npm run dev`     | Start the API (nodemon auto-reload)       |
| root        | `npm run db`      | Drop, recreate, and reseed the database   |
| root        | `npm test`        | Run the backend test suite (Vitest)       |
| `frontend/` | `npm run dev`     | Start the Vite dev server (proxies `/api`)|
| `frontend/` | `npm run build`   | Build the production bundle to `dist/`    |

API docs (Swagger): http://localhost:3000/api-docs

## API overview

Auth issues a JWT on login; protected routes require `Authorization: Bearer <token>`. Passwords
are hashed with bcrypt and never returned in any response.

| Area              | Routes                                                         |
| ----------------- | -------------------------------------------------------------- |
| Auth              | `POST /api/auth/register`, `POST /api/auth/login`              |
| The logged-in survivor | `GET/PATCH/DELETE /api/me`, `GET /api/me/status`, `/inventory`, `/upgrades`, `/quests` |
| Gameplay actions  | `POST /api/me/collect-debris`, `/craft`, `/upgrade-raft`, `/quests/:id/claim` |
| Catalogues (public reads, token-gated writes) | `/api/item-types`, `/api/crafting-recipes`, `/api/quests`, `/api/ocean-events` |
| Records           | `/api/user-items`, `/api/raft-upgrades`, `/api/user-quests`, `/api/user-events` |

Every survivor-specific action lives under `/api/me` and acts on the token's owner, so one player
can never mutate another's raft.

## Assumptions

- **Materials pool.** `materials` is a single integer per survivor — a generic pool of crafting
  resources rather than individual stacks. Simplifies the model without losing the core loop.
- **Raft size as progression.** `raft_size` doubles as score and drives debris yield. Upgrades grant
  Floor Extension (+1), Sail (+2), Net Launcher (+3), and each visibly reshapes the 3D raft you sail.
- **Atomic gameplay writes.** Collect, craft, upgrade, and quest-claim each commit their several DB
  changes in a single transaction — a failure leaves nothing half-applied, and an unaffordable
  action changes nothing.
- **Quests advance server-side.** Progress is a side effect of the gameplay actions (collecting
  advances `collect_debris`, crafting food advances `craft_food`), so the client never has to track
  or report progress by hand; it only claims finished quests.
- **Hunger is not auto-decayed.** A stateless REST API has no clock, so `hunger` changes only through
  explicit actions, not a background timer.
- **Varchar primary keys.** `user_id` is a `text` PK auto-generated as `rafter_<username>`; it is
  assigned once at registration and never recomputed (a moving PK would invalidate live JWTs).
- **Auth token in localStorage.** The frontend stores the JWT in `localStorage`; a rejected token
  (401) ends the session and returns the user to sign-in.
