# Castaway Chronicles

Castaway Chronicles is a raft-survival game built with an Express REST API, a libSQL/SQLite
database managed by Drizzle ORM, and a vanilla JavaScript frontend served directly by Express.

The player collects floating debris, earns materials, crafts equipment, expands and protects a
raft, completes quests, survives ocean events, and competes on a public leaderboard.

## Current gameplay

1. Register or sign in as a survivor.
2. Use the raft camp to view status, quests, inventory, crafting, upgrades, and profile details.
3. Start a voyage and control the raft in a third-person Three.js ocean scene.
4. Collect server-owned debris. Each debris row can only be claimed once.
5. Spend materials on crafting recipes and raft upgrades.
6. Respond to unexpected events such as shark attacks, tsunamis, and heavy downpours.
7. Return to camp to claim completed quest rewards.
8. View the public leaderboard, ranked by raft size and then materials.

The current game does not use hunger, food items, or a hunger consequence system. Survival is
represented by energy, raft progression, cargo loss from hazards, defensive upgrades, quests, and
the leaderboard.

## Main game systems

### Raft-building loop

Debris collection provides materials and items. Materials can be used for crafting or raft
upgrades. Growth upgrades increase `raft_size`, which is also used for leaderboard ranking and
some quest/event gates. Defensive upgrades prevent specific hazards from taking cargo.

### Quest system

Quest progress is advanced by gameplay actions on the server. Collecting debris advances
`collect_debris` quests, while surviving an event advances `survive_event` quests. Completed quests
are claimed from the camp quest board and can reward materials or items.

### Server-owned debris

The browser does not decide what it collected or how many materials it receives. The API spawns
debris for the authenticated survivor, validates a collection by `debris_id`, updates the
inventory/materials, and records every accepted or rejected attempt in
`debris_collection_logs`.

### Unexpected ocean events

During a voyage, the frontend loads unexpected-event definitions from the API. The server resolves
the outcome, applies any cargo loss or reward, records the event, enforces its cooldown, and
advances the relevant quest progress. A matching defensive upgrade can prevent the cargo loss.

## Project structure

```text
.
├── index.js                         # Express entry point and static frontend server
├── package.json                     # Backend scripts and dependencies
├── src/
│   ├── config/gameRules.js          # Upgrade costs and valid event/upgrade types
│   ├── controllers/                 # HTTP controllers and controller middleware steps
│   ├── db/
│   │   ├── connection.js            # libSQL/SQLite connection
│   │   ├── schema.js                # Drizzle table definitions
│   │   └── seed.js                  # Reset-safe database seed
│   ├── middlewares/                 # Shared auth, validation, logging, and transactions
│   ├── models/                      # Database access functions
│   ├── routes/                      # Endpoints, validation, and controller pipelines
│   └── utils/                       # Errors, debris, quest, and upgrade helpers
└── public/                          # Frontend served directly by Express
    ├── html/                        # Page entry documents
    ├── css/                         # Global, component, and page styles
    ├── js/
    │   ├── entries/                 # One JavaScript entry point per HTML page
    │   ├── pages/                   # Login, register, camp, leaderboard, and voyage pages
    │   ├── components/              # Reusable DOM and ocean viewport helpers
    │   ├── lib/                     # API client, auth store, game state, and utilities
    │   └── ocean/                   # Three.js scene, raft motion, and event effects
    ├── assets/                      # Pixel icons and other game media
    └── vendor/three/                 # Browser-ready Three.js modules
```

The frontend is vanilla JavaScript. Each HTML document contains a `#root` element; its entry
script fetches data and creates the page DOM with JavaScript. Express serves the files under
`public/` directly, with the page documents organized under `public/html/`.

### Backend controller organisation

The backend follows a strict controller pipeline for multi-step operations:

```text
verifyToken → loadCurrentUser → validate input → perform one database operation → send response
```

Each controller function is intentionally limited to one model operation. When a route needs
multiple operations, it chains controller steps. Intermediate results are stored in `res.locals`
and passed to the next step.

