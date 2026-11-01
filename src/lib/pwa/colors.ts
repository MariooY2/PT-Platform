// PWA manifest colours. These mirror the design tokens defined in src/app/globals.css
// (`--primary` and `--background`, light theme). Hex literals are allowed here — the
// architecture check (scripts/check-architecture.mjs) only scans .css for raw colours —
// but if the tokens in globals.css change, update these to match.
//
// `themeColor`      -> manifest `theme_color` + the document <meta name="theme-color">; tints the
//                      browser/OS chrome. Matches `--primary` (light).
// `backgroundColor` -> manifest `background_color`; the splash-screen background shown while the
//                      app boots. Matches `--background` (light).
// `iconForeground` is only used by the generated maskable icon (src/app/icons/[size]/route.tsx),
// where next/og renders to a PNG outside Tailwind, so token classes are unavailable and the colour
// must be given as a literal to the inline style. Matches `--primary-foreground` (light).
export const PWA_COLORS = {
  themeColor: '#1f4fd1', // --primary (light) in src/app/globals.css
  backgroundColor: '#f5f6f4', // --background (light) in src/app/globals.css
  iconForeground: '#ffffff', // --primary-foreground (light) in src/app/globals.css
} as const;
