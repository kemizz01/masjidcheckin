"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  RefreshCw,
  Users,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import Skeleton from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import { classLabel, classRank } from "@/lib/classes";
import { exportReportToXlsx, type ReportPayload, type ReportUserRow } from "@/lib/exportReport";

/* ------------------------------------------------------------------ */
/*  Prayer colors                                                     */
/* ------------------------------------------------------------------ */

const PRAYER_COLORS: Record<string, string> = {
  Fajr: "text-sky-400",
  Dhuhr: "text-amber-400",
  Asr: "text-orange-400",
  Maghrib: "text-rose-400",
  Isha: "text-indigo-400",
};

const PRAYER_BG: Record<string, string> = {
  Fajr: "bg-sky-500/15",
  Dhuhr: "bg-amber-500/15",
  Asr: "bg-orange-500/15",
  Maghrib: "bg-rose-500/15",
  Isha: "bg-indigo-500/15",
};

/* ================================================================== */
/*  ReportTab                                                          */
/* ================================================================== */

export default function ReportTab() {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [filterClass, setFilterClass] = useState("all");
  const [filterPrayer, setFilterPrayer] = useState("all");
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

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

  /* ---- Export ---- */
  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      exportReportToXlsx(data);
    } catch (err: any) {
      console.error("[export] Error:", err);
    } finally {
      setExporting(false);
    }
  };

  /* ---- Filtered + grouped user data ---- */
  const classGroups = useMemo(() => {
    if (!data) return [];
    const groups: { className: string; users: ReportUserRow[] }[] = [];
    const visible = data.users.filter((u) => {
      if (filterClass !== "all" && classLabel(u.class_name) !== filterClass) return false;
      if (filterPrayer !== "all" && !u.attendance[filterPrayer]) return false;
      return true;
    });

    for (const u of visible) {
      const label = classLabel(u.class_name);
      let g = groups.find((x) => x.className === label);
      if (!g) {
        g = { className: label, users: [] };
        groups.push(g);
      }
      g.users.push(u);
    }
    return groups;
  }, [data, filterClass, filterPrayer]);

  /* ---- Distinct classes in the report ---- */
  const populatedClasses = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set(data.users.map((u) => classLabel(u.class_name)));
    return Array.from(set).sort((a, b) => classRank(a) - classRank(b));
  }, [data]);

  const toggleCollapse = (className: string) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(className)) next.delete(className);
      else next.add(className);
      return next;
    });
  };

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
      {/* ================================================================
       *  HEADER
       * ================================================================ */}
      <div className="flex items-center justify-between rounded-2xl border border-gold/15 bg-gold/[0.04] px-4 py-3">
        <div>
          <p className="text-[11px] font-medium text-gold uppercase tracking-wider">
            Today&apos;s Report
          </p>
          <p className="text-sm text-foreground">
            <span className="font-semibold">{data.totalUsers}</span> registered
            users · <span className="font-semibold">{data.prayers.length}</span>{" "}
            prayers
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
              exporting
                ? "cursor-wait bg-line/20 text-muted"
                : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
            )}
          >
            {exporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Export .xlsx
          </button>
          <button
            onClick={fetchReport}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-gold transition-colors"
            aria-label="Refresh report"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ================================================================
       *  FILTERS
       * ================================================================ */}
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-line/10 bg-surface/30 px-3 py-1.5">
          <Search className="h-3 w-3 text-muted" />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none"
          >
            <option value="all">All classes</option>
            {populatedClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-line/10 bg-surface/30 px-3 py-1.5">
          <select
            value={filterPrayer}
            onChange={(e) => setFilterPrayer(e.target.value)}
            className="bg-transparent text-xs text-foreground focus:outline-none"
          >
            <option value="all">All prayers</option>
            {data.prayers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================================================================
       *  PER-PRAYER SUMMARY ROW
       * ================================================================ */}
      <div className="flex gap-2 overflow-x-auto">
        {data.perPrayer.map((p, i) => (
          <motion.div
            key={p.prayer}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2.5",
              PRAYER_BG[p.prayer] ?? "bg-surface-2/40",
            )}
          >
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", PRAYER_COLORS[p.prayer])}>
              {p.prayer.substring(0, 3)}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {p.attendedCount}/{p.totalUsers}
            </span>
            <span className="text-[10px] text-muted/70">
              {p.absentCount} absent
            </span>
          </motion.div>
        ))}
      </div>

      {/* ================================================================
       *  PER-CLASS SECTIONS
       * ================================================================ */}
      {classGroups.map((group) => {
        const isCollapsed = collapsedClasses.has(group.className);
        return (
          <div
            key={group.className}
            className="overflow-hidden rounded-2xl border border-line/10 bg-surface/30"
          >
            {/* Class header (collapsible) */}
            <button
              onClick={() => toggleCollapse(group.className)}
              className="flex w-full items-center gap-2 border-b border-line/10 bg-surface-2/40 px-4 py-3 text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {group.className}
              </span>
              <span className="rounded-md bg-gold/10 px-1.5 py-0.5 text-[10px] text-gold">
                {group.users.length}
              </span>
              <span className="text-[10px] text-muted/70">
                · {group.users.filter((u) => u.attendedCount > 0).length} hadir
              </span>
            </button>

            {/* Students table */}
            {!isCollapsed && (
              <div className="divide-y divide-line/5">
                {/* Table header */}
                <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">
                  <span className="w-1/3 shrink-0">Nama</span>
                  {data.prayers.map((p) => (
                    <span
                      key={p}
                      className={cn("flex-1 text-center", PRAYER_COLORS[p])}
                    >
                      {p.substring(0, 3)}
                    </span>
                  ))}
                  <span className="w-10 text-center">Total</span>
                </div>

                {/* Students */}
                {group.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface-2/40"
                  >
                    <span className="w-1/3 truncate text-xs font-medium text-foreground">
                      {user.name}
                    </span>
                    {data.prayers.map((p) => (
                      <span
                        key={p}
                        className="flex flex-1 items-center justify-center"
                      >
                        {user.attendance[p] ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center">
                            <X className="h-3 w-3 text-red-400/60" />
                          </span>
                        )}
                      </span>
                    ))}
                    <span className="flex w-10 items-center justify-center text-xs font-semibold tabular-nums text-foreground">
                      {user.attendedCount}/{data.prayers.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {classGroups.length === 0 && data.totalUsers > 0 && (
        <div className="py-6 text-center text-xs text-muted">
          No users match the current filters.
        </div>
      )}
    </div>
  );
}