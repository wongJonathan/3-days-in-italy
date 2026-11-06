import { createTheme } from "@mui/material/styles";

/**
 * EXPERIMENT (branch experiment/mui-place-list): an MUI theme matched to the
 * app's existing look (index.css tokens), so MUI components blend in.
 * Values are copied from :root in index.css; if MUI is kept, they should
 * come from one shared source instead.
 */
export const theme = createTheme({
  palette: {
    primary: { main: "#0b6b4f", contrastText: "#ffffff" }, // --accent
    warning: { main: "#7a4b00", light: "#fff4d6" }, // --warning-text / --warning-bg
    error: { main: "#b42318" }, // --error
    text: { primary: "#1f2328", secondary: "#59636e" }, // --text / --muted
    divider: "#d1d9e0", // --border
  },
  shape: { borderRadius: 10 }, // --radius
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: "none", fontWeight: 600 }, // MUI shouts in CAPS by default
  },
});
