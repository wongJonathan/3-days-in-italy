/**
 * The app's colours and corner radius: the ONE place they are defined.
 * - theme.ts builds MUI's palette from them;
 * - cssVariables() turns them into CSS custom properties on :root
 *   (--accent, --muted, …), which index.css and `sx` values use;
 * - TypeScript that needs a raw value (e.g. the map's route line) imports them.
 * A test fails if a colour is written anywhere else.
 */
export const COLORS = {
  text: "#1f2328",
  muted: "#59636e",
  border: "#e4ddd2", // warm grey, to sit on --page
  page: "#faf7f2", // warm off-white page background; cards stay --surface
  surface: "#ffffff",
  surfaceAlt: "#f6f8fa",
  accent: "#0b6b4f", // Italian green, readable on white (WCAG AA)
  accentSoft: "#e3f2ec",
  onAccent: "#ffffff", // text and outlines drawn on top of --accent
  error: "#b42318",
  warningBg: "#fff4d6",
  warningText: "#7a4b00", // amber, readable on --warning-bg (WCAG AA)
  warningRing: "#a86f00", // amber map-pin ring, 3:1 against the map
} as const;

export const RADIUS = 10;

/** "surfaceAlt" → "--surface-alt". */
const cssName = (key: string) =>
  `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

/**
 * The CSS custom properties for :root (App puts them there with MUI's
 * GlobalStyles), e.g. { "--accent": "#0b6b4f", …, "--radius": "10px" }.
 */
export const cssVariables = (): Record<string, string> => ({
  ...Object.fromEntries(
    Object.entries(COLORS).map(([key, value]) => [cssName(key), value]),
  ),
  "--radius": `${RADIUS}px`,
});
