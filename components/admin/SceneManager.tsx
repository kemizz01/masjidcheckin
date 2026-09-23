"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  Trash2,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SceneRef {
  id: string;
  type: "valid" | "invalid";
  label: string | null;
  image_url: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/* ================================================================== */
/*  SceneManager  (Admin Panel / Scene Configuration tab)              */
/* ================================================================== */

export default function SceneManager() {
  const [scenes, setScenes] = useState<SceneRef[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload form state
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upPreview, setUpPreview] = useState<string | null>(null);
  const [upType, setUpType] = useState<"valid" | "invalid">("valid");
  const [upLabel, setUpLabel] = useState("");
  const [upBusy, setUpBusy] = useState(false);
  const [upMsg, setUpMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---- Fetch ---- */
  const fetchScenes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scenes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScenes(data.scenes ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load scene references.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScenes(); }, [fetchScenes]);

  /* ---- File change ---- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUpFile(file);
    setUpPreview(file ? URL.createObjectURL(file) : null);
  };

  /* ---- Upload ---- */
  const handleUpload = async () => {
    if (!upFile) return;
    setUpBusy(true);
    setUpMsg("");
    try {
      const base64 = await fileToBase64(upFile);
      const res = await fetch("/api/register-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          type: upType,
          label: upLabel.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      setUpMsg("Scene reference registered!");
      setUpFile(null);
      setUpPreview(null);
      setUpLabel("");
      if (fileRef.current) fileRef.current.value = "";
      await fetchScenes();
    } catch (err: any) {
      setUpMsg(err?.message ?? "Upload failed.");
    } finally {
      setUpBusy(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scene reference?")) return;
    try {
      const res = await fetch(`/api/scenes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      await fetchScenes();
    } catch (err: any) {
      alert(err?.message ?? "Delete failed.");
    }
  };

  /* ---- Render ---- */
  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button onClick={fetchScenes} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------- Upload form ---------- */}
      <div className="rounded-2xl border border-line/10 bg-surface/30 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ImagePlus className="h-4 w-4 text-gold" />
          Add Scene Reference
        </h3>

        <div className="space-y-3">
          {/* File picker */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line/30 py-6 text-sm text-muted transition-colors hover:border-gold/40 hover:text-gold",
              upPreview && "border-solid border-emerald-400/40 bg-emerald-400/5",
            )}
          >
            {upPreview ? (
              <img src={upPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                Tap to pick a reference photo
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          {/* Type + label row */}
          <div className="flex gap-2">
            <select
              value={upType}
              onChange={(e) => setUpType(e.target.value as "valid" | "invalid")}
              className="flex-1 rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground focus:border-gold/50 focus:outline-none"
            >
              <option value="valid">Valid (Mosque)</option>
              <option value="invalid">Invalid (Blacklist)</option>
            </select>
            <input
              type="text"
              value={upLabel}
              onChange={(e) => setUpLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-gold/50 focus:outline-none"
            />
            <button
              onClick={handleUpload}
              disabled={upBusy || !upFile}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95",
                upBusy || !upFile
                  ? "cursor-not-allowed bg-line/20 text-muted"
                  : "bg-gold-gradient text-navy-950 shadow-sm",
              )}
            >
              {upBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
            </button>
          </div>
        </div>

        {upMsg && (
          <p className={cn("mt-2 text-xs", upMsg.includes("registered") ? "text-emerald-400" : "text-red-400")}>
            {upMsg}
          </p>
        )}
      </div>

      {/* ---------- Existing scenes ---------- */}
      {scenes && scenes.length === 0 && (
        <div className="py-8 text-center text-sm text-muted">
          No scene references yet. Upload mosque photos above.
        </div>
      )}

      <div className="space-y-2">
        {scenes?.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl bg-surface/40 px-4 py-3"
          >
            {/* Thumbnail */}
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {s.image_url ? (
                <img src={s.image_url} alt={s.label ?? s.type} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted">
                  <ImagePlus className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    s.type === "valid"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400",
                  )}
                >
                  {s.type === "valid" ? <ShieldCheck className="inline h-3 w-3 mr-0.5 -mt-0.5" /> : <ShieldAlert className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                  {s.type === "valid" ? "Mosque" : "Blacklisted"}
                </span>
              </div>
              <p className="truncate text-xs text-foreground">{s.label ?? s.type}</p>
              <p className="text-[10px] text-muted">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDelete(s.id)}
              className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <button onClick={fetchScenes} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    </div>
  );
}