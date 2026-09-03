// GBC Color Palette
// Purple/pink palette for the conference platform — tuned from the
// GBC Design System artifact's tokens (primary #7C3AED, accent #EC4899).
// Live GBC pages currently hardcode stock Tailwind classes (purple-600,
// indigo-600, blue-600) per-component; this file is the single source of
// truth components should migrate onto instead, matching the reva/colors.ts
// and surfboard/colors.ts convention (imported and used via inline style,
// not a Tailwind theme extension).

export const GBC_COLORS = {
  primary: {
    main: "#7C3AED", // Violet — brand primary
    light: "#A78BFA",
    dark: "#5B21B6",
    contrastText: "#fff",
  },
  secondary: {
    main: "#EC4899", // Pink accent
    light: "#F9A8D4",
    dark: "#BE185D",
    contrastText: "#fff",
  },
  accent: {
    main: "#EC4899",
    light: "#F9A8D4",
    dark: "#BE185D",
    contrastText: "#fff",
  },
  background: {
    default: "#F5EEFC", // Tinted app background
    paper: "#FFFFFF",
  },
  surface: {
    main: "#F3E8FF", // Card/panel backgrounds
  },
  error: {
    main: "#DC2626",
    light: "#FCA5A5",
    dark: "#991B1B",
    contrastText: "#fff",
  },
  info: {
    main: "#2563EB",
    light: "#BFDBFE",
    dark: "#1E3A8A",
    contrastText: "#fff",
  },
  success: {
    main: "#10B981",
    light: "#6EE7B7",
    dark: "#047857",
    contrastText: "#fff",
  },
  warning: {
    main: "#F59E0B",
    light: "#FCD34D",
    dark: "#D97706",
    contrastText: "#fff",
  },

  // ===== EXTRA COLORS =====
  sidebar: {
    itemBorderLeft: "#7C3AED",
  },
} as const;

export const GBC_GRADIENTS = {
  hero: `linear-gradient(155deg, #3B1370 0%, ${GBC_COLORS.primary.main} 55%, ${GBC_COLORS.secondary.main} 130%)`,
  primary: `linear-gradient(90deg, ${GBC_COLORS.primary.main} 60%, ${GBC_COLORS.secondary.main} 100%)`,
} as const;

export default GBC_COLORS;
