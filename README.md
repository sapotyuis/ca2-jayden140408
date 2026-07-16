# Castaway Chronicles — Backend API

## Game Theme

You wake up adrift on the open ocean, clinging to a few planks of driftwood. In **Castaway Chronicles**, players build and expand their raft by sweeping floating ocean debris for raw materials (wood planks, plastic, rope), crafting tools and food from those materials, and applying structural upgrades that grow their raft tile by tile. A bigger raft casts a wider net — each debris run rewards more materials — creating a compounding loop of survival and growth. The game is driven entirely through a REST API and is designed to be extended with a full frontend and authentication system in CA2.

## API Overview

| Resource         | Base path               | What it does                                   |
| ---------------- | ----------------------- | ---------------------------------------------- |
| Users            | `/api/users`            | Create / manage survivors, rename, view stats  |
| Item Types       | `/api/item-types`       | Catalogue of all collectable / craftable items |
| User Items       | `/api/user-items`       | Each survivor's personal inventory             |
| Crafting Recipes | `/api/crafting-recipes` | Ingredient → result mappings                   |
| Raft Upgrades    | `/api/raft-upgrades`    | History of raft upgrades applied               |

### Game-loop endpoints

| Method | Route                           | Description                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------------------- |
| `POST` | `/api/users/:id/collect-debris` | Sweep the ocean; earn materials scaled by raft size                        |
| `POST` | `/api/users/:id/upgrade-raft`   | Spend materials to grow your raft and unlock more collection capacity      |
| `POST` | `/api/users/:id/craft`          | Craft an item by consuming the required ingredients from inventory         |
| `GET`  | `/api/users/:id/status`         | View full progression state: stats, upgrades, and next recommended upgrade |

### Example game session (API calls in order)

```
1. POST  /api/users                           → create your survivor
2. POST  /api/users/1/collect-debris          → collect materials from the ocean
3. POST  /api/users/1/collect-debris          → collect again to stockpile
4. POST  /api/users/1/upgrade-raft            { upgrade_type: "Floor Extension" }
5. POST  /api/users/1/collect-debris          → bigger raft → more materials per run
6. POST  /api/users/1/upgrade-raft            { upgrade_type: "Sail" }
7. POST  /api/users/1/craft                   { result_item_type_id: 3 } → craft an item
8. GET   /api/users/1/status                  → check full progression state
```

## Setup & Run

### Prerequisites

- Node.js 18 or later
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/AY26S1-ST0503/ca1-jayden140408
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Create the database and load sample data
npm run db

# 4. Start the development server (auto-reloads on save)
npm run dev
```

Server: http://localhost:3000
API docs: http://localhost:3000/api-docs

### Other scripts

| Command       | What it does                            |
| ------------- | --------------------------------------- |
| `npm run dev` | Start dev server with auto-reload       |
| `npm run db`  | Drop, recreate, and reseed the database |
| `npm test`    | Run the test suite                      |

## Assumptions

**Materials pool** — `materials` is a single integer on the `users` record representing a generic pool of crafting resources rather than individual stacks (e.g., 30 wood + 10 rope). This simplifies the MVP without losing the core mechanic. Individual resource tracking would be the obvious next step.

**Raft size as progression** — `raft_size` doubles as the player's score. Each upgrade type grants a different amount of raft tiles: Floor Extension (+1), Sail (+2), Net Launcher (+3). A higher raft size directly increases the material yield of each `collect-debris` run.

**Upgrade deducts materials atomically** — `POST /api/users/:id/upgrade-raft` checks the user's material balance, deducts the cost, increments `raft_size`, and writes a record to `raft_upgrades` in a single request. If the user cannot afford the upgrade, the request fails with 400 and nothing is modified.

**Hunger is client-driven** — `hunger` (0–100) is a stat stored on the user but not auto-decayed by a timer, since a stateless REST API has no persistent clock. The client (or a future scheduler) is responsible for calling `PATCH /api/users/:id` to reduce hunger over time and `PATCH /api/users/:id` (or a dedicated eat-food endpoint) to restore it.

**Plain-text passwords for CA1** — Passwords are stored as plain text for now. Hashing (bcrypt) will be added in CA2 when the full authentication system is implemented. The `password` column is included now so the schema doesn't change later.

**Varchar primary keys** — The schema uses `text` PKs for `user_id` as specified in the assignment brief (`user_id<varchar, pk>`). New users auto-generate a `user_id` in the format `rafter_<username>`, and updating a username cascades the new `user_id` to all related tables via `onUpdate: 'cascade'`.

**Crafting consumes ingredients atomically** — `POST /api/users/:id/craft` validates that the user holds all required ingredients, then atomically deducts them and adds the crafted item to inventory in a single transaction. If any ingredient is insufficient the request fails with 400 and nothing is modified. The `crafting-recipes` endpoints let you view and manage the ingredient → result mappings.
