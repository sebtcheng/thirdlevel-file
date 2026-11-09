# Frontend (apps/frontend)

React + Mantine, package {{packageScope}}/frontend.

## Layers (src/)
- Order: app, pages, widgets, features, entities, shared. A layer imports only from layers below it.
- Slices sit inside layers; each exposes index.ts.
- Structure check: `steiger.config.ts`. Import check: `eslint.boundaries.config.mjs`.

## Conventions
- Server state through TanStack Query; no ad-hoc fetch in components.
- Use Mantine components and theme tokens; no second UI library.
- Shared request and response types come from {{packageScope}}/shared.
- UI design tasks use the Impeccable skill when the harness can run it; otherwise follow the closest equivalent noted in the platform matrix reference of the agent-ide-brain skill.