Reusable authentication, validation, request logging, and transaction middleware remains in
`src/middlewares/`. Route-specific controller middleware remains in `src/controllers/` because it
performs resource-specific work. Gameplay mutation pipelines use a transaction coordinator so
all related database changes commit together or roll back together.

## Setup and run

### Prerequisites

- Node.js 18 or later
- npm

### 1. Configure the backend

From the repository root:

```bash
cp .env.example .env
```

Set a long random `JWT_SECRET_KEY` in `.env`. The database defaults to `file:local.db` unless a
different `DATABASE_URL` is configured.

### 2. Install dependencies and seed the database

```bash
npm install
npm run db
```

`npm run db` applies the schema, clears the configured database in dependency order, and inserts
the seed data in one transaction. Seed relationships use the IDs returned by the database, so the
seed remains correct when autoincrement counters continue increasing after previous resets.

Running this command replaces the data in the configured database. Do not run it against a shared
or production database unless that reset is intentional.

### 3. Start the backend

```bash
npm start
```

The API runs at `http://localhost:3000`.

For backend development with automatic restart, use:

```bash
npm run dev
```

### 4. Open the frontend

Run `npm start`, then open `http://localhost:3000/`. Express serves the frontend directly from
`public/`; the individual page documents are available under `/html/`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `3000` |
| `DATABASE_URL` | libSQL/SQLite URL; defaults to `file:local.db` |
| `DATABASE_AUTH_TOKEN` | Authentication token for a remote libSQL database |
| `JWT_SECRET_KEY` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | JWT lifetime, for example `1h` or `7d` |
| `JWT_ALGORITHM` | JWT signing algorithm configured by the application |
| `NODE_ENV` | Runtime environment |

Never commit `.env` or database credentials.

## Seeded accounts

These accounts are available after `npm run db`:

| Username | Password | Seeded state |
| --- | --- | --- |
| `SurvivorJay` | `password123` | Raft size 1, 0 materials, energy 90, Floor Extension history |
| `Ocean` | `password1234` | Raft size 3, 50 materials, energy 75, Floor Extension and Sail history |
| `Rafter` | `password12345` | Raft size 8, 200 materials, energy 45, Floor Extension, Sail, and Net Launcher history |

The seeded survivors do not have defensive upgrades, so hazards can still remove cargo until the
player purchases protection.

## Frontend pages

| Page | File | Purpose |
| --- | --- | --- |
| Sign in | `public/html/index.html` or `public/html/login.html` | Authenticate an existing survivor |
| Register | `public/html/register.html` | Create a survivor account |
| Camp | `public/html/camp.html` | Manage the raft, quests, inventory, crafting, and upgrades |
| Voyage | `public/html/voyage.html` | Third-person 3D debris collection and ocean events |
| Leaderboard | `public/html/leaderboard.html` | Public survivor rankings |

Navigation uses ordinary document links between the multipage HTML documents. The protected camp
and voyage pages redirect to `/html/login.html` immediately when no stored session exists.

## Authentication and request flow

1. Registration and login are public `POST` requests.
2. A successful login returns a JWT.
3. The frontend stores the JWT and the current user in browser `localStorage` under `cc_token` and
   `cc_user` so a refresh can preserve the session.
4. The frontend API client adds `Authorization: Bearer <token>` to protected requests.
5. The backend verifies the token and loads the authenticated survivor.
6. The frontend uses `fetch()` to read or mutate API data and updates the DOM with the response.
7. A `401` response clears the stored session and sends protected pages back to sign in.

For debugging, inspect the browser DevTools Network tab under Fetch/XHR. Protected requests should
show the bearer token in the request headers; JSON request data appears under Payload and JSON API
results appear under Response. The token itself can be inspected under Application → Local Storage.

## API overview

Protected endpoints require `Authorization: Bearer <token>`. Passwords are bcrypt-hashed and are
never returned by the API.

### Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a survivor account |
| `POST` | `/api/auth/login` | Verify credentials and return a JWT |

### Authenticated survivor routes

Every `/api/me` route requires a token and acts on the token owner.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/me` | Read the signed-in survivor's profile |
| `PATCH` | `/api/me` | Rename the signed-in survivor |
| `DELETE` | `/api/me` | Delete the signed-in survivor and raft |
| `GET` | `/api/me/status` | Read progression state in one response |
| `GET` | `/api/me/inventory?category=` | Read the survivor's inventory |
| `GET` | `/api/me/upgrades` | Read the survivor's upgrade history |
| `GET` | `/api/me/quests` | Read the quest board and own progress |
| `GET` | `/api/me/collection-logs` | Read debris collection attempts |
| `GET` | `/api/me/debris` | Read currently spawned, unclaimed debris |
| `GET` | `/api/me/unexpected-events` | Read unexpected-event definitions |
| `POST` | `/api/me/debris/:debris_id/collect` | Collect one debris row |
| `POST` | `/api/me/collect-debris` | Legacy-compatible debris collection path |
| `POST` | `/api/me/unexpected-events/resolve` | Resolve an unexpected event |
| `POST` | `/api/me/craft` | Craft an item from a recipe |
| `POST` | `/api/me/upgrade-raft` | Buy a raft upgrade |
| `POST` | `/api/me/quests/:quest_id/claim` | Claim a completed quest reward |

### Public survivor routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API is running |
| `GET` | `/api/users?search=&raft_size=` | Search the public survivor directory |
| `GET` | `/api/users/leaderboard` | Read the top five survivors |
| `GET` | `/api/users/:user_id` | Read one public survivor profile |

There are no generic `POST/PATCH/DELETE /api/users` routes. Account creation uses registration,
while profile changes use the authenticated `/api/me` routes.

### Catalogue and record CRUD routes

The catalogue routes expose public reads. User-owned record routes require a bearer token and
only return or modify records belonging to the authenticated survivor. All update routes remain
`PATCH` routes in this project.

#### Item types

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/item-types` | List item types |
| `GET` | `/api/item-types/:item_type_id` | Read one item type |
| `POST` | `/api/item-types` | Create an item type |
| `PATCH` | `/api/item-types/:item_type_id` | Update an item type |
| `DELETE` | `/api/item-types/:item_type_id` | Delete an item type |

#### Crafting recipes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/crafting-recipes` | List crafting recipes |
| `GET` | `/api/crafting-recipes/:recipe_id` | Read one crafting recipe |
| `POST` | `/api/crafting-recipes` | Create a crafting recipe |
| `PATCH` | `/api/crafting-recipes/:recipe_id` | Update a crafting recipe |
| `DELETE` | `/api/crafting-recipes/:recipe_id` | Delete a crafting recipe |

#### User items

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/user-items` | List the authenticated survivor's inventory records |
| `GET` | `/api/user-items/:user_item_id` | Read one owned inventory record |
| `POST` | `/api/user-items` | Create an inventory record for the authenticated survivor |
| `PATCH` | `/api/user-items/:user_item_id` | Update an owned inventory record |
| `DELETE` | `/api/user-items/:user_item_id` | Delete an owned inventory record |

#### Raft upgrades

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/raft-upgrades` | List the authenticated survivor's upgrade history |
| `GET` | `/api/raft-upgrades/:upgrade_id` | Read one owned upgrade record |
| `POST` | `/api/raft-upgrades` | Create an upgrade record for the authenticated survivor |
| `PATCH` | `/api/raft-upgrades/:upgrade_id` | Update an owned upgrade record |
| `DELETE` | `/api/raft-upgrades/:upgrade_id` | Delete an owned upgrade record |

#### Quests

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/quests` | List quests |
| `GET` | `/api/quests/:quest_id` | Read one quest |
| `POST` | `/api/quests` | Create a quest |
| `PATCH` | `/api/quests/:quest_id` | Update a quest |
| `DELETE` | `/api/quests/:quest_id` | Delete a quest |

#### User quests

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/user-quests` | List the authenticated survivor's quest progress |
| `GET` | `/api/user-quests/:user_quest_id` | Read one owned quest-progress record |
| `POST` | `/api/user-quests` | Create quest progress for the authenticated survivor |
| `PATCH` | `/api/user-quests/:user_quest_id` | Update owned quest progress |
| `DELETE` | `/api/user-quests/:user_quest_id` | Delete owned quest progress |

