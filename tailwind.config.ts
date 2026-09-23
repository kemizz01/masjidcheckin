import type { Config } from "tailwindcss";

/**
 * Tailwind configuration for MasjidCheckIn.
 *
 * Design language:
 *  - Deep Navy Blue backgrounds (primary) with Forest Green as an alternate accent.
 *  - Gold (#D9A94E) for highlights, borders, and primary actions.
 *  - Semantic tokens (`background`, `surface`, `foreground`, `muted`, `line`)
 *    are theme-aware: they read from CSS variables in `app/globals.css` so a
 *    single class like `bg-surface` automatically adapts to light/dark mode.
 */
const config: Config = {
  // Dark mode is toggled by adding/removing the `.dark` class on <html>.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- Brand palette (fixed hex values) -------------------------------
        navy: {
          50: "#EEF3FA",
          100: "#D9E4F0",
          200: "#B4C9E1",
          300: "#86A3C8",
          400: "#5478A0",
          500: "#2F5176",
          600: "#1E3A58",
          700: "#16283F",
          800: "#101E33",
          900: "#0A1526",
          950: "#050B14",
        },
        gold: {
          50: "#FBF4E2",
          100: "#F6E7C3",
          200: "#EFD493",
          300: "#E8C26C",
          400: "#E0B55C",
          500: "#D9A94E",
          600: "#C6943A",
          700: "#A6762D",
          800: "#855D26",
          900: "#6B4A21",
        },
        forest: {
          50: "#EDF7F1",
          100: "#D3EBDD",
          200: "#A6D7BC",
          300: "#6FBE95",
          400: "#3E9C6F",
          500: "#2E7B55",
          600: "#245F42",
          700: "#1F4A36",
          800: "#173527",
          900: "#0F241B",
        },

        // ---- Semantic tokens (read from CSS variables) ----------------------
        // Usage: `bg-background`, `bg-surface`, `bg-surface/60`, `text-muted`,
        //        `border-line`, etc. The `/opacity` modifier works because the
        //        variables store RGB triplets (see globals.css).
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },

      fontFamily: {
        // 'Plus Jakarta Sans' — body / UI text (loaded via next/font).
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
        // 'Marcellus' — premium serif headings (loaded via next/font).
        display: ["var(--font-marcellus)", "ui-serif", "Georgia", "serif"],
      },

      backgroundImage: {
        // Premium gold gradient used on primary CTAs.
        "gold-gradient":
          "linear-gradient(135deg, #EFD493 0%, #D9A94E 45%, #C6943A 100%)",
        // Deep navy gradient used on hero surfaces.
        "navy-gradient":
          "linear-gradient(160deg, #16283F 0%, #0A1526 60%, #050B14 100%)",
      },

      boxShadow: {
        // Soft gold glow for primary actions / highlights.
        glow: "0 0 0 1px rgba(217,169,78,0.35), 0 10px 34px -6px rgba(217,169,78,0.25)",
        // Generic elevated card shadow.
        card: "0 10px 40px -12px rgba(5, 11, 20, 0.5)",
      },

      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
