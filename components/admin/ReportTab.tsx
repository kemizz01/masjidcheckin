"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, UserCheck, UserX, Users, Hash } from "lucide-react";
import { motion } from "framer-motion";
import Skeleton from "@/components/Skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserInfo {
  id: string;
  name: string;
}

interface PrayerReport {
  prayer: string;
  attended: UserInfo[];
  absent: UserInfo[];
  attendedCount: number;
  absentCount: number;
  unknownCount: number;
  totalUsers: number;
}

interface ReportData {
  date: string;
  totalUsers: number;
  prayers: PrayerReport[];
}

/* ------------------------------------------------------------------ */
/*  Prayer icons & colors                                              */
/* ------------------------------------------------------------------ */

const PRAYER_COLORS: Record<string, string> = {
  Fajr: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Dhuhr: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Asr: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Maghrib: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Isha: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

const PRAYER_DOT: Record<string, string> = {
  Fajr: "bg-sky-400",
  Dhuhr: "bg-amber-400",
  Asr: "bg-orange-400",
  Maghrib: "bg-rose-400",
  Isha: "bg-indigo-400",
};

/* ================================================================== */
/*  ReportTab                                                          */
/* ================================================================== */

export default function ReportTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/report");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message ?? "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={fetchReport}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  /* ---- Empty ---- */
  if (!data || data.totalUsers === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Users className="h-10 w-10 text-muted/40" />
        <p className="text-sm text-muted">No registered users yet.</p>
        <p className="text-xs text-muted/60">
          Register users first to see attendance reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl border border-gold/15 bg-gold/[0.04] px-4 py-3"
      >
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-wider">
            Today&apos;s Report
          </p>
          <p className="text-sm text-foreground">
            <span className="font-semibold">{data.totalUsers}</span> registered
            users
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-gold transition-colors"
          aria-label="Refresh report"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </motion.div>

      {/* Per prayer cards */}
      {data.prayers.map((prayer, i) => (
        <motion.div
          key={prayer.prayer}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="overflow-hidden rounded-2xl border border-line/10 bg-surface/30"
        >
          {/* Prayer header */}
          <div className={cn("flex items-center gap-3 border-b px-4 py-3", PRAYER_COLORS[prayer.prayer]?.split(" ")[0] ?? "bg-surface-2/60")}>
            <div className={cn("h-2.5 w-2.5 rounded-full", PRAYER_DOT[prayer.prayer] ?? "bg-muted")} />
            <span className="flex-1 text-sm font-semibold text-foreground">
              {prayer.prayer}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <UserCheck className="h-3 w-3" />
                {prayer.attendedCount}
              </span>
              <span className="inline-flex items-center gap-1 text-red-400">
                <UserX className="h-3 w-3" />
                {prayer.absentCount}
              </span>
              {prayer.unknownCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Hash className="h-3 w-3" />
                  {prayer.unknownCount}
                </span>
              )}
            </div>
          </div>

          {/* Attended list */}
          {prayer.attended.length > 0 ? (
            <div className="px-4 py-2">
              <p className="mb-1.5 text-[10px] font-medium text-emerald-400/80 uppercase tracking-wider">
                Attended ({prayer.attended.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prayer.attended.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/15"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-center">
              <p className="text-[11px] text-muted/50 italic">
                No attendees yet
              </p>
            </div>
          )}

          {/* Absent list */}
          {prayer.absent.length > 0 && (
            <div className="border-t border-line/5 px-4 py-2">
              <p className="mb-1.5 text-[10px] font-medium text-red-400/70 uppercase tracking-wider">
                Not Yet Attended ({prayer.absent.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prayer.absent.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center rounded-full bg-red-500/8 px-2.5 py-1 text-[11px] font-medium text-red-300/70 border border-red-500/10"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}