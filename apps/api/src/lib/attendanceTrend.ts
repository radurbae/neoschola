import type {
  AttendanceTrendPoint,
  AttendanceTrendBucket,
  StudentAttendanceTrends,
  StaffAttendanceTrendPeriod,
  StaffAttendanceSummaryResponse,
} from "@neoschola/shared";

const SHORT_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function parseUtcDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(dateStr: string, days: number): string {
  const dt = parseUtcDate(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUtcDate(dt);
}

function shortDay(dateStr: string): string {
  const dt = parseUtcDate(dateStr);
  return SHORT_DAYS[dt.getUTCDay()];
}

function shortMonth(dateStr: string): string {
  const dt = parseUtcDate(dateStr);
  return SHORT_MONTHS[dt.getUTCMonth()];
}

function calcPercentage(hadir: number, total: number): number {
  return total > 0 ? Math.round((hadir / total) * 1000) / 10 : 0;
}

function chunkIntoBuckets<T>(items: T[], maxBuckets: number): T[][] {
  if (items.length === 0) return [];
  const bucketCount = Math.min(items.length, maxBuckets);
  const result: T[][] = [];
  const baseSize = Math.floor(items.length / bucketCount);
  const remainder = items.length % bucketCount;

  let currentIdx = 0;
  for (let i = 0; i < bucketCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    result.push(items.slice(currentIdx, currentIdx + size));
    currentIdx += size;
  }
  return result;
}

export function buildStudentAttendanceTrends(
  rows: { date: string; status: string }[],
  todayWib: string
): StudentAttendanceTrends {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  // 1. "7H": maksimal 7 record terakhir
  const last7Rows = sorted.slice(-7);
  let hadir7H = 0;
  const points7H: AttendanceTrendPoint[] = [];
  for (const r of last7Rows) {
    const isHadir = r.status === "HADIR";
    if (isHadir) hadir7H++;
    points7H.push({
      label: shortDay(r.date),
      value: isHadir ? 100 : 0,
    });
  }
  const bucket7H: AttendanceTrendBucket = {
    points: points7H,
    percentage: calcPercentage(hadir7H, last7Rows.length),
    hadir: hadir7H,
    total: last7Rows.length,
  };

  // 2. "30H": filter date >= shiftDays(todayWib, -29)
  const cutoff30H = shiftDays(todayWib, -29);
  const rows30H = sorted.filter((r) => r.date >= cutoff30H);
  let hadir30H = 0;
  for (const r of rows30H) {
    if (r.status === "HADIR") hadir30H++;
  }
  let points30H: AttendanceTrendPoint[] = [];
  if (rows30H.length <= 7) {
    points30H = rows30H.map((r) => ({
      label: shortDay(r.date),
      value: r.status === "HADIR" ? 100 : 0,
    }));
  } else {
    const chunks = chunkIntoBuckets(rows30H, 6);
    points30H = chunks.map((chunk, idx) => {
      const bHadir = chunk.filter((r) => r.status === "HADIR").length;
      return {
        label: `Mg ${idx + 1}`,
        value: chunk.length > 0 ? Math.round((bHadir / chunk.length) * 100) : 0,
      };
    });
  }
  const bucket30H: AttendanceTrendBucket = {
    points: points30H,
    percentage: calcPercentage(hadir30H, rows30H.length),
    hadir: hadir30H,
    total: rows30H.length,
  };

  // 3. "Sem": filter date >= shiftDays(todayWib, -179)
  const cutoffSem = shiftDays(todayWib, -179);
  const rowsSem = sorted.filter((r) => r.date >= cutoffSem);
  let hadirSem = 0;
  for (const r of rowsSem) {
    if (r.status === "HADIR") hadirSem++;
  }

  // Kelompokkan berdasarkan YYYY-MM
  const monthMap = new Map<string, { date: string; status: string }[]>();
  for (const r of rowsSem) {
    const yyyyMm = r.date.slice(0, 7);
    if (!monthMap.has(yyyyMm)) {
      monthMap.set(yyyyMm, []);
    }
    monthMap.get(yyyyMm)!.push(r);
  }

  let pointsSem: AttendanceTrendPoint[] = [];
  if (monthMap.size === 1 && rowsSem.length > 1) {
    // Jika hanya ada 1 bulan dan > 1 baris, pecah menjadi bucket mingguan (max 6 bucket)
    const chunks = chunkIntoBuckets(rowsSem, 6);
    pointsSem = chunks.map((chunk, idx) => {
      const bHadir = chunk.filter((r) => r.status === "HADIR").length;
      return {
        label: `Mg ${idx + 1}`,
        value: chunk.length > 0 ? Math.round((bHadir / chunk.length) * 100) : 0,
      };
    });
  } else {
    for (const [yyyyMm, mRows] of monthMap.entries()) {
      const bHadir = mRows.filter((r) => r.status === "HADIR").length;
      pointsSem.push({
        label: shortMonth(`${yyyyMm}-01`),
        value: mRows.length > 0 ? Math.round((bHadir / mRows.length) * 100) : 0,
      });
    }
  }

  const bucketSem: AttendanceTrendBucket = {
    points: pointsSem,
    percentage: calcPercentage(hadirSem, rowsSem.length),
    hadir: hadirSem,
    total: rowsSem.length,
  };

  return {
    "7H": bucket7H,
    "30H": bucket30H,
    Sem: bucketSem,
  };
}

export function buildStaffAttendanceSummary(
  rows: { date: string; status: string }[],
  totalStudents: number,
  todayWib: string
): StaffAttendanceSummaryResponse {
  // Hitung statistik today
  let todayRecorded = 0;
  let todayHadir = 0;
  let todaySakit = 0;
  let todayIzin = 0;
  let todayAlpa = 0;

  for (const r of rows) {
    if (r.date === todayWib) {
      todayRecorded++;
      if (r.status === "HADIR") todayHadir++;
      else if (r.status === "SAKIT") todaySakit++;
      else if (r.status === "IZIN") todayIzin++;
      else if (r.status === "ALPA") todayAlpa++;
    }
  }

  const todayPercentage =
    todayRecorded > 0 ? Math.round((todayHadir / todayRecorded) * 1000) / 10 : null;

  // Kelompokkan per date
  const dateMap = new Map<string, { hadir: number; total: number }>();
  for (const r of rows) {
    if (!dateMap.has(r.date)) {
      dateMap.set(r.date, { hadir: 0, total: 0 });
    }
    const dStat = dateMap.get(r.date)!;
    dStat.total++;
    if (r.status === "HADIR") {
      dStat.hadir++;
    }
  }

  const allDatesAsc = Array.from(dateMap.keys()).sort();

  // Period "1M": ambil tanggal unik dalam 14 hari terakhir (date >= shiftDays(todayWib, -13))
  const cutoff14d = shiftDays(todayWib, -13);
  let dates1M = allDatesAsc.filter((d) => d >= cutoff14d);
  if (dates1M.length === 0) {
    dates1M = allDatesAsc;
  }
  const last7Dates = dates1M.slice(-7);

  let hadir1M = 0;
  let total1M = 0;
  const points1M: AttendanceTrendPoint[] = [];

  for (const d of last7Dates) {
    const stat = dateMap.get(d)!;
    hadir1M += stat.hadir;
    total1M += stat.total;
    points1M.push({
      label: shortDay(d),
      value: stat.hadir,
    });
  }

  let callout1M = "Belum ada presensi hari ini";
  if (todayRecorded > 0) {
    callout1M = `${todayHadir}/${todayRecorded} hadir hari ini`;
  } else if (total1M > 0) {
    callout1M = `${hadir1M}/${total1M} tercatat hadir`;
  }

  const period1M: StaffAttendanceTrendPeriod = {
    points: points1M,
    percentage: calcPercentage(hadir1M, total1M),
    recorded_days: last7Dates.length,
    hadir_records: hadir1M,
    total_records: total1M,
    callout: callout1M,
  };

  // Period "1B": filter baris date >= shiftDays(todayWib, -29)
  const cutoff30d = shiftDays(todayWib, -29);
  const dates30d = allDatesAsc.filter((d) => d >= cutoff30d);

  let hadir1B = 0;
  let total1B = 0;
  for (const d of dates30d) {
    const stat = dateMap.get(d)!;
    hadir1B += stat.hadir;
    total1B += stat.total;
  }

  const chunks1B = chunkIntoBuckets(dates30d, 5);
  const points1B: AttendanceTrendPoint[] = chunks1B.map((chunk, idx) => {
    let bHadir = 0;
    let bTotal = 0;
    for (const d of chunk) {
      const stat = dateMap.get(d)!;
      bHadir += stat.hadir;
      bTotal += stat.total;
    }
    return {
      label: `Mg ${idx + 1}`,
      value: bTotal > 0 ? Math.round((bHadir / bTotal) * 100) : 0,
    };
  });

  const callout1B =
    total1B > 0 ? `${hadir1B}/${total1B} hadir (30 hari)` : "Belum ada data 30 hari";

  const period1B: StaffAttendanceTrendPeriod = {
    points: points1B,
    percentage: calcPercentage(hadir1B, total1B),
    recorded_days: dates30d.length,
    hadir_records: hadir1B,
    total_records: total1B,
    callout: callout1B,
  };

  return {
    total_students: totalStudents,
    today_date: todayWib,
    today: {
      recorded: todayRecorded,
      hadir: todayHadir,
      sakit: todaySakit,
      izin: todayIzin,
      alpa: todayAlpa,
      percentage: todayPercentage,
    },
    periods: {
      "1M": period1M,
      "1B": period1B,
    },
  };
}
