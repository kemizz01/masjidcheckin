"use client";

// ===========================================================================
// MasjidCheckIn — Home Screen
//
// Mobile-first dashboard showing:
//   - Labschool & Akrom branding logos
//   - Live clock & prayer times with countdown
//   - Registration status indicator
//   - Today's attendance status
//   - "Start Attendance" CTA button
// ===========================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CloudSun,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  MapPin,
  CalendarDays,
  Clock3,
  Info,
  UserPlus,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { MOSQUE, BRANDING } from "@/lib/config";
import { useMosqueSettings } from "@/lib/useMosqueSettings";
import {
  PRAYER_TIMES,
  getCurrentPrayer,
  getNextPrayer,
  formatCountdown,
} from "@/lib/prayerTimes";
import { cn, pad2 } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Map each prayer name to its Lucide icon. */
const PRAYER_ICONS: Record<string, LucideIcon> = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sunset,
  Isha: Moon,
};

/* ================================================================== */
/*  Hook: useNow                                                        */
/* ================================================================== */

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ================================================================== */
/*  Animation variants                                                 */
/* ================================================================== */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function HomePage() {
  const now = useNow();
  const { settings } = useMosqueSettings();

  const nextPrayer = useMemo(() => getNextPrayer(now), [now]);
  const currentPrayer = useMemo(() => getCurrentPrayer(now), [now]);

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [now],
  );

  const formattedTime = useMemo(
    () => `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
    [now],
  );

  const countdown = useMemo(
    () => formatCountdown(nextPrayer.diffMs),
    [nextPrayer.diffMs],
  );

  /* ---- Placeholder attendance status ---- */
  const todaysAttendance = useMemo(() => {
    return PRAYER_TIMES.map((p) => ({
      ...p,
      attended: p.name === "Fajr",
    }));
  }, []);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col">
      {/* =================================================================
       *  FIXED BOTTOM CTA BAR
       * ================================================================= */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 pt-2"
      >
        <div className="mx-auto max-w-md">
          <Link
            href="/attend"
            className="group relative flex items-center justify-center gap-2.5 rounded-2xl bg-gold-gradient px-6 py-4 font-semibold text-navy-950 shadow-glow transition hover:shadow-[0_0_0_1px_rgba(217,169,78,0.5),0_14px_40px_-8px_rgba(217,169,78,0.4)] active:scale-[0.97]"
          >
            <Sparkles className="h-5 w-5" />
            <span className="tracking-wide">Start Attendance</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            >
              <ArrowRight className="h-5 w-5" />
            </motion.span>
          </Link>
        </div>
      </motion.div>

      {/* =================================================================
       *  STICKY GLASS HEADER — with dual logos
       * ================================================================= */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-heavy sticky top-0 z-20 flex items-center gap-2.5 px-3 py-3"
      >
        {/* Akrom logo */}
        <img
          src={BRANDING.logoAkromUrl}
          alt="Akrom"
          className="h-9 w-9 rounded-full object-cover ring-1 ring-gold/30"
        />
        {/* Labschool logo */}
        <img
          src={BRANDING.logoLabschoolUrl}
          alt="Labschool"
          className="h-9 w-9 rounded-full object-cover ring-1 ring-gold/20"
        />

        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold text-foreground">
            {settings.name}
          </p>
          <p className="text-[10px] text-muted">MasjidCheckIn · LMS</p>
        </div>

        <ThemeToggle />
      </motion.header>

      {/* =================================================================
       *  MAIN CONTENT
       * ================================================================= */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 space-y-5 px-4 pb-32 pt-4"
      >
        {/* -------- Greeting -------- */}
        <motion.section variants={itemVariants} className="text-center">
          <p className="text-sm font-medium tracking-wider text-muted uppercase">
            Assalamu&apos;alaikum
          </p>
          <p className="mt-0.5 font-display text-2xl text-foreground">
            {settings.name}
          </p>
          <p className="mt-1 text-xs text-muted">{formattedDate}</p>
        </motion.section>

        {/* -------- Registration Status Badge -------- */}
        <motion.section variants={itemVariants}>
          {settings.registration_open ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 animate-pulse-slow">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                <UserPlus className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Face Registration Open
                </p>
                <p className="text-[10px] text-emerald-400/70">
                  New users can register their face now
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-line/10 bg-surface-2/30 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2/60">
                <Lock className="h-4 w-4 text-muted" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted">
                  Registration Closed
                </p>
                <p className="text-[10px] text-muted/60">
                  Only registered users can attend
                </p>
              </div>
            </div>
          )}
        </motion.section>

        {/* -------- Live Clock Card -------- */}
        <motion.section
          variants={itemVariants}
          className="glass relative overflow-hidden rounded-2xl p-6 text-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, #D9A94E 0%, transparent 70%)",
            }}
          />
          <p className="text-[11px] font-medium tracking-[0.18em] text-gold uppercase">
            Current Time
          </p>
          <time
            dateTime={now.toISOString()}
            className="mt-2 block font-display text-[2.85rem] leading-none tabular-nums tracking-wide text-foreground"
          >
            {formattedTime}
          </time>
        </motion.section>

        {/* -------- Next Prayer + Countdown -------- */}
        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gold/[0.06] p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-[0.15em] text-gold uppercase">
                Upcoming Prayer
              </p>
              <h2 className="mt-1 font-display text-2xl text-foreground">
                {nextPrayer.prayer.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {nextPrayer.time.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {/* Countdown display */}
            <div className="rounded-xl bg-gold/10 px-4 py-2.5 text-center">
              <p className="text-[10px] font-medium tracking-wider text-gold uppercase">
                In
              </p>
              <p className="mt-0.5 font-display text-xl tabular-nums text-gold">
                {countdown}
              </p>
            </div>
          </div>
          {/* Animated progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gold/15">
            <motion.div
              className="h-full rounded-full bg-gold/70"
              layout
              style={{
                width: nextPrayer.diffMs
                  ? `${Math.min(100, Math.max(0, 100 - (nextPrayer.diffMs / 7200000) * 100))}%`
                  : "0%",
              }}
            />
          </div>
        </motion.section>

        {/* -------- Full Prayer Times List -------- */}
        <motion.section variants={itemVariants} className="space-y-1.5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
            <Clock3 className="h-3.5 w-3.5" />
            Today&apos;s Prayer Times
          </h3>
          {PRAYER_TIMES.map((p) => {
            const isNext = nextPrayer.prayer.name === p.name;
            const isCurrent = currentPrayer?.name === p.name;
            const Icon = PRAYER_ICONS[p.name] ?? Moon;

            return (
              <motion.div
                key={p.name}
                whileHover={{ scale: 1.01 }}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
                  isNext
                    ? "bg-gold/10 ring-1 ring-gold/30"
                    : isCurrent
                      ? "bg-surface-2/60"
                      : "hover:bg-surface-2/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isNext ? "text-gold" : "text-muted",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isNext ? "text-gold" : "text-foreground",
                    )}
                  >
                    {p.name}
                  </span>
                  {isNext && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-gold">
                      NEXT
                    </span>
                  )}
                </div>
                <span className="text-sm tabular-nums text-muted">
                  {p.time}
                </span>
              </motion.div>
            );
          })}
        </motion.section>

        {/* -------- Today's Status -------- */}
        <motion.section
          variants={itemVariants}
          className="glass rounded-2xl p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Today&apos;s Status
            </h3>
          </div>
          <div className="flex gap-2">
            {todaysAttendance.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-center transition-transform hover:scale-105",
                  p.attended ? "bg-emerald-500/10" : "bg-surface-2/40",
                )}
              >
                <span className="text-[9px] font-bold text-muted uppercase">
                  {p.name.substring(0, 3)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    p.attended ? "text-emerald-400" : "text-muted/60",
                  )}
                >
                  {p.attended ? "✓ Done" : "—"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-gold/[0.04] p-3">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gold" />
            <p className="text-[11px] leading-relaxed text-muted">
              Attendance is recorded per prayer using geofencing and face
              recognition. Tap the button below to check in for the current
              prayer.
            </p>
          </div>
        </motion.section>

        {/* -------- Extra bottom spacing for the sticky CTA -------- */}
        <div className="h-6" />
      </motion.main>
    </div>
  );
}