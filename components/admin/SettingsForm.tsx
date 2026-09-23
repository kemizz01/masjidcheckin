"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ScanFace,
  CalendarCheck,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MosqueSettings {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  registration_open: boolean;
  scene_detection: boolean;
  attendance_open: boolean;
}

/* ------------------------------------------------------------------ */
/*  ToggleRow — reusable animated switch                               */
/* ------------------------------------------------------------------ */

function ToggleRow({
  icon,
  title,
  description,
  enabled,
  onChange,
  onLabel = "On",
  offLabel = "Off",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        enabled
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : "border-line/15 bg-surface-2/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
              enabled ? "bg-emerald-500/15" : "bg-surface-2",
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {description}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider",
                enabled ? "text-emerald-400" : "text-muted/50",
              )}
            >
              {enabled ? onLabel : offLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={cn(
            "flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors",
            enabled ? "bg-emerald-500/80" : "bg-line/30",
          )}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm",
              enabled ? "ml-auto" : "ml-0",
            )}
          >
            {enabled ? (
              <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5 text-muted" />
            )}
          </motion.div>
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SettingsForm  (Admin Panel / Settings tab)                         */
/* ================================================================== */

export default function SettingsForm() {
  const [settings, setSettings] = useState<MosqueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form fields (initialised after fetch).
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [regOpen, setRegOpen] = useState(false);
  const [sceneDetection, setSceneDetection] = useState(true);
  const [attendanceOpen, setAttendanceOpen] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* ---- Fetch ---- */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setName(data.settings.name ?? "");
        setLat(String(data.settings.latitude ?? ""));
        setLng(String(data.settings.longitude ?? ""));
        setRadius(String(data.settings.geofence_radius ?? ""));
        setRegOpen(data.settings.registration_open ?? false);
        setSceneDetection(data.settings.scene_detection ?? true);
        setAttendanceOpen(data.settings.attendance_open ?? true);
      } else {
        // No settings row yet — pre-fill from lib/config.ts defaults.
        setName("Masjid Al-Ikhlas");
        setLat("-6.2088");
        setLng("106.8456");
        setRadius("150");
        setRegOpen(false);
        setSceneDetection(true);
        setAttendanceOpen(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---- Save ---- */
  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          geofence_radius: parseInt(radius, 10),
          registration_open: regOpen,
          scene_detection: sceneDetection,
          attendance_open: attendanceOpen,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setMsg("Settings saved successfully.");
      await fetchSettings(); // refresh with server-side values
    } catch (err: any) {
      setMsg(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ============================================================
       *  FEATURE TOGGLES
       * ============================================================ */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Feature Controls
        </h2>

        {/* Attendance on/off */}
        <ToggleRow
          icon={
            <CalendarCheck
              className={cn(
                "h-4 w-4",
                attendanceOpen ? "text-emerald-400" : "text-muted",
              )}
            />
          }
          title="Attendance (Absensi)"
          description={
            attendanceOpen
              ? "Users can record their attendance right now."
              : "Attendance is paused. Users cannot check in until re-enabled."
          }
          enabled={attendanceOpen}
          onChange={setAttendanceOpen}
          onLabel="Open"
          offLabel="Closed"
        />

        {/* Scene detection */}
        <ToggleRow
          icon={
            <ScanFace
              className={cn(
                "h-4 w-4",
                sceneDetection ? "text-emerald-400" : "text-muted",
              )}
            />
          }
          title="Scene Detection"
          description={
            sceneDetection
              ? "Users must scan their surroundings to verify attendance."
              : "Users skip the scene scan and check in after face recognition."
          }
          enabled={sceneDetection}
          onChange={setSceneDetection}
          onLabel="Required"
          offLabel="Skipped"
        />

        {/* Face registration */}
        <ToggleRow
          icon={
            <UserPlus
              className={cn(
                "h-4 w-4",
                regOpen ? "text-emerald-400" : "text-muted",
              )}
            />
          }
          title="Face Registration"
          description={
            regOpen
              ? "Anyone can register their face at the attendance screen."
              : "Face registration is locked. Only admins can add users."
          }
          enabled={regOpen}
          onChange={setRegOpen}
          onLabel="Open"
          offLabel="Locked"
        />
      </div>

      {/* ============================================================
       *  MOSQUE DETAILS
       * ============================================================ */}
      <div className="space-y-4 rounded-2xl border border-line/10 bg-surface/30 p-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Mosque Details
        </h2>

        {/* Mosque name */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            Mosque Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-gold/50 focus:outline-none"
          />
        </div>

        {/* Latitude */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>

        {/* Longitude */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>

        {/* Geofence radius */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            Geofence Radius (metres)
          </label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      {/* ============================================================
       *  SAVE
       * ============================================================ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]",
          saving
            ? "cursor-not-allowed bg-line/20 text-muted"
            : "bg-gold-gradient text-navy-950 shadow-sm",
        )}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving…" : "Save Settings"}
      </button>

      {msg && (
        <p
          className={cn(
            "text-center text-xs",
            msg.includes("success") ? "text-emerald-400" : "text-red-400",
          )}
        >
          {msg}
        </p>
      )}

      {/* Live preview hint */}
      <div className="rounded-2xl bg-gold/[0.04] p-4 text-xs leading-relaxed text-muted">
        <strong className="text-foreground">ℹ️ Note:</strong> Feature toggles
        take effect immediately for all users. Changes are stored in Supabase
        and applied on the next request — no redeploy needed.
      </div>
    </div>
  );
}
