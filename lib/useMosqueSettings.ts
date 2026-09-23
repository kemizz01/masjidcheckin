"use client";

// ===========================================================================
//  useMosqueSettings — Client Hook
//
//  Fetches the live mosque settings from the Supabase-backed
//  `/api/settings` endpoint on mount, falling back to the build-time
//  constants in `lib/config.ts`.
//
//  This ensures the home screen, attend flow, and admin panel always
//  reflect the latest values without a redeploy.
// ===========================================================================

import { useEffect, useState, useCallback } from "react";
import { MOSQUE } from "@/lib/config";

export interface MosqueSettings {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  registration_open: boolean;
  scene_detection: boolean;
  attendance_open: boolean;
}

export function useMosqueSettings() {
  const [settings, setSettings] = useState<MosqueSettings>({
    id: 1,
    name: MOSQUE.name,
    latitude: MOSQUE.latitude,
    longitude: MOSQUE.longitude,
    geofence_radius: MOSQUE.geofenceRadiusMeters,
    registration_open: MOSQUE.registrationOpen,
    scene_detection: MOSQUE.sceneDetectionEnabled,
    attendance_open: MOSQUE.attendanceOpen,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.settings) {
        setSettings({
          id: data.settings.id ?? 1,
          name: data.settings.name ?? MOSQUE.name,
          latitude: data.settings.latitude ?? MOSQUE.latitude,
          longitude: data.settings.longitude ?? MOSQUE.longitude,
          geofence_radius: data.settings.geofence_radius ?? MOSQUE.geofenceRadiusMeters,
          registration_open: data.settings.registration_open ?? MOSQUE.registrationOpen,
          scene_detection: data.settings.scene_detection ?? MOSQUE.sceneDetectionEnabled,
          attendance_open: data.settings.attendance_open ?? MOSQUE.attendanceOpen,
        });
      }
      setError("");
    } catch (err: any) {
      // Silently fall back to the hardcoded defaults — the UI still works.
      console.warn("[useMosqueSettings] Could not fetch remote settings:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings };
}