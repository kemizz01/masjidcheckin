"use client";

// ===========================================================================
// MasjidCheckIn — Attendance Flow
//
// A guided four-step flow:
//   1. GPS Check   → verifies the user is within the mosque's geofence.
//   2. Face Scan   → captures face snapshots & sends to `/api/recognize-face`.
//   3. Scene Scan  → captures room snapshots & sends to `/api/verify-scene`.
//   4. Success     → shows confirmation and summary.
//
// AI processing happens on the backend (Phase 3).  In Phase 2 we use the
// `MOCK_AI` flag (see `lib/config.ts`) to simulate the API responses so the
// full UI can be developed and demoed independently.
// ===========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CloudSun,
  Landmark,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import StepsIndicator, { type StepDefinition } from "@/components/StepsIndicator";
import CameraScanner, { type CameraScannerHandle } from "@/components/CameraScanner";
import ThemeToggle from "@/components/ThemeToggle";
import Skeleton from "@/components/Skeleton";

import { MOSQUE } from "@/lib/config";
import { useMosqueSettings } from "@/lib/useMosqueSettings";
import {
  recognizeFace,
  verifyScene,
  saveAttendance,
  resetMockCounters,
  type FaceResult,
  type SceneResult,
} from "@/lib/api";
import {
  getNextPrayer,
  getCurrentPrayer,
  type Prayer,
} from "@/lib/prayerTimes";
import {
  cn,
  haversineMeters,
  formatDistanceMeters,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRAYER_ICONS: Record<string, LucideIcon> = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sunset,
  Isha: Moon,
};

/** The four steps displayed in the progress indicator. */
const STEPS: StepDefinition[] = [
  { id: 1, label: "Location", icon: MapPin },
  { id: 2, label: "Face", icon: ScanFace },
  { id: 3, label: "Scene", icon: Landmark },
  { id: 4, label: "Done", icon: CheckCircle2 },
];

/* ================================================================== */
/*  Animation constants                                                */
/* ================================================================== */

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
};

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function AttendPage() {
  /* ---- Live mosque settings (fetched from Supabase, falls back to config.ts) ---- */
  const { settings } = useMosqueSettings();
  // Keep a ref so the GPS callback always reads the latest coordinates
  // without needing to be recreated on every settings change.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /* ---- Step state ---- */
  const [step, setStep] = useState(1);
  // Track the direction of step transitions for a smooth slide animation.
  const [dir, setDir] = useState(1);

  /* ---- GPS state ---- */
  const [gpsStatus, setGpsStatus] = useState<"checking" | "inside" | "outside" | "error">("checking");
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState("");

  /* ---- Face scan state ---- */
  const [faceStatus, setFaceStatus] = useState<"scanning" | "matched" | "error">("scanning");
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);

  /* ---- Scene scan state ---- */
  const [sceneStatus, setSceneStatus] = useState<"scanning" | "passed" | "error">("scanning");
  const [sceneResult, setSceneResult] = useState<SceneResult | null>(null);

  /* ---- Success step: brief "saving" skeleton then confirmation ---- */
  const [saving, setSaving] = useState(false);

  /* ---- Refs & guards ---- */
  const mountedRef = useRef(true);
  const faceBusy = useRef(false);
  const sceneBusy = useRef(false);

  // Reset mock counters so each visit starts fresh.
  useEffect(() => {
    resetMockCounters();
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---- Compute current/next prayer for summary display ---- */
  const now = useMemo(() => new Date(), []);
  const nextPrayer = useMemo(() => getNextPrayer(now), [now]);
  const currentPrayer = useMemo(() => getCurrentPrayer(now), [now]);

  /* =================================================================
   *  GPS CHECK (step 1)
   * ================================================================= */
  const checkLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      setGpsError("Geolocation is not supported on this device.");
      return;
    }
    setGpsStatus("checking");
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const distance = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          settingsRef.current.latitude,
          settingsRef.current.longitude,
        );
        setGpsDistance(distance);

        if (distance <= settingsRef.current.geofence_radius) {
          setGpsStatus("inside");
          // Auto-advance to face scan after a brief celebratory pause.
          setTimeout(() => {
            if (!mountedRef.current) return;
            setDir(1);
            setStep(2);
          }, 1200);
        } else {
          setGpsStatus("outside");
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        setGpsStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError("Location permission was denied. Please enable location services.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError("Unable to determine your location. Please try again.");
            break;
          case err.TIMEOUT:
            setGpsError("Location request timed out. Please try again.");
            break;
          default:
            setGpsError(err.message ?? "Unknown location error.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      },
    );
  }, []);

  // Start GPS check on mount.
  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  /* =================================================================
   *  FACE CAPTURE HANDLER (step 2)
   * ================================================================= */
  const handleFaceCapture = useCallback(async (image: string) => {
    if (faceBusy.current || faceStatus !== "scanning") return;
    faceBusy.current = true;
    try {
      const result = await recognizeFace(image);
      if (!mountedRef.current) return;
      if (result.matched && result.name) {
        setFaceStatus("matched");
        setFaceResult(result);
        // Brief pause so the user sees "Verified", then advance.
        setTimeout(() => {
          if (!mountedRef.current) return;
          setDir(1);
          setStep(3);
          setFaceStatus("scanning"); // reset for potential retry
        }, 1200);
      }
      // If not matched, we keep scanning — the auto-capture loop continues.
    } catch {
      if (!mountedRef.current) return;
      setFaceStatus("error");
    } finally {
      faceBusy.current = false;
    }
  }, [faceStatus]);

  /* =================================================================
   *  SCENE CAPTURE HANDLER (step 3)
   * ================================================================= */
  const handleSceneCapture = useCallback(async (image: string) => {
    if (sceneBusy.current || sceneStatus !== "scanning") return;
    sceneBusy.current = true;
    try {
      const result = await verifyScene(image);
      if (!mountedRef.current) return;
      if (result.passed) {
        setSceneStatus("passed");
        setSceneResult(result);
        // Advance to step 4 AND persist the attendance record to Supabase.
        setTimeout(async () => {
          if (!mountedRef.current) return;
          setDir(1);
          setStep(4);
          setSaving(true);

          // Determine which prayer is being recorded (current prayer period,
          // or the next upcoming one as fallback).
          const prayerName =
            getCurrentPrayer(new Date())?.name ??
            getNextPrayer(new Date()).prayer.name;

          try {
            await saveAttendance({
              user_id: faceResult?.user?.id ?? null,
              user_name: faceResult?.name ?? null,
              prayer_name: prayerName,
              location_status: "inside", // GPS already validated in step 1
              scene_score: result.score ?? null,
              scene_passed: true,
              face_distance: faceResult?.distance ?? null,
            });
          } catch (e) {
            console.error("[attend] Failed to persist attendance:", e);
          } finally {
            if (mountedRef.current) setSaving(false);
          }
        }, 1000);
      }
    } catch {
      if (!mountedRef.current) return;
      setSceneStatus("error");
    } finally {
      sceneBusy.current = false;
    }
  }, [sceneStatus]);

  /* =================================================================
   *  Prayer info for the success summary
   * ================================================================= */
  const recordedPrayer: Prayer | null = currentPrayer ?? (nextPrayer ? nextPrayer.prayer : null);
  const PrayerIcon = recordedPrayer ? (PRAYER_ICONS[recordedPrayer.name] ?? Moon) : Moon;

  /* =================================================================
   *  RENDER
   * ================================================================= */
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col">
      {/* ================================================================
       *  HEADER — back + title + theme toggle
       * ================================================================ */}
      <header className="glass-heavy sticky top-0 z-20 flex items-center gap-3 px-3 py-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-gold"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 font-display text-[17px] tracking-wide text-foreground">
          Attendance
        </h1>
        <ThemeToggle />
      </header>

      {/* ================================================================
       *  STEP INDICATOR
       * ================================================================ */}
      <div className="px-4 pt-5">
        <StepsIndicator steps={STEPS} current={step} />
      </div>

      {/* ================================================================
       *  STEP CONTENT (animated transitions)
       * ================================================================ */}
      <main className="relative flex-1 px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {/* ============================================================
           *  STEP 1 — GPS CHECK
           * ============================================================ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className="mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-gold/[0.08] ring-1 ring-gold/15">
                {gpsStatus === "checking" && (
                  <Loader2 className="h-10 w-10 animate-spin text-gold" />
                )}
                {gpsStatus === "inside" && (
                  <ShieldCheck className="h-10 w-10 text-emerald-400" />
                )}
                {gpsStatus === "outside" && (
                  <ShieldAlert className="h-10 w-10 text-amber-400" />
                )}
                {gpsStatus === "error" && (
                  <XCircle className="h-10 w-10 text-red-400" />
                )}
              </div>

              {/* Title */}
              <h2 className="mt-5 font-display text-2xl text-foreground">
                {gpsStatus === "checking" && "Checking your location"}
                {gpsStatus === "inside" && "You're at the mosque"}
                {gpsStatus === "outside" && "Outside the perimeter"}
                {gpsStatus === "error" && "Location unavailable"}
              </h2>

              {/* Description */}
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                {gpsStatus === "checking" &&
                  `Making sure you're within ${settings.geofence_radius} m of ${settings.name}.`}
                {gpsStatus === "inside" &&
                  `Distance: ${formatDistanceMeters(gpsDistance)} from ${settings.name}.`}
                {gpsStatus === "outside" &&
                  `You are ${formatDistanceMeters(gpsDistance)} away — please move closer to the mosque.`}
                {gpsStatus === "error" &&
                  (gpsError || "Could not access your location.")}
              </p>

              {/* Spinner / Retry */}
              {gpsStatus === "checking" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Acquiring GPS signal…
                </div>
              )}
              {gpsStatus === "outside" && (
                <button
                  onClick={checkLocation}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check again
                </button>
              )}
              {gpsStatus === "error" && (
                <button
                  onClick={checkLocation}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              )}
            </motion.div>
          )}

          {/* ============================================================
           *  STEP 2 — FACE SCAN
           * ============================================================ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="space-y-4"
            >
              {/* Camera */}
              <CameraScanner
                guide="face"
                facingMode="user"
                mirroredPreview
                autoCaptureInterval={1500} // snap every 1.5s
                onCapture={handleFaceCapture}
                className="rounded-3xl"
              />

              {/* Status bar */}
              <div className="flex items-center justify-center text-sm">
                {faceStatus === "scanning" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/[0.08] px-4 py-2 text-gold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanning… hold still
                  </span>
                )}
                {faceStatus === "matched" && faceResult && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    Recognised: <strong className="text-emerald-300">{faceResult.name}</strong>
                  </span>
                )}
                {faceStatus === "error" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    Face recognition failed
                    <button
                      onClick={() => setFaceStatus("scanning")}
                      className="ml-1 underline"
                    >
                      Retry
                    </button>
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================
           *  STEP 3 — SCENE SCAN
           * ============================================================ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="space-y-4"
            >
              {/* Camera (rear-facing, no mirroring) */}
              <CameraScanner
                guide="scene"
                facingMode="environment"
                mirroredPreview={false}
                autoCaptureInterval={1500}
                onCapture={handleSceneCapture}
                className="rounded-3xl"
              />

              {/* Status bar */}
              <div className="flex items-center justify-center text-sm">
                {sceneStatus === "scanning" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/[0.08] px-4 py-2 text-gold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanning the room…
                  </span>
                )}
                {sceneStatus === "passed" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    Scene verified
                    {sceneResult?.label && (
                      <span className="text-emerald-300/80">
                        · {sceneResult.label}
                      </span>
                    )}
                  </span>
                )}
                {sceneStatus === "error" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    Scene verification failed
                    <button
                      onClick={() => setSceneStatus("scanning")}
                      className="ml-1 underline"
                    >
                      Retry
                    </button>
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================
           *  STEP 4 — SUCCESS
           * ============================================================ */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="flex flex-col items-center text-center"
            >
              {saving ? (
                /* ---- Saving skeleton ---- */
                <div className="mt-8 w-full space-y-6">
                  <h2 className="font-display text-2xl text-foreground">
                    Saving your attendance…
                  </h2>
                  <div className="space-y-3">
                    <Skeleton className="mx-auto h-16 w-48 rounded-xl" />
                    <Skeleton className="mx-auto h-4 w-32" />
                    <Skeleton className="mx-auto h-4 w-24" />
                  </div>
                </div>
              ) : (
                /* ---- Confirmation ---- */
                <>
                  {/* Checkmark animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                      delay: 0.1,
                    }}
                    className="mt-6"
                  >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                  </motion.div>

                  <h2 className="mt-5 font-display text-2xl text-foreground">
                    Attendance Recorded
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    May your prayer be accepted.
                  </p>

                  {/* Summary card */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6 w-full space-y-3 rounded-2xl border border-line/10 bg-surface/50 p-5 text-left"
                  >
                    <SummaryRow
                      icon={<PrayerIcon className="h-4 w-4 text-gold" />}
                      label="Prayer"
                      value={recordedPrayer?.name ?? "—"}
                    />
                    <SummaryRow
                      icon={<Building2 className="h-4 w-4 text-gold" />}
                      label="Mosque"
                      value={settings.name}
                    />
                    <SummaryRow
                      icon={<MapPin className="h-4 w-4 text-gold" />}
                      label="Location"
                      value={`${formatDistanceMeters(gpsDistance)} from mosque`}
                    />
                    {faceResult?.name && (
                      <SummaryRow
                        icon={<ScanFace className="h-4 w-4 text-gold" />}
                        label="Verified as"
                        value={faceResult.name}
                      />
                    )}
                  </motion.div>

                  {/* Done button */}
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-navy-950 shadow-sm transition active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Back to Home
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ================================================================== */
/*  Small helper: SummaryRow                                           */
/* ================================================================== */

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}