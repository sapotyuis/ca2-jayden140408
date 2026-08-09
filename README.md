# Castaway Chronicles

A raft-survival game with an Express + libSQL/Drizzle REST API and a vanilla JavaScript (Vite) frontend,
connected by JWT auth. Sweep the night ocean for debris, survive what the sea throws at you,
craft and upgrade your raft, and work a board of quests that advance as you play.

## Game Theme

You wake adrift on the open ocean clinging to a few planks of driftwood. In **Castaway
Chronicles** you rebuild by sweeping floating debris for raw materials, crafting tools and gear,
and applying structural upgrades that grow your raft plank by plank. A bigger raft casts a wider
net — every debris run rewards more — so survival compounds into growth. The sea fights back:
sharks, tsunamis, and downpours strike unannounced and cost you cargo unless you have built the
    defence that stops them. You sail in a real third-person 3D view, and back at camp a
quest board tracks objectives that tick up automatically as you play, paying out materials and
gear when you claim them.

## Two core mechanics

- **Core Mechanic 1 — the raft-building loop.** Collect debris → earn materials → craft items and
  buy raft upgrades → a bigger raft yields more per run. Debris collection happens live in the 3D
  ocean; crafting and upgrades happen at camp.
- **Core Mechanic 2 — the quest system.** Repeatable objectives (`collect_debris`, `survive_event`)
  whose progress advances **as a side effect of playing** — collecting debris or surviving an event
  automatically ticks matching quests server-side — and whose rewards feed materials and items back
  into the loop when claimed. The two mechanics interact in both directions: playing Mechanic 1
  drives quest progress, and quest rewards fuel more of Mechanic 1. A quest can also gate itself
  behind `min_raft_size`, so Mechanic 1's progression decides which quests are reachable at all.

Two supporting systems tie the loop together:

- **Server-owned debris.** Debris is not invented by the browser. The server spawns rows into the
  `debris` table for each survivor (`GET /api/me/debris`), and collection claims one row by id
  (`POST /api/me/debris/:debris_id/collect`). A row can only be claimed once, and every attempt —
  accepted or rejected — is written to `debris_collection_logs`. The client cannot mint materials.
- **Unexpected ocean events.** Shark attacks, tsunamis, and heavy downpours are rolled from the
  `ocean_events` catalogue during a voyage and resolved at `POST /api/me/unexpected-events/resolve`.
  Each one takes an item out of your hold — unless you own the matching defensive upgrade, or the
  hold is empty of what it wanted — and each has a cooldown the server enforces with a `429`.
  Surviving one advances `survive_event` quests.

## Architecture

```
├─ index.js               # Express app entry: mounts API routers, serves the built frontend
├─ src/                   # backend (MVC)
│  ├─ routes/             #   URL + method → validation → controller
│  ├─ controllers/       #   HTTP handlers plus route-specific gameplay controller steps
│  ├─ models/             #   Drizzle data-access functions (the only files that touch the DB)
│  ├─ middlewares/        #   reusable auth, validation, logging, and transaction middleware
│  ├─ db/                 #   schema.js, connection.js, seed.js
│  ├─ config/             #   gameRules.js — upgrade costs and valid event types
│  └─ utils/              #   error handler, debris spawning, quest/upgrade progression rules
└─ frontend/              # Vanilla JavaScript + Vite app (its own npm project)
   ├─ html/               #   index/login, register, camp, leaderboard, voyage entry documents
   ├─ css/                #   global tokens and page/component styles
   └─ js/                 #   page renderers, stores, API client, and Three.js scene
```

`src/middlewares` holds reusable auth, validation, logging, and transaction middleware. The
gameplay controller steps live in `src/controllers/gameplayStepsController.js`: each step performs
one model operation, stores its result in `res.locals`, and calls `next()`; the common transaction
coordinator commits only after every step succeeds.
`loadCurrentUser` deliberately lives in `src/controllers/meController.js` instead: it queries one
specific resource (the current survivor) rather than providing a general capability, so it is
controller middleware, not common middleware.

## Database

Eleven tables. `users` is the root; every gameplay table reaches back to it by foreign key.

| Table                     | What it holds                                                        |
| ------------------------- | -------------------------------------------------------------------- |
| `users`                   | Survivor account, bcrypt password hash, `materials`, `raft_size`      |
| `item_types`              | Catalogue of every item in the game (name, category, rarity)          |
| `user_items`              | A survivor's inventory rows → `users`, `item_types`                   |
| `debris`                  | Server-spawned floating debris; `claimed_at` makes it claimable once  |
| `debris_collection_logs`  | Audit trail of every collection attempt, accepted or rejected         |
| `crafting_recipes`        | Ingredient → result mappings between `item_types`                     |
| `raft_upgrades`           | History of upgrades a survivor has applied → `users`                  |
| `quests`                  | Quest catalogue: type, target, rewards, `min_raft_size` gate          |
| `user_quests`             | Per-survivor progress and claim state (unique per user + quest)       |
| `ocean_events`            | Catalogue of ocean events, including the unexpected hazards           |
| `user_events`             | History of events a survivor has encountered → `users`, `ocean_events`|

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

`JWT_SECRET_KEY` must be set before the first login — it signs every token.

### 2. Frontend (Vite dev server on http://localhost:5173)

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
cd frontend && npm run build && cd ..   # builds into ../public
npm run dev                             # backend now also serves the built app on :3000
```

Then open **http://localhost:3000**. (`public/` is a build artefact and is git-ignored.)

### Seeded logins

`npm run db` drops the database, recreates it from `src/db/schema.js`, and seeds three survivors:

| Username      | Password        | State                                                          |
| ------------- | --------------- | -------------------------------------------------------------- |
| `SurvivorJay` | `password123`   | Fresh start — raft size 1, 0 materials, one Floor Extension     |
| `Ocean`       | `password1234`  | Mid-game — raft size 3, 50 materials, Floor Extension + Sail    |
| `Rafter`      | `password12345` | Late-game — raft size 8, 200 materials, all three growth upgrades |

None of the seeded survivors own a defensive upgrade, so unexpected events will cost them cargo
until they buy one — that is the intended first lesson of the loop.

### Scripts

| Where       | Command           | What it does                              |
| ----------- | ----------------- | ----------------------------------------- |
| root        | `npm run dev`     | Start the API (nodemon auto-reload)       |
| root        | `npm run db`      | Drop, recreate, and reseed the database   |
| root        | `npm test`        | Run the test suite (Vitest)               |
| `frontend/` | `npm run dev`     | Start the Vite dev server (proxies `/api`)|
| `frontend/` | `npm run build`   | Build the production bundle to `../public`|

API docs (Swagger): http://localhost:3000/api-docs

## API overview

Auth issues a JWT on login; protected routes require `Authorization: Bearer <token>` and reject
anything else with `401`. Passwords are hashed with bcrypt and never returned in any response.

### Auth — public

| Method | Route                 | Purpose                                        |
| ------ | --------------------- | ---------------------------------------------- |
| POST   | `/api/auth/register`  | Create a survivor. `409` if the name is taken   |
| POST   | `/api/auth/login`     | Returns a JWT on success                        |

### The logged-in survivor — every route requires a token and acts on the token's owner

| Method | Route                                  | Purpose                                  |
| ------ | -------------------------------------- | ---------------------------------------- |
| GET    | `/api/me`                              | Own profile                              |
| PATCH  | `/api/me`                              | Rename the survivor (`409` on conflict)  |
| DELETE | `/api/me`                              | Abandon the raft (`204`)                 |
| GET    | `/api/me/status`                       | Whole progression state in one call      |
| GET    | `/api/me/inventory?category=`          | Inventory, optionally filtered           |
| GET    | `/api/me/upgrades`                     | Upgrade history                          |
| GET    | `/api/me/quests`                       | Quest board with own progress merged in  |
| GET    | `/api/me/collection-logs`              | Recent debris attempts + time between    |
| GET    | `/api/me/debris`                       | Currently spawned, unclaimed debris      |
| GET    | `/api/me/unexpected-events`            | Hazard catalogue for the HUD             |
| POST   | `/api/me/debris/:debris_id/collect`    | Claim one debris row (`409` if gone)     |
| POST   | `/api/me/unexpected-events/resolve`    | Resolve a hazard (`429` while cooling down) |
| POST   | `/api/me/craft`                        | Craft from a recipe                      |
| POST   | `/api/me/upgrade-raft`                 | Buy an upgrade                           |
| POST   | `/api/me/quests/:quest_id/claim`       | Claim a completed quest's reward         |

### Public survivor directory — read-only, no token

| Method | Route                                     | Purpose                          |
| ------ | ----------------------------------------- | -------------------------------- |
| GET    | `/api/users?search=&raft_size=`           | Filterable survivor list         |
| GET    | `/api/users/leaderboard`                  | Top five by raft size, then materials |
| GET    | `/api/users/:user_id`                     | One survivor's public profile    |

There is no `POST/PATCH/DELETE /api/users` — creating a survivor is `POST /api/auth/register`,
and changing or deleting one is `PATCH`/`DELETE /api/me`, which act on the token's owner.

### Catalogues and records — reads are public, writes require a token

Each of these exposes the full `GET /` (filterable), `GET /:id`, `POST /`, `PATCH /:id`,
`DELETE /:id` set:

| Resource                 | Query filters on `GET /`                          |
| ------------------------ | ------------------------------------------------- |
| `/api/item-types`        | `?category=`, `?search=`                          |
| `/api/crafting-recipes`  | `?result_item_type_id=`, `?ingredient_item_type_id=` |
| `/api/quests`            | `?quest_type=`                                    |
| `/api/ocean-events`      | `?event_type=`                                    |
| `/api/user-items`        | `?user_id=`, `?category=`                         |
| `/api/raft-upgrades`     | `?user_id=`, `?upgrade_type=`                     |
| `/api/user-quests`       | `?user_id=`, `?quest_id=`, `?status=`             |
| `/api/user-events`       | `?user_id=`, `?event_id=`                         |

Writes to `/api/user-quests` and `/api/user-events` additionally check that the row belongs to
the authenticated survivor and return `404` if it does not.

### Status codes

`200` reads and successful actions · `201` created · `204` deleted · `400` validation ·
`401` missing/invalid/expired token · `404` not found · `409` conflict (duplicate username,
already-claimed debris or quest) · `429` event cooldown · `500` unexpected. Errors come back as
`{ error: { code, message, status } }` from the central handler in `src/utils/_errors.js`.

## Assumptions

- **Materials pool.** `materials` is a single integer per survivor — a generic pool of crafting
  resources rather than individual stacks. Simplifies the model without losing the core loop.
- **Two kinds of upgrade.** Growth upgrades are repeatable and raise `raft_size`: Floor Extension
  (10 materials, +1), Sail (20, +2), Net Launcher (35, +3) — each visibly reshapes the 3D raft.
  Defensive upgrades are one-time, add no size, and each cancels exactly one hazard: Spear Rack
  (30) stops shark attacks, Roof (35) stops downpours, Shelter (45) stops tsunamis. Costs live in
  `src/config/gameRules.js` so route validation and controller logic can never disagree.
- **Raft size as score.** `raft_size` doubles as leaderboard rank and as the gate on which quests
  and ocean events a survivor can reach.
- **Server authority.** The client never reports what it found or how far a quest has come. Debris
  is spawned and claimed server-side, quest progress is a side effect of the action routes, and
  event outcomes are rolled on the server — so nothing in the browser can be edited into free
  materials.
- **Atomic gameplay writes.** Collect, craft, upgrade, quest-claim, and event-resolve each commit
  their several DB changes in a single transaction — a failure leaves nothing half-applied, and an
  unaffordable action changes nothing.
- **Catalogue writes are token-gated, not role-gated.** There is no admin role in the game, so any
  authenticated survivor can write to the catalogue routes (`/api/item-types`, `/api/quests`, …).
  They exist to demonstrate full CRUD; the game itself never calls them.
- **Surrogate integer primary keys.** `user_id` is an autoincrement `integer` PK assigned by the
  database, not derived from the username. It carries no meaning, so renaming a survivor cannot
  make it stale and there is nothing to cascade to the tables that reference it. `username` is the
  mutable label; `user_id` is the immutable identity. `debris_id` is the deliberate exception — it
  is a `text` UUID, because clients name debris in the URL and sequential integers there would let
  one player probe another's unclaimed debris.
- **Auth token in localStorage.** The frontend stores the JWT in `localStorage` so a refresh keeps
  you signed in. A rejected token (`401`) clears the session in one place — `AuthContext` — and
  `<RequireAuth>` bounces the user back to sign-in on the next render.
