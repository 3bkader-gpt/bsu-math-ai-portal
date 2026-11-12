/**
 * Pure 16-Week (112-Day) Study Heatmap Engine (Africa/Cairo Timezone).
 *
 * Converts raw `daily_activity` records into a GitHub-style 16x7 contribution grid
 * with 5 intensity levels (0..4) and summary metrics.
 */

export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4;

export interface DailyActivityInput {
  day: string; // YYYY-MM-DD
  xp_earned?: number;
  items_completed?: number;
  seconds_active?: number;
}

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) .. 6 (Sat)
  xpEarned: number;
  itemsCompleted: number;
  secondsActive: number;
  intensity: HeatmapIntensity;
  isToday: boolean;
}

export interface HeatmapWeekColumn {
  weekIndex: number;
  startDate: string;
  monthLabel?: string;
  days: HeatmapCell[];
}

export interface StudyHeatmapGridResult {
  weeks: HeatmapWeekColumn[];
  totalDays: number;
  activeDaysCount: number;
  totalXpInWindow: number;
  totalItemsInWindow: number;
  peakDayXp: number;
}

const ARABIC_SHORT_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Formats a Date into YYYY-MM-DD in Africa/Cairo timezone.
 */
export function getCairoDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Computes intensity bin (0..4) from daily XP, completed items, and active seconds.
 */
export function getHeatmapIntensityLevel(
  xpEarned: number,
  itemsCompleted: number,
  secondsActive = 0
): HeatmapIntensity {
  const xp = Math.max(0, Number(xpEarned) || 0);
  const items = Math.max(0, Number(itemsCompleted) || 0);
  const secs = Math.max(0, Number(secondsActive) || 0);

  if (xp <= 0 && items <= 0 && secs < 60) {
    return 0;
  }
  if (xp >= 200 || items >= 6) {
    return 4;
  }
  if (xp >= 100 || items >= 4) {
    return 3;
  }
  if (xp >= 40 || items >= 2) {
    return 2;
  }
  return 1;
}

function parseIsoDateUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Builds a deterministic 16-week (112-day) heatmap grid ending on `referenceDate` (defaults to Cairo today).
 */
export function buildStudyHeatmapGrid(
  rows: DailyActivityInput[],
  options?: { weeksCount?: number; referenceDate?: string | Date }
): StudyHeatmapGridResult {
  const weeksCount = Math.max(1, Math.min(52, options?.weeksCount ?? 16));
  const totalDays = weeksCount * 7;

  const refDateStr =
    typeof options?.referenceDate === 'string'
      ? options.referenceDate.slice(0, 10)
      : getCairoDateString(options?.referenceDate ?? new Date());

  const endUtc = parseIsoDateUtc(refDateStr);

  // Index input rows by YYYY-MM-DD
  const byDay = new Map<string, DailyActivityInput>();
  for (const r of rows || []) {
    if (r && typeof r.day === 'string') {
      const key = r.day.slice(0, 10);
      byDay.set(key, r);
    }
  }

  const allCells: HeatmapCell[] = [];
  let activeDaysCount = 0;
  let totalXpInWindow = 0;
  let totalItemsInWindow = 0;
  let peakDayXp = 0;

  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const d = new Date(endUtc.getTime() - offset * 86_400_000);
    const dateStr = formatUtcDate(d);
    const rec = byDay.get(dateStr);

    const xpEarned = Math.max(0, Number(rec?.xp_earned) || 0);
    const itemsCompleted = Math.max(0, Number(rec?.items_completed) || 0);
    const secondsActive = Math.max(0, Number(rec?.seconds_active) || 0);
    const intensity = getHeatmapIntensityLevel(xpEarned, itemsCompleted, secondsActive);

    if (intensity > 0) {
      activeDaysCount++;
    }
    totalXpInWindow += xpEarned;
    totalItemsInWindow += itemsCompleted;
    if (xpEarned > peakDayXp) {
      peakDayXp = xpEarned;
    }

    allCells.push({
      date: dateStr,
      dayOfWeek: d.getUTCDay(),
      xpEarned,
      itemsCompleted,
      secondsActive,
      intensity,
      isToday: dateStr === refDateStr,
    });
  }

  const weeks: HeatmapWeekColumn[] = [];
  let lastMonthSeen = -1;

  for (let w = 0; w < weeksCount; w++) {
    const slice = allCells.slice(w * 7, (w + 1) * 7);
    const firstDayUtc = parseIsoDateUtc(slice[0].date);
    const monthIdx = firstDayUtc.getUTCMonth();

    let monthLabel: string | undefined;
    if (monthIdx !== lastMonthSeen) {
      monthLabel = ARABIC_SHORT_MONTHS[monthIdx];
      lastMonthSeen = monthIdx;
    }

    weeks.push({
      weekIndex: w,
      startDate: slice[0].date,
      monthLabel,
      days: slice,
    });
  }

  return {
    weeks,
    totalDays,
    activeDaysCount,
    totalXpInWindow,
    totalItemsInWindow,
    peakDayXp,
  };
}
