/* =========================================================================
 * MasjidCheckIn — Root Layout & Theme Initialisation
 * ========================================================================= */

import type { Metadata, Viewport } from "next";
import { Marcellus, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/* ---------- Fonts -----------------------------------------------------------
 * Plus Jakarta Sans — body / UI text (variable weight 200-800).
 * Marcellus — elegant serif for headings (weight 400 only).
 * ------------------------------------------------------------------------- */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

/* ---------- Metadata ------------------------------------------------------- */
export const metadata: Metadata = {
  title: {
    default: "MasjidCheckIn",
    template: "%s · MasjidCheckIn",
  },
  description:
    "A smart mosque attendance system using geofencing, face recognition, and scene verification.",
  appleWebApp: {
    capable: true,
    title: "MasjidCheckIn",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1526",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // app-like feel — prevent pinch-to-zoom
  viewportFit: "cover",
};

/* ---------- Inline theme script (runs BEFORE any paint) ----------------------
 * Reads the saved preference from localStorage or falls back to system
 * preference. Adds the `dark` class on <html> immediately to avoid a flash
 * of wrong colours (FOUC).
 * ------------------------------------------------------------------------- */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("mc-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored || "dark";          // default to dark (the app's signature look)
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) { /* localStorage not available */ }
})();
`;

/* =========================================================================
 * ROOT LAYOUT
 * ========================================================================= */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${marcellus.variable}`}
      suppressHydrationWarning // the inline script may add `dark` before hydration
    >
      <head>
        {/* Inline script runs synchronously — no render-blocking network request. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="relative min-h-screen">
        {/* ---------- Labschool banner background ---------- */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-20"
          style={{
            backgroundImage:
              "url('https://i.ibb.co.com/DfTJH94s/banner-labschool.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.06,
          }}
        />
        {/* ---------- Layered overlay for depth ---------- */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 1000px 600px at 50% 0%, rgba(217,169,78,0.18), transparent 60%), " +
              "radial-gradient(ellipse 700px 500px at 80% 100%, rgba(16,30,51,0.35), transparent 55%)",
          }}
        />

        {children}
      </body>
    </html>
  );
}