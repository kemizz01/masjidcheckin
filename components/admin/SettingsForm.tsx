"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
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
      } else {
        // No settings row yet — pre-fill from lib/config.ts defaults.
        setName("Masjid Al-Ikhlas");
        setLat("-6.2088");
        setLng("106.8456");
        setRadius("150");
        setRegOpen(false);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

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
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button onClick={fetchSettings} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line/10 bg-surface/30 p-4 space-y-4">
        {/* Mosque name */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Mosque Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-gold/50 focus:outline-none"
          />
        </div>

        {/* Latitude */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">Latitude</label>
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
          <label className="mb-1 block text-[11px] font-medium text-muted">Longitude</label>
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

        {/* Registration toggle */}
        <div className="rounded-xl border border-line/15 bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Face Registration
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                When enabled, anyone can register their face at the attendance
                screen. Disable after all Jamaah are registered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegOpen(!regOpen)}
              className={cn(
                "ml-3 flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors",
                regOpen ? "bg-emerald-500/80" : "bg-line/30",
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm",
                  regOpen ? "ml-auto" : "ml-0",
                )}
              >
                {regOpen ? (
                  <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5 text-muted" />
                )}
              </motion.div>
            </button>
          </div>
        </div>

        {/* Save button */}
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
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Settings"}
        </button>

        {msg && (
          <p className={cn("text-center text-xs", msg.includes("success") ? "text-emerald-400" : "text-red-400")}>
            {msg}
          </p>
        )}
      </div>

      {/* Live preview hint */}
      <div className="rounded-2xl bg-gold/[0.04] p-4 text-xs leading-relaxed text-muted">
        <strong className="text-foreground">ℹ️ Note:</strong> The home screen reads these
        values from Supabase at build time (via <code className="text-gold">lib/config.ts</code>).
        In a future phase, we will add a server-side fetch so changes take effect
        without a redeploy.
      </div>
    </div>
  );
}