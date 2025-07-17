/**
 * REVA Color Palette
 * A comprehensive color system for the REVA platform
 * Based on analysis of existing components and design patterns
 */

export const REVA_COLORS = {
  // ===== PRIMARY COLORS =====
  primary: {
    main: "#032740", // Main brand color - dark blue
    light: "#008cff", // Light blue accent
    lighter: "#00bfff", // Bright blue for highlights
  },

  // ===== SECONDARY COLORS =====
  secondary: {
    main: "#1e40af", // Secondary blue
    light: "#3b82f6", // Light secondary blue
    dark: "#1e3a8a", // Dark secondary blue
  },

  // ===== GRADIENT COLORS =====
  gradient: {
    start: "#111827", // Dark gray for gradients
    mid: "#374151", // Medium gray for gradients
    end: "#6b7280", // Light gray for gradients
  },

  // ===== BLUE GRADIENTS =====
  blueGradient: {
    start: "#1e40af", // Blue gradient start
    end: "#3b82f6", // Blue gradient end
    light: "#60a5fa", // Light blue gradient
  },

  // ===== GRAY SCALE =====
  gray: {
    50: "#f9fafb", // Very light gray
    100: "#f3f4f6", // Light gray
    200: "#e5e7eb", // Medium light gray
    300: "#d1d5db", // Medium gray
    400: "#9ca3af", // Medium dark gray
    500: "#6b7280", // Dark gray
    600: "#4b5563", // Darker gray
    700: "#374151", // Very dark gray
    800: "#1f2937", // Almost black gray
    900: "#111827", // Near black
  },

  // ===== SLATE COLORS =====
  slate: {
    50: "#f8fafc", // Very light slate
    100: "#f1f5f9", // Light slate
    200: "#e2e8f0", // Medium light slate
    300: "#cbd5e1", // Medium slate
    400: "#94a3b8", // Medium dark slate
    500: "#64748b", // Dark slate
    600: "#475569", // Darker slate
    700: "#334155", // Very dark slate
    800: "#1e293b", // Almost black slate
    900: "#0f172a", // Near black slate
  },

  // ===== BACKGROUND COLORS =====
  background: {
    primary: "#f0f2f4", // Main background
    secondary: "#ffffff", // Secondary background
    tertiary: "#f9fafb", // Tertiary background
    dark: "#111827", // Dark background
  },

  // ===== TEXT COLORS =====
  text: {
    primary: "#032740", // Primary text color
    secondary: "#6b7280", // Secondary text color
    muted: "#9ca3af", // Muted text color
    light: "#ffffff", // Light text color
    dark: "#111827", // Dark text color
  },

  // ===== INTERACTIVE COLORS =====
  interactive: {
    hover: "#f3f4f6", // Hover background
    active: "#e5e7eb", // Active background
    focus: "#3b82f6", // Focus ring color
  },

  // ===== STATUS COLORS =====
  status: {
    success: "#10b981", // Success green
    successLight: "#34d399", // Light success green
    warning: "#f59e0b", // Warning orange
    warningLight: "#fbbf24", // Light warning orange
    error: "#ef4444", // Error red
    errorLight: "#f87171", // Light error red
    info: "#3b82f6", // Info blue
    infoLight: "#60a5fa", // Light info blue
  },

  // ===== BORDER COLORS =====
  border: {
    light: "#e5e7eb", // Light border
    medium: "#d1d5db", // Medium border
    dark: "#9ca3af", // Dark border
    blue: "#3b82f6", // Blue border
  },

  // ===== SHADOW COLORS =====
  shadow: {
    light: "rgba(0, 0, 0, 0.05)",
    medium: "rgba(0, 0, 0, 0.1)",
    dark: "rgba(0, 0, 0, 0.15)",
    blue: "rgba(59, 130, 246, 0.1)",
  },

  // ===== TRANSPARENCY COLORS =====
  transparency: {
    blue10: "rgba(3, 39, 64, 0.1)", // 10% opacity blue
    blue20: "rgba(3, 39, 64, 0.2)", // 20% opacity blue
    blue30: "rgba(3, 39, 64, 0.3)", // 30% opacity blue
    blue50: "rgba(3, 39, 64, 0.5)", // 50% opacity blue
    blue70: "rgba(3, 39, 64, 0.7)", // 70% opacity blue
  },

  // ===== EXTRA COLORS =====
  sidebar: {
    itemBorderLeft: "#0077B6",
  },
} as const;

// ===== GRADIENT UTILITIES =====
export const REVA_GRADIENTS = {
  header: `linear-gradient(to right, ${REVA_COLORS.gray[800]}, ${REVA_COLORS.blueGradient.start})`,
  sidebar: `linear-gradient(to bottom, ${REVA_COLORS.slate[50]}, ${REVA_COLORS.slate[100]})`,
  primary: `linear-gradient(to right, ${REVA_COLORS.blueGradient.start}, ${REVA_COLORS.blueGradient.end})`,
  danger: `linear-gradient(to right, #dc2626, #ef4444)`,
  success: `linear-gradient(to right, ${REVA_COLORS.status.success}, ${REVA_COLORS.status.successLight})`,
} as const;

// ===== CSS VARIABLES =====
export const REVA_CSS_VARS = {
  // Primary Colors
  "--reva-primary": REVA_COLORS.primary.main,
  "--reva-primary-light": REVA_COLORS.primary.light,
  "--reva-primary-lighter": REVA_COLORS.primary.lighter,

  // Secondary Colors
  "--reva-secondary": REVA_COLORS.secondary.main,
  "--reva-secondary-light": REVA_COLORS.secondary.light,
  "--reva-secondary-dark": REVA_COLORS.secondary.dark,

  // Background Colors
  "--reva-bg-primary": REVA_COLORS.background.primary,
  "--reva-bg-secondary": REVA_COLORS.background.secondary,
  "--reva-bg-dark": REVA_COLORS.background.dark,

  // Text Colors
  "--reva-text-primary": REVA_COLORS.text.primary,
  "--reva-text-secondary": REVA_COLORS.text.secondary,
  "--reva-text-light": REVA_COLORS.text.light,
  "--reva-text-dark": REVA_COLORS.text.dark,

  // Status Colors
  "--reva-success": REVA_COLORS.status.success,
  "--reva-warning": REVA_COLORS.status.warning,
  "--reva-error": REVA_COLORS.status.error,
  "--reva-info": REVA_COLORS.status.info,

  // Border Colors
  "--reva-border-light": REVA_COLORS.border.light,
  "--reva-border-blue": REVA_COLORS.border.blue,

  // Gradients
  "--reva-header-gradient": REVA_GRADIENTS.header,
  "--reva-sidebar-gradient": REVA_GRADIENTS.sidebar,
  "--reva-primary-gradient": REVA_GRADIENTS.primary,
} as const;

// ===== UTILITY FUNCTIONS =====
export const getRevaColor = (colorPath: string): string => {
  const path = colorPath.split(".");
  let current: any = REVA_COLORS;

  for (const key of path) {
    if (current[key] === undefined) {
      console.warn(`Color path "${colorPath}" not found in REVA_COLORS`);
      return REVA_COLORS.primary.main; // Fallback to primary color
    }
    current = current[key];
  }

  return current;
};

export const getRevaGradient = (
  gradientName: keyof typeof REVA_GRADIENTS
): string => {
  return REVA_GRADIENTS[gradientName];
};

// ===== TYPE DEFINITIONS =====
export type RevaColorKey = keyof typeof REVA_COLORS;
export type RevaGradientKey = keyof typeof REVA_GRADIENTS;
export type RevaCSSVarKey = keyof typeof REVA_CSS_VARS;

// ===== TAILWIND CONFIG COMPATIBILITY =====
export const REVA_TAILWIND_COLORS = {
  reva: {
    primary: REVA_COLORS.primary,
    secondary: REVA_COLORS.secondary,
    gray: REVA_COLORS.gray,
    slate: REVA_COLORS.slate,
    success: REVA_COLORS.status.success,
    warning: REVA_COLORS.status.warning,
    error: REVA_COLORS.status.error,
    info: REVA_COLORS.status.info,
  },
} as const;

// ===== EXPORT ALL =====
export default REVA_COLORS;
