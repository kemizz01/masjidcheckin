"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Calendar, MapPin, AlertTriangle } from "lucide-react";
import Skeleton from "@/components/Skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LogEntry {
  id: string;
  prayer_name: string;
  timestamp: string;
  location_status: string;
  scene_score: number | null;
  scene_passed: boolean;
  face_distance: number | null;
  user_id: string | null;
  users: { name: string; archive_photo_url: string } | null;
}

/* ================================================================== */
/*  LogsTable  (Dashboard Tab)                                         */
/* ================================================================== */

export default function LogsTable() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/logs?limit=60");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  /* ---- Empty ---- */
  if (!logs || logs.length === 0) {
    return (
      <div className="py-10 text-center">
        <Calendar className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm text-muted">No attendance records yet.</p>
      </div>
    );
  }

  /* ---- Table ---- */
  return (
    <div className="space-y-1">
      {/* Card-style rows (mobile-friendly alternative to a <table>) */}
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-xl bg-surface/40 px-4 py-3 text-sm"
        >
          {/* Date + time */}
          <div className="w-20 shrink-0 text-right text-[11px] text-muted">
            {new Date(entry.timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
            <br />
            {new Date(entry.timestamp).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {/* Prayer name */}
          <span className="w-16 shrink-0 text-xs font-semibold text-gold">
            {entry.prayer_name}
          </span>

          {/* User */}
          <span className="flex-1 truncate text-foreground">
            {entry.users?.name ?? (entry.user_id ? "Unknown" : "—")}
          </span>

          {/* Location status */}
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              entry.location_status === "inside"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400",
            )}
          >
            {entry.location_status === "inside" ? "Inside" : "Outside"}
          </span>

          {/* Scene score */}
          {entry.scene_score !== null && (
            <span className="shrink-0 text-[11px] tabular-nums text-muted">
              {Math.round(entry.scene_score * 100)}%
            </span>
          )}
        </div>
      ))}

      {/* Refresh button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    </div>
  );
}