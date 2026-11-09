# api/ (Express + PostgreSQL)

Run all commands from the repo root, not from `api/`.

## Layout
- `src/index.js` starts the server; `src/app.js` builds the Express app and mounts `/api/third-level`.
- `src/routes/thirdLevelRoutes.js` mounts feature routers under prefixes:
  `/official-profiling`, `/notable-achievements`, `/officials-registry`.
- `src/features/<name>/` is a vertical slice: `routes.js`, controllers, `repositories/` (SQL only), `index.js` (public barrel).
  Features: auth, binary, notable-achievements, officials-registry, official-profiling.
- Shared kernel: `src/config/`, `src/utils/`, `src/middleware/`, `src/services/` (never imports features).

## Rules
- Import another feature only through its `index.js`; no circular imports (`npm run lint` enforces).
- SQL belongs in `repositories/`; controllers call repository functions.
- Schema changes are SQL files in `database/migrations/`.

## Scripts (from repo root)
- `npm run dev` runs API and UI together.
- `npm run lint`, `npm run test` (Vitest), `npm run build` (UI only).
- In `api/`: `npm start` (node), `npm run dev` (nodemon).
