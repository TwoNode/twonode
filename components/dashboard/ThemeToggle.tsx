"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        "border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
        "dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
