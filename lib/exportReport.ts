/* =========================================================================
 * MasjidCheckIn — Report Excel Export (client-side)
 *
 * Builds a .xlsx file from the `/api/report` payload using SheetJS.
 * Sheet 1: "Rekap Absensi" — per-user matrix with "✓" / "✗" per prayer
 * Sheet 2: "Ringkasan Kelas" — per-class attendance roll-up
 * ========================================================================= */

import * as XLSX from "xlsx";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ReportUserRow {
  id: string;
  name: string;
  class_name: string | null;
  attendance: Record<string, boolean>;
  attendedCount: number;
}

export interface ReportClassRollup {
  className: string;
  total: number;
  attendance: Record<string, { present: number; absent: number }>;
  users: ReportUserRow[];
}

export interface ReportPayload {
  date: string;
  prayers: string[];
  totalUsers: number;
  users: ReportUserRow[];
  classes: ReportClassRollup[];
  perPrayer: {
    prayer: string;
    attendedCount: number;
    absentCount: number;
    totalUsers: number;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Main export entry                                                  */
/* ------------------------------------------------------------------ */

export function exportReportToXlsx(payload: ReportPayload): void {
  const workbook = XLSX.utils.book_new();

  // ---- Sheet 1: Rekap Absensi per User ----
  const mainHeader = ["No", "Nama", "Kelas", ...payload.prayers, "Hadir"];
  const mainData: (string | number)[][] = [mainHeader];

  payload.users.forEach((user, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      user.name,
      user.class_name ?? "Tanpa Kelas",
    ];
    for (const prayer of payload.prayers) {
      row.push(user.attendance[prayer] ? "✓" : "✗");
    }
    row.push(`${user.attendedCount}/${payload.prayers.length}`);
    mainData.push(row);
  });

  // Total row
  mainData.push([
    "",
    "TOTAL",
    "",
    ...payload.prayers.map(
      (p) =>
        `${payload.perPrayer.find((pp) => pp.prayer === p)?.attendedCount ?? 0}`,
    ),
    `${payload.totalUsers}`,
  ]);

  const sheet1 = XLSX.utils.aoa_to_sheet(mainData);
  // Column widths
  sheet1["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 10 },
    ...payload.prayers.map(() => ({ wch: 8 })),
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet1, "Rekap Absensi");

  // ---- Sheet 2: Ringkasan per Kelas ----
  const sumHeader = [
    "Kelas",
    "Jumlah Siswa",
    ...payload.prayers.map((p) => `${p} (Hadir)`),
    "Kehadiran Rata-rata",
  ];
  const sumData: (string | number)[][] = [sumHeader];

  for (const cls of payload.classes) {
    const row: (string | number)[] = [cls.className, cls.total];
    let totalPresent = 0;
    const totalCells = cls.total * payload.prayers.length;

    for (const prayer of payload.prayers) {
      const { present, absent } = cls.attendance[prayer] ?? {
        present: 0,
        absent: cls.total,
      };
      row.push(`${present}/${absent}`);
      totalPresent += present;
    }

    const pct = totalCells > 0 ? Math.round((totalPresent / totalCells) * 100) : 0;
    row.push(`${pct}%`);
    sumData.push(row);
  }

  const sheet2 = XLSX.utils.aoa_to_sheet(sumData);
  sheet2["!cols"] = [
    { wch: 16 },
    { wch: 14 },
    ...payload.prayers.map(() => ({ wch: 14 })),
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet2, "Ringkasan Kelas");

  // ---- Download ----
  const filename = `Absensi-${payload.date}.xlsx`;
  XLSX.writeFile(workbook, filename);
}