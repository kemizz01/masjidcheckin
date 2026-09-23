"use client";

// ===========================================================================
//  Admin Login Page
//
//  A simple password-protected gate for the admin panel.
//  Submits the entered password to `/api/auth`.  On success, the server
//  sets an httpOnly cookie, and the middleware lets the user through.
// ===========================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Loader2, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed");
      }
      // Cookie is set — navigate to the admin panel.
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      {/* ---- Header ---- */}
      <header className="glass-heavy sticky top-0 z-20 flex w-full items-center gap-3 px-3 py-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-gold"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 font-display text-lg tracking-wide text-foreground">
          Admin Login
        </h1>
        <ThemeToggle />
      </header>

      {/* ---- Login card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass w-full max-w-sm rounded-2xl p-6 sm:p-8"
      >
        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 ring-1 ring-gold/20">
            <Shield className="h-7 w-7 text-gold" />
          </div>
        </div>

        <h2 className="text-center font-display text-xl text-foreground">
          Admin Access
        </h2>
        <p className="mt-1 text-center text-sm text-muted">
          Enter the admin password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[11px] font-medium text-muted"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                disabled={loading}
                className="w-full rounded-xl border border-line/20 bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/40 focus:border-gold/50 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]",
              loading || !password.trim()
                ? "cursor-not-allowed bg-line/20 text-muted"
                : "bg-gold-gradient text-navy-950 shadow-sm",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Note */}
        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted/60">
          Default password is <code className="text-gold">admin123</code>.
          Change it via the{" "}
          <code className="text-gold">ADMIN_PASSWORD</code>{" "}
          environment variable.
        </p>
      </motion.div>
    </div>
  );
}