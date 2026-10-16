"use client";

import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface RevaThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function RevaThemeToggle({
  className = "",
  showLabel = false,
}: RevaThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-cyan-500/20 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-blue-600 shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
