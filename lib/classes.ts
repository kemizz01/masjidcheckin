/* =========================================================================
 * MasjidCheckIn — Class Registry
 *
 * The full list of classes at Labschool, from X-A to XII-H.
 * Each grade level (X, XI, XII) has eight sections (A–H).
 *
 * Used by:
 *   - The registration form (class dropdown)
 *   - The admin Jamaah grid (grouping / filtering)
 *   - The attendance report (sorting & grouping)
 *   - The .xlsx export (sheet ordering)
 * ========================================================================= */

/** Grade levels in ascending order. */
export const GRADE_LEVELS = ["X", "XI", "XII"] as const;

/** Section letters, A through H. */
export const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

/**
 * All classes in canonical order: X-A … X-H, XI-A … XI-H, XII-A … XII-H.
 */
export const CLASSES: string[] = GRADE_LEVELS.flatMap((grade) =>
  SECTIONS.map((section) => `${grade}-${section}`),
);

/** Sentinel value used when a user has no class assigned. */
export const UNASSIGNED_CLASS = "Tanpa Kelas";

/**
 * Numeric rank for a class name so arrays can be sorted X-A → XII-H.
 * Unknown / unassigned classes sort to the very end.
 */
export function classRank(className: string | null | undefined): number {
  if (!className) return CLASSES.length + 1;
  const idx = CLASSES.indexOf(className);
  return idx === -1 ? CLASSES.length : idx;
}

/**
 * Comparator for sorting objects that carry a `class_name` field.
 * Sorts by class rank first, then alphabetically by name.
 */
export function compareByClassThenName<
  T extends { class_name?: string | null; name: string },
>(a: T, b: T): number {
  const rankDiff = classRank(a.class_name) - classRank(b.class_name);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name);
}

/** Human-friendly label for a class value. */
export function classLabel(className: string | null | undefined): string {
  return className && className.trim() ? className : UNASSIGNED_CLASS;
}
