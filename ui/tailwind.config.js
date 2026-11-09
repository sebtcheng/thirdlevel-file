import { readFileSync } from 'node:fs';

// Colors come from src/theme/tailwind-colors.json, generated from the InsightED tokens.
const colors = JSON.parse(readFileSync(new URL('./src/theme/tailwind-colors.json', import.meta.url), 'utf8'));

// Legacy Tailwind palette names are remapped onto the InsightED palette so older utility classes
// (bg-slate-50, text-blue-600, border-red-200 ...) resolve to token shades instead of off-palette colors.
const scale = (s) => ({ ...s, 950: s[900] });
const neutral = scale({
  50: colors.brand[50], 100: colors.brand[100], 200: colors.muted, 300: colors.muted, 400: colors.secondary,
  500: colors.secondary, 600: colors.secondary, 700: colors.heading, 800: colors.heading, 900: colors.heading,
});
const legacy = {};
for (const name of ['slate', 'gray', 'zinc', 'neutral', 'stone']) legacy[name] = neutral;
for (const name of ['blue', 'sky', 'indigo', 'cyan', 'violet', 'purple']) legacy[name] = scale(colors.brand);
for (const name of ['red', 'rose', 'pink', 'fuchsia']) legacy[name] = scale(colors.danger);
for (const name of ['amber', 'yellow', 'orange', 'lime']) legacy[name] = scale(colors.warning);
for (const name of ['green', 'emerald', 'teal']) legacy[name] = scale(colors.success);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { ...legacy, ...colors },
      fontFamily: {
        sans: ['var(--font-body)'],
        body: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
        title: ['var(--font-title)'],
        data: ['var(--font-data)'],
        mono: ['var(--font-data)'],
      },
      // Corners are 4-6px; pills and circles keep `rounded-full`.
      borderRadius: {
        sm: '4px', DEFAULT: '4px', md: '6px', lg: '6px', xl: '6px', '2xl': '6px', '3xl': '6px',
        card: 'var(--card-radius)',
      },
      // Soft theme shadows only.
      boxShadow: {
        sm: 'var(--shadow-sm)', DEFAULT: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)', '2xl': 'var(--shadow-xl)',
      },
    },
  },
  plugins: [],
}
