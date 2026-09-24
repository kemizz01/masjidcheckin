"use client";

// ===========================================================================
// MasjidCheckIn — Self Registration (user-facing)
//
// Lets a jamaah register their own face when the admin has enabled
// "Face Registration" in the Settings tab.
//
// Flow:
//   1. Form   → enter full name + pick class (X-A … XII-H)
//   2. Scan   → live camera; auto-captures until a face is accepted
//   3. Done   → confirmation
//
// If registration is disabled, a closed screen is shown.
// ===========================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ScanFace,
  UserRound,
  XCircle,
} from "lucide-react";

import CameraScanner from "@/components/CameraScanner";
import ThemeToggle from "@/components/ThemeToggle";
import { useMosqueSettings } from "@/lib/useMosqueSettings";
import { registerFace } from "@/lib/api";
import { CLASSES } from "@/lib/classes";
import { cn } from "@/lib/utils";

type Phase = "form" | "scan" | "submitting" | "done";

export default function RegisterPage() {
  const { settings, loading: settingsLoading } = useMosqueSettings();

  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  // Keep the name/class available inside the capture callback.
  const infoRef = useRef({ name: "", className: "" });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    infoRef.current = { name, className };
  }, [name, className]);

  /* ------------------------------------------------------------------
   *  Capture handler — called by the camera's auto-capture loop.
   * ------------------------------------------------------------------ */
  const handleCapture = useCallback(async (image: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { name: n, className: c } = infoRef.current;
      const result = await registerFace(image, n, c);
      if (!mountedRef.current) return;
      setPhase("done");
      if (result?.warnings?.length) {
        console.warn("[register] warnings:", result.warnings);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setAttempts((a) => a + 1);
      setError(err?.message ?? "Registration failed. Please try again.");
    } finally {
      busyRef.current = false;
    }
  }, []);

  /* ==================================================================
   *  RENDER
   * ================================================================== */
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col">
      {/* Header */}
      <header className="glass-heavy sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-gold"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 font-display text-[17px] tracking-wide text-foreground">
          Face Registration
        </h1>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col px-4 py-6">
        {/* ------------------------------------------------------------
            Settings still loading
            ------------------------------------------------------------ */}
        {settingsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : !settings.registration_open ? (
          /* ----------------------------------------------------------
             Registration closed
             ---------------------------------------------------------- */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
              <Lock className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="mt-6 font-display text-2xl text-foreground">
              Registration Closed
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Face registration is currently disabled. Please ask an admin to
              open it, then try again.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-navy-950 shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ========================================================
                PHASE: FORM
                ======================================================== */}
            {phase === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 ring-1 ring-gold/20">
                    <UserRound className="h-8 w-8 text-gold" />
                  </div>
                  <h2 className="mt-4 font-display text-2xl text-foreground">
                    Register Your Face
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Enter your details, then take a clear selfie.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-line/10 bg-surface/30 p-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ahmad Fauzi"
                      className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-gold/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Class
                    </label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className={cn(
                        "w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm focus:border-gold/50 focus:outline-none",
                        className ? "text-foreground" : "text-muted/60",
                      )}
                    >
                      <option value="">Select class…</option>
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setError("");
                    setPhase("scan");
                  }}
                  disabled={!name.trim() || !className}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition active:scale-[0.98]",
                    !name.trim() || !className
                      ? "cursor-not-allowed bg-line/20 text-muted"
                      : "bg-gold-gradient text-navy-950 shadow-glow",
                  )}
                >
                  <ScanFace className="h-5 w-5" />
                  Continue to Face Scan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* ========================================================
                PHASE: SCAN
                ======================================================== */}
            {phase === "scan" && (
              <motion.div
                key="scan"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h2 className="font-display text-xl text-foreground">
                    Hold still
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Look straight at the camera in a well-lit area.
                  </p>
                </div>

                <CameraScanner
                  guide="face"
                  facingMode="user"
                  mirroredPreview
                  autoCaptureInterval={1800}
                  onCapture={handleCapture}
                  className="rounded-3xl"
                />

                {/* Status */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/[0.08] px-4 py-2 text-sm text-gold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanning… {attempts > 0 ? `(attempt ${attempts + 1})` : ""}
                  </span>

                  {error && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-xs text-red-400">
                        <XCircle className="h-4 w-4" />
                        {error}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setError("");
                      setPhase("form");
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Edit my details
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================
                PHASE: DONE
                ======================================================== */}
            {phase === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30"
                >
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </motion.div>
                <h2 className="mt-6 font-display text-2xl text-foreground">
                  Registration Complete
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  Welcome, <strong className="text-foreground">{name}</strong>
                  {className ? ` (${className})` : ""}. You can now check in for
                  prayers using your face.
                </p>
                <Link
                  href="/attend"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-navy-950 shadow-sm transition active:scale-95"
                >
                  <ScanFace className="h-4 w-4" />
                  Go to Attendance
                </Link>
                <Link
                  href="/"
                  className="mt-3 text-xs text-muted hover:text-gold"
                >
                  Back to Home
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
