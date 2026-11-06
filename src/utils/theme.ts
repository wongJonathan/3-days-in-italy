import { createTheme } from "@mui/material/styles";
import { createElement } from "react";
import { COLORS, RADIUS } from "./colors.ts";

/**
 * The display font for page and day headings (h4/h5) only; body text stays
 * system-ui. Fraunces is bundled (@fontsource, latin subset, one weight, loaded
 * in index.tsx), so there's no request to a font CDN.
 */
const DISPLAY_FONT = '"Fraunces", Georgia, "Times New Roman", serif';
const display = { fontFamily: DISPLAY_FONT, fontWeight: 600 } as const;

/**
 * The MUI theme. Colours and radius come from colors.ts, the same source as
 * the CSS variables in index.css, so MUI components and plain CSS always match.
 */
export const theme = createTheme({
  palette: {
    primary: { main: COLORS.accent, contrastText: COLORS.onAccent },
    warning: { main: COLORS.warningText, light: COLORS.warningBg },
    error: { main: COLORS.error },
    text: { primary: COLORS.text, secondary: COLORS.muted },
    background: { default: COLORS.page, paper: COLORS.surface },
    divider: COLORS.border,
  },
  shape: { borderRadius: RADIUS },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: display,
    h5: display,
    button: { textTransform: "none", fontWeight: 600 }, // MUI shouts in CAPS by default
  },
  components: {
    // Every Accordion (Make it yours, Other prices) gets an open/close arrow, set
    // once here. MUI rotates it when the section opens. A plain character, so
    // the large @mui/icons-material package isn't needed. aria-hidden: the
    // summary is already announced as expanded or collapsed.
    MuiAccordionSummary: {
      defaultProps: {
        expandIcon: createElement(
          "span",
          {
            "aria-hidden": true,
            style: { fontSize: "1.25rem", lineHeight: 1 },
          },
          "▾",
        ),
      },
    },
  },
});