#### Ocean events

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/ocean-events` | List ocean events |
| `GET` | `/api/ocean-events/:event_id` | Read one ocean event |
| `POST` | `/api/ocean-events` | Create an ocean event |
| `PATCH` | `/api/ocean-events/:event_id` | Update an ocean event |
| `DELETE` | `/api/ocean-events/:event_id` | Delete an ocean event |

#### User events

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/user-events` | List the authenticated survivor's event history |
| `GET` | `/api/user-events/:user_event_id` | Read one owned event-history record |
| `POST` | `/api/user-events` | Create event history for the authenticated survivor |
| `PATCH` | `/api/user-events/:user_event_id` | Update an owned event-history record |
| `DELETE` | `/api/user-events/:user_event_id` | Delete an owned event-history record |

The game UI uses the owner-scoped `/api/me` routes for gameplay. These catalogue and record routes
are separate CRUD endpoints and are not used by the browser to award materials or resolve gameplay
actions.

### Common response statuses

`200` successful read/action · `201` created · `204` deleted · `400` invalid input · `401` missing,
invalid, or expired token · `404` resource not found · `409` conflict or already-claimed resource ·
`429` event cooldown · `500` unexpected server error.

Errors use the central shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation",
    "status": 400
  }
}
```

Swagger documentation is available at `http://localhost:3000/api-docs` while the backend is
running.

## Database

The database contains eleven Drizzle tables:

| Table | Purpose |
| --- | --- |
| `users` | Survivor account, bcrypt password hash, materials, raft size, energy, level, and login progress |
| `item_types` | Item catalogue with category, rarity, costs, and descriptions |
| `user_items` | Inventory quantities owned by survivors |
| `debris` | Server-spawned floating debris and its claim state |
| `debris_collection_logs` | Audit trail of accepted and rejected collection attempts |
| `crafting_recipes` | Ingredient-to-result crafting mappings |
| `raft_upgrades` | Upgrade history for each survivor |
| `quests` | Quest definitions, targets, rewards, and raft-size gates |
| `user_quests` | Per-survivor quest progress and claim state |
| `ocean_events` | Normal and unexpected event definitions |
| `user_events` | History of events encountered by survivors |

`user_id` and the other ordinary entity IDs are database-generated integer primary keys. The
`debris_id` is a text UUID because debris identifiers are exposed to the browser and must be
unique without relying on sequential values.

## Game rules

Upgrade balance is centralised in `src/config/gameRules.js`:

| Upgrade | Cost | Effect |
| --- | ---: | --- |
| Floor Extension | 10 materials | `raft_size` +1; repeatable |
| Sail | 20 materials | `raft_size` +2; repeatable |
| Net Launcher | 35 materials | `raft_size` +3; repeatable |
| Spear Rack | 30 materials | Prevents shark attacks; one-time |
| Shelter | 45 materials | Prevents tsunamis; one-time |
| Roof | 35 materials | Prevents heavy downpours; one-time |

The server is authoritative for debris, materials, quest progress, crafting, upgrades, event
outcomes, and cooldowns. Collection, crafting, upgrades, quest claims, and event resolution use
transactions so related database changes are applied together.

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| Root | `npm start` | Start the API and Express-served frontend on port 3000 |
| Root | `npm run dev` | Start the API with nodemon |
| Root | `npm run db` | Apply the schema, clear, and reseed the configured database |
| Root | `npm test` | Run the Vitest test suite |
| Root | `npm run export` | Create an export zip without `node_modules` |

## Notes for assessment and debugging

- The frontend uses the DOM directly through vanilla JavaScript; no React runtime or React Router
  is required.
- API calls are visible in DevTools under Network → Fetch/XHR, including request headers, payloads,
  response JSON, status codes, and request IDs.
- Frontend API logging is prefixed with `[FRONTEND]`; authentication logging uses `[AUTH]`.
- Backend request, error, authentication, and controller-pipeline logs help trace a request from
  the route to the database operation.
- Images and 3D visuals are frontend assets/code; gameplay rewards and progression remain controlled
  by the backend.
