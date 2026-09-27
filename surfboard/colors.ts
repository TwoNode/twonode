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
