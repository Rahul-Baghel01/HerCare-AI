import { differenceInCalendarDays, parseISO } from "date-fns";

export type CycleRecord = { start_date: string; end_date?: string | null };

export type CycleStats = {
  count: number;
  averageLength: number | null;
  shortest: number | null;
  longest: number | null;
  averagePeriodLength: number | null;
  variation: number | null;
  irregular: boolean;
  lengths: { start: string; length: number }[];
};

/** Cycle length analysis with irregular-cycle detection. */
export function analyseCycles(cycles: CycleRecord[]): CycleStats {
  const sorted = [...cycles]
    .filter((c) => Boolean(c.start_date))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const lengths: { start: string; length: number }[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const length = differenceInCalendarDays(parseISO(curr.start_date), parseISO(prev.start_date));
    if (length > 10 && length < 120) lengths.push({ start: curr.start_date, length });
  }

  const periodLengths = sorted
    .filter((c) => c.end_date)
    .map((c) => differenceInCalendarDays(parseISO(c.end_date!), parseISO(c.start_date)) + 1)
    .filter((n) => n > 0 && n < 15);

  const values = lengths.map((l) => l.length);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const shortest = values.length ? Math.min(...values) : null;
  const longest = values.length ? Math.max(...values) : null;
  const variation = shortest !== null && longest !== null ? longest - shortest : null;

  return {
    count: sorted.length,
    averageLength: average ? Math.round(average) : null,
    shortest,
    longest,
    averagePeriodLength: periodLengths.length
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : null,
    variation,
    irregular: values.length >= 3 && ((variation ?? 0) > 8 || values.some((v) => v < 21 || v > 35)),
    lengths,
  };
}

export function average(numbers: (number | null | undefined)[]) {
  const clean = numbers.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function round(value: number | null, digits = 1) {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const TRIMESTERS = [
  { name: "First trimester", from: 1, to: 13 },
  { name: "Second trimester", from: 14, to: 27 },
  { name: "Third trimester", from: 28, to: 42 },
];

/** Baby development milestones by gestational week. */
export const BABY_TIMELINE: { week: number; title: string; detail: string }[] = [
  {
    week: 4,
    title: "Poppy seed",
    detail: "The neural tube forms and the placenta starts developing.",
  },
  {
    week: 6,
    title: "Lentil",
    detail: "A heartbeat becomes detectable; facial features begin to form.",
  },
  {
    week: 8,
    title: "Raspberry",
    detail: "Tiny arms and legs are growing; all major organs are forming.",
  },
  {
    week: 10,
    title: "Strawberry",
    detail: "Vital organs are functioning; nails and hair begin to appear.",
  },
  {
    week: 12,
    title: "Lime",
    detail: "Reflexes develop — your baby can open and close their fingers.",
  },
  { week: 16, title: "Avocado", detail: "Facial muscles work and the skeleton is hardening." },
  {
    week: 20,
    title: "Banana",
    detail: "Halfway. Baby can hear sounds and is swallowing amniotic fluid.",
  },
  {
    week: 24,
    title: "Corn cob",
    detail: "Lungs are developing surfactant; taste buds are forming.",
  },
  {
    week: 28,
    title: "Aubergine",
    detail: "Eyes can open and close; brain activity increases sharply.",
  },
  { week: 32, title: "Squash", detail: "Bones fully formed, rapid weight gain begins." },
  {
    week: 36,
    title: "Romaine lettuce",
    detail: "Baby is settling head-down in preparation for birth.",
  },
  { week: 40, title: "Pumpkin", detail: "Full term — baby is ready to meet you." },
];

export function pregnancyProgress(dueDate: string, today = new Date()) {
  const due = parseISO(dueDate);
  const daysToDue = differenceInCalendarDays(due, today);
  const totalDays = 280;
  const daysPregnant = Math.max(0, Math.min(totalDays + 14, totalDays - daysToDue));
  const week = Math.max(0, Math.min(42, Math.floor(daysPregnant / 7)));
  const day = daysPregnant % 7;
  const trimester = TRIMESTERS.find((t) => week >= t.from && week <= t.to) ?? TRIMESTERS[0]!;
  const milestone = [...BABY_TIMELINE].reverse().find((m) => m.week <= week) ?? BABY_TIMELINE[0]!;
  return {
    week,
    day,
    daysToDue,
    percent: Math.round((daysPregnant / totalDays) * 100),
    trimester,
    milestone,
  };
}
