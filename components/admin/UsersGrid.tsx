"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Loader2,
  Trash2,
  UserPlus,
  ImagePlus,
  RefreshCw,
  Camera,
} from "lucide-react";
import Skeleton from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import { registerFace } from "@/lib/api";
import {
  CLASSES,
  classLabel,
  classRank,
} from "@/lib/classes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserSummary {
  id: string;
  name: string;
  class_name: string | null;
  created_at: string;
  archive_photo_url: string | null;
  has_descriptor: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Convert a File to a Base64 data URL via FileReader. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/* ================================================================== */
/*  UsersGrid  (Admin Panel / Jamaah tab)                              */
/* ================================================================== */

export default function UsersGrid() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regClass, setRegClass] = useState("");
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState("");
  const regFileRef = useRef<HTMLInputElement>(null);

  // List filtering state
  const [filterClass, setFilterClass] = useState("all");

  /* ---- Fetch users ---- */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ---- Handle file selection ---- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setRegFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setRegPreview(url);
    } else {
      setRegPreview(null);
    }
  };

  /* ---- Register a new face ---- */
  const handleRegister = async () => {
    if (!regFile || !regName.trim() || !regClass) return;
    setRegBusy(true);
    setRegMsg("");
    try {
      const base64 = await fileToBase64(regFile);
      await registerFace(base64, regName.trim(), regClass);
      setRegMsg("Registered successfully!");
      setRegName("");
      setRegClass("");
      setRegFile(null);
      setRegPreview(null);
      if (regFileRef.current) regFileRef.current.value = "";
      await fetchUsers(); // refresh list
    } catch (err: any) {
      setRegMsg(err?.message ?? "Registration failed.");
    } finally {
      setRegBusy(false);
    }
  };

  /* ---- Delete a user ---- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchUsers();
    } catch (err: any) {
      alert(err?.message ?? "Delete failed.");
    }
  };

  /* ---- Group + sort users by class (X-A → XII-H), then name ---- */
  const groupedByClass = useMemo(() => {
    if (!users) return [];
    const visible =
      filterClass === "all"
        ? users
        : users.filter((u) => classLabel(u.class_name) === filterClass);

    const sorted = [...visible].sort((a, b) => {
      const rankDiff = classRank(a.class_name) - classRank(b.class_name);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });

    const groups: { className: string; users: UserSummary[] }[] = [];
    for (const u of sorted) {
      const label = classLabel(u.class_name);
      let group = groups.find((g) => g.className === label);
      if (!group) {
        group = { className: label, users: [] };
        groups.push(group);
      }
      group.users.push(u);
    }
    return groups;
  }, [users, filterClass]);

  // Distinct classes that currently have at least one registered user.
  const populatedClasses = useMemo(() => {
    if (!users) return [] as string[];
    const set = new Set(users.map((u) => classLabel(u.class_name)));
    return Array.from(set).sort((a, b) => {
      const ra = a === "Tanpa Kelas" ? 999 : classRank(a);
      const rb = b === "Tanpa Kelas" ? 999 : classRank(b);
      return ra - rb;
    });
  }, [users]);

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------- Register form ---------- */}
      <div className="rounded-2xl border border-line/10 bg-surface/30 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserPlus className="h-4 w-4 text-gold" />
          Register new Jamaah
        </h3>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* File picker */}
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted">Face Photo</label>
            <button
              type="button"
              onClick={() => regFileRef.current?.click()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line/30 py-6 text-sm text-muted transition-colors hover:border-gold/40 hover:text-gold",
                regPreview && "border-solid border-emerald-400/40 bg-emerald-400/5",
              )}
            >
              {regPreview ? (
                <img
                  src={regPreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  Tap to pick a photo
                </>
              )}
            </button>
            <input
              ref={regFileRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Name input */}
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted">Full Name</label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Ahmad Fauzi"
              className="w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* Class select */}
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-muted">Class</label>
            <select
              value={regClass}
              onChange={(e) => setRegClass(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-line/20 bg-surface px-3 py-2.5 text-sm focus:border-gold/50 focus:outline-none",
                regClass ? "text-foreground" : "text-muted/60",
              )}
            >
              <option value="">Select class…</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            onClick={handleRegister}
            disabled={regBusy || !regFile || !regName.trim() || !regClass}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition active:scale-95",
              regBusy || !regFile || !regName.trim() || !regClass
                ? "cursor-not-allowed bg-line/20 text-muted"
                : "bg-gold-gradient text-navy-950 shadow-sm",
            )}
          >
            {regBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Register
          </button>
        </div>

        {regMsg && (
          <p
            className={cn(
              "mt-2 text-xs",
              regMsg.includes("success") ? "text-emerald-400" : "text-red-400",
            )}
          >
            {regMsg}
          </p>
        )}
      </div>

      {/* ---------- User grid ---------- */}
      {users && users.length === 0 && (
        <div className="py-8 text-center text-sm text-muted">
          No Jamaah registered yet. Upload a face photo above to get started.
        </div>
      )}

      {users && users.length > 0 && (
        <div className="space-y-2">
          {/* Class filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="rounded-xl border border-line/20 bg-surface px-3 py-2 text-xs text-foreground focus:border-gold/50 focus:outline-none"
            >
              <option value="all">All classes ({users.length})</option>
              {populatedClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grouped by class */}
      {groupedByClass.map((group) => (
        <div key={group.className} className="space-y-2">
          <div className="flex items-center gap-2 pt-2">
            <span className="rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
              {group.className}
            </span>
            <span className="text-[10px] text-muted">
              {group.users.length} Jamaah
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.users.map((user) => (
              <div
                key={user.id}
                className="relative overflow-hidden rounded-2xl border border-line/10 bg-surface/40"
              >
                {/* Photo */}
                <div className="aspect-square bg-surface-2">
                  {user.archive_photo_url ? (
                    <img
                      src={user.archive_photo_url}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}
                </div>

                {/* Name + actions */}
                <div className="flex items-center justify-between gap-1 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Delete ${user.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Class badge */}
                <div className="absolute left-2 top-2 rounded-md bg-navy-900/70 px-1.5 py-0.5 text-[9px] font-bold text-gold backdrop-blur-sm">
                  {classLabel(user.class_name)}
                </div>

                {/* Descriptor badge */}
                <div className="absolute right-2 top-2">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      user.has_descriptor
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400",
                    )}
                  >
                    {user.has_descriptor ? "AI" : "No AI"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    </div>
  );
}