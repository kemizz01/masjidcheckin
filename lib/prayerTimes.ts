/* =========================================================================
 * MasjidCheckIn — Prayer Times Helpers
 *
 * ⚠️  PLACEHOLDER IMPLEMENTATION — hard-coded sample times.
 * In a future phase we will integrate a real prayer-times API (e.g. Aladhan
 * or IslamicFinder) that adjusts dynamically based on the mosque's location
 * and the current date.  For now the constants below are sufficient to build
 * the scheduled-attendance UI.
 * ========================================================================= */

export interface Prayer {
  name: string;
  /** 24‑hour time string, e.g. "04:42" */
  time: string;
}

/**
 * Sample prayer times (fixed).  Each entry's `time` is in "HH:mm" format
 * and is interpreted as local time on today's date.
 */
export const PRAYER_TIMES: Prayer[] = [
  { name: "Fajr",    time: "04:42" },
  { name: "Dhuhr",   time: "12:03" },
  { name: "Asr",     time: "15:21" },
  { name: "Maghrib", time: "18:10" },
  { name: "Isha",    time: "19:28" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Parse a "HH:mm" string into a `Date` on the given reference date.
 */
function parseTime(time: string, ref: Date): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Returns the **next** upcoming prayer and how far away it is.
 *
 * If all of today's prayers have already passed, the result points to
 * **tomorrow's Fajr**.
 */
export function getNextPrayer(now: Date): {
  prayer: Prayer;
  time: Date;
  diffMs: number;
} {
  for (const prayer of PRAYER_TIMES) {
    const t = parseTime(prayer.time, now);
    if (t > now) return { prayer, time: t, diffMs: t.getTime() - now.getTime() };
  }

  // All prayers passed — return tomorrow's first prayer.
  const first = PRAYER_TIMES[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const t = parseTime(first.time, tomorrow);
  return { prayer: first, time: t, diffMs: t.getTime() - now.getTime() };
}

/**
 * Returns the **current** prayer period, i.e. the most recent prayer whose
 * start time ≤ now.  Returns `null` before Fajr on a given day.
 */
export function getCurrentPrayer(now: Date): Prayer | null {
  let current: Prayer | null = null;
  for (const prayer of PRAYER_TIMES) {
    const t = parseTime(prayer.time, now);
    if (t <= now) current = prayer;
    else break;
  }
  return current;
}

/**
 * Formats a millisecond duration as a compact countdown string:
 *   - "02:14:33"  when ≥ 1 hour
 *   - "14:33"     when 1 min – 59 min
 *   - "0:33"      when < 1 min
 */
export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}