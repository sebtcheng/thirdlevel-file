# ui/ (Vite + React)

Run all commands from the repo root, not from `ui/`.

## Layout
- `src/main.jsx` entry; `src/pages/` one file per route page.
- `src/components/<page-name>/` holds sections extracted from a page
  (e.g. `official-profiling/` tabs, `officials-registry/` panels); shared components sit in `src/components/`.
- `src/context/`, `src/utils/` (`apiUrl`, helpers), `src/assets/`.

## API calls
- Use `apiUrl('/api/third-level/<feature>/<route>')` where feature is
  `official-profiling`, `officials-registry` or `notable-achievements`.

## Rules
- Pages coordinate; put tab/form/view sections in `components/<page-name>/`.
- UI never imports from `api/` (lint enforced). Keep styling and behavior unchanged when extracting.

## Scripts (from repo root)
- `npm run dev` (Vite + API), `npm run build` (vite build), `npm run test` (Vitest), `npm run lint`.
- In `ui/`: `npm run dev`, `build`, `preview`, `test`.
