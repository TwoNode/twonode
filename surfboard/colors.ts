// Surfboard Color Palette
// Modern blue/teal/green palette for geospatial/GIS platform

export const SURFBOARD_COLORS = {
  primary: {
    main: "#2563EB", // Blue-600
    light: "#3B82F6", // Blue-500
    dark: "#1D4ED8", // Blue-700
    contrastText: "#fff",
  },
  secondary: {
    main: "#0284C7", // Sky-600
    light: "#0EA5E9", // Sky-500
    dark: "#0369A1", // Sky-700
    contrastText: "#fff",
  },
  accent: {
    main: "#4F46E5", // Indigo-600
    light: "#6366F1", // Indigo-500
    dark: "#4338CA", // Indigo-700
    contrastText: "#fff",
  },
  background: {
    default: "#F6FAFB", // Very light blue/gray
    paper: "#FFFFFF",
  },
  surface: {
    main: "#E9F5FB", // Card backgrounds
  },
  error: {
    main: "#D90429",
    light: "#FFB3B3",
    dark: "#A30015",
    contrastText: "#fff",
  },
  info: {
    main: "#2196F3",
    light: "#BBDEFB",
    dark: "#1565C0",
    contrastText: "#fff",
  },
  success: {
    main: "#43AA8B",
    light: "#B7EFC5",
    dark: "#184D47",
    contrastText: "#fff",
  },
  warning: {
    main: "#FFB703",
    light: "#FFE29A",
    dark: "#FF8800",
    contrastText: "#fff",
  },

  // ===== EXTRA COLORS =====
  sidebar: {
    itemBorderLeft: "#2563EB",
  },
};

export function surfboardStatusBadgeStyle(
  tone: "success" | "warning" | "info" | "error"
) {
  const color = SURFBOARD_COLORS[tone].main;
  return { backgroundColor: `${color}1A`, color };
}

// Matches the public landing page's --sfl-primary/--sfl-primary-2/--sfl-secondary
// gradient (surfboard-landing.module.css) exactly, so the login split-panel and
// dashboard header read as the same identity as the marketing site instead of
// the brighter, unrelated blue-600 gradient they used before.
export const SURFBOARD_GRADIENTS = {
  hero: "linear-gradient(155deg, #000b3d 0%, #141c4d 45%, #233dff 140%)",
  // Same accent/accentDark pair as the MDA login page (AuthSplitLayout's
  // default `linear-gradient(135deg, accentDark, accent)` formula,
  // reproduced here as a constant) so the MDA dashboard's sidebar/navbar
  // read as the same identity as its own login page, not a different blue.
  mda: "linear-gradient(135deg, #5B21B6, #7C3AED)",
};
