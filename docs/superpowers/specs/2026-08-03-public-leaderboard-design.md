# Public Leaderboard Design

## Goal

Allow visitors to view a styled survivor leaderboard from the login page without signing in.

## Approved behavior

- Add a public `/leaderboard` frontend route outside `RequireAuth`.
- Add a `VIEW LEADERBOARD` link or button to the login page.
- Fetch player data from the existing unauthenticated `GET /api/users` endpoint.
- Rank survivors by `raft_size` descending, then `materials` descending, then username ascending for a stable final tie-breaker.
- Display the top three survivors as a podium and all survivors in a ranked table.
- Show loading, empty, and API-error states without requiring authentication.
- Keep password data private; use only the public fields already returned by `/api/users`.
- Provide a clear return-to-login action from the leaderboard.

## Architecture

Create a focused `LeaderboardPage` component and stylesheet following the existing page/module-CSS conventions. Keep the ranking logic in a small pure helper so it can be tested independently from browser rendering. Register the page in `frontend/src/App.jsx` alongside the public login and registration routes; do not wrap it in `RequireAuth`. The existing API remains the data source, so no login token is needed.

## Visual direction

Use the existing Castaway Chronicles parchment/night-ocean language: the login shell’s backdrop and typography, warm gold accents for the leading ranks, dark translucent panels, and responsive layout. The podium should emphasize ranks one through three while the table remains scannable on narrow screens.

## Data and ranking

The page requests `/api/users` with a normal `fetch`. The helper normalizes numeric fields and returns a new sorted array, leaving the API response untouched. Ranking uses:

1. Larger `raft_size` first.
2. Larger `materials` second.
3. Case-insensitive username ascending for deterministic ties.

The UI displays username, raft size, materials, and hunger. It does not display `user_id` or `lastLogin`.

## Testing and verification

- Add pure-helper tests covering ranking order, tie-breakers, and empty input.
- Verify the new public route renders without an auth session.
- Verify the login page exposes navigation to `/leaderboard`.
- Run the focused tests, frontend build, and the existing test suite as practical.

## Scope exclusions

- No new authentication or authorization behavior.
- No write endpoints or changes to survivor data.
- No new leaderboard database table or backend ranking endpoint.
- No changes to the existing game or voyage screens.
