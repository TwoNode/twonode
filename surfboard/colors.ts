// Surfboard Color Palette
// Modern blue/teal/green palette for geospatial/GIS platform

export const SURFBOARD_COLORS = {
  primary: {
    main: "#0077B6", // Deep blue
    light: "#48CAE4", // Light blue
    dark: "#023E8A", // Navy
    contrastText: "#fff",
  },
  secondary: {
    main: "#00B4D8", // Teal
    light: "#90E0EF", // Pale teal
    dark: "#0096C7", // Dark teal
    contrastText: "#fff",
  },
  accent: {
    main: "#43AA8B", // Green accent
    light: "#90BE6D", // Light green
    dark: "#184D47", // Deep green
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
    itemBorderLeft: "#0077B6",
  },
};

export function surfboardStatusBadgeStyle(
  tone: "success" | "warning" | "info" | "error"
) {
  const color = SURFBOARD_COLORS[tone].main;
  return { backgroundColor: `${color}1A`, color };
}
