# UI rules (InsightED design language)

Source of truth for all UI work in this repo. Full detail and the retrofit workflow: the `insighted-ui-rules` skill. Colors, sizes and shadows come from the theme, generated from the skill's `insighted-tokens.json`. Never type a color value in a component.

## Palette roles (InsightED official palette)

- Primary blue `#0F4C8A`: primary buttons, links, key chart series, progress. Mid blue `#8FB0D3`, pale blue `#D3E1F0`: second and third series, info pills.
- Sidebar gradient `#0F4B88` to `#0B3868` to `#092E58`; active item translucent white with a `#FFC629` marker. Top accent line `#D4182F` / `#FFC629`.
- Page `#E8EFF7`, surface `#FFFFFF`, heading text `#0F172A`, secondary text `#586679`, muted lines `#CBD5E1`.
- Status pills (tint + dark text): success, warning, danger, info. Danger solid `#D4182F` with white text.
- Dark mode: page `#0B1727`, card `#11233A`, raised `#172E4A`, text `#E8EFF7`. Sidebar gradient is unchanged.

## One library per concern

Keep the repo's UI library; never migrate frameworks, never add a second library for a concern, never install a library that `reference/libraries.md` of the skill does not name. Standard stack: Mantine for components and styling, `@mantine/charts` for charts, Phosphor for icons, plain CSS for motion.

## The 20 decisions

1. Feel corporate and trustworthy.
2. Balanced density.
3. Accent color only on key actions.
4. Light by default; dark mode supported through the theme, never forced.
5. Controls 4-6px; cards, hero headers, KPI boxes, table wrappers and modals 12px (--card-radius); only pill badges and circular avatars may be fully round.
6. Soft theme shadows separate surfaces; no heavy borders.
7. Four fonts by role: Source Serif 4 (titles), Plus Jakarta Sans (headers, labels, UI), Public Sans (body), IBM Plex Mono (inputs, IDs, numbers); self-hosted via @fontsource. Inter only in print, voucher and signature modules.
8. Body 15px (16px on mobile).
9. Strong bold headings; weight and color carry hierarchy.
10. Top bar plus left sidebar shell.
11. Fully responsive with equal mobile priority; the sidebar becomes a drawer below 1024px.
12. Table rows are comfortable (14px 16px) with hairline dividers.
13. Status is a colored pill badge with a text label.
14. On mobile, tables become stacked cards or scroll inside their own container.
15. Fields use the one shared floating-label component.
16. Validation errors show inline and in one summary banner.
17. Loading uses spinners, never skeletons.
18. Motion is subtle: 200ms or less, no springs or bounce, no animation libraries.
19. Icons are Phosphor duotone only, set once through a global provider or wrapper; destructive actions use the named confirmation dialog stating exactly what is affected.
20. Follow the rules without deviation.

Do not deviate. For uncovered cases, stop and ask.
