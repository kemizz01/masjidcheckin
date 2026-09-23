"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle
 *
 * A small icon button that switches between light and dark mode.
 *   - Adds/removes the `.dark` class on `<html>`.
 *   - Persists the choice to `localStorage` under the key `mc-theme`.
 *   - Defaults to "dark" (the app's signature look) when no saved preference.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // On mount, sync state with the actual DOM class (set by the inline script
  // in layout.tsx BEFORE React hydration).
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mc-theme", next ? "dark" : "light");
    } catch {
      /* localStorage may be blocked */
    }
  }, [dark]);

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        "text-muted hover:text-gold hover:bg-gold/8",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
      )}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          dark ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          dark ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
    </button>
  );
}