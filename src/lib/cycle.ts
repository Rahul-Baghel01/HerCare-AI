import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export const PHASE_INFO: Record<
  CyclePhase,
  { label: string; blurb: string; nutrition: string; movement: string }
> = {
  menstrual: {
    label: "Menstrual",
    blurb: "Hormones are at their lowest. Rest is productive.",
    nutrition: "Iron-rich foods, warm meals, magnesium.",
    movement: "Gentle yoga, walking, stretching.",
  },
  follicular: {
    label: "Follicular",
    blurb: "Oestrogen rises — energy and focus climb.",
    nutrition: "Lean protein, leafy greens, fermented foods.",
    movement: "Strength training, cardio, pilates.",
  },
  ovulatory: {
    label: "Ovulatory",
    blurb: "Peak energy and peak fertility window.",
    nutrition: "Fibre, antioxidants, plenty of water.",
    movement: "High intensity, group classes, sprints.",
  },
  luteal: {
    label: "Luteal",
    blurb: "Progesterone rises. Cravings and PMS can appear.",
    nutrition: "Complex carbs, magnesium, calcium.",
    movement: "Pilates, moderate strength, long walks.",
  },
};

export type CycleSnapshot = {
  cycleDay: number;
  phase: CyclePhase;
  nextPeriod: Date;
  daysUntilNextPeriod: number;
  ovulation: Date;
  fertileStart: Date;
  fertileEnd: Date;
  periodEnd: Date;
};

export function computeCycle(
  lastPeriodStart: Date,
  cycleLength = 28,
  periodLength = 5,
  today = new Date(),
): CycleSnapshot {
  const start = startOfDay(lastPeriodStart);
  const elapsed = differenceInCalendarDays(startOfDay(today), start);
  const cycleDay = (((elapsed % cycleLength) + cycleLength) % cycleLength) + 1;
  const currentStart = addDays(start, elapsed - (cycleDay - 1));
  const nextPeriod = addDays(currentStart, cycleLength);
  const ovulation = addDays(currentStart, cycleLength - 14);

  let phase: CyclePhase = "follicular";
  if (cycleDay <= periodLength) phase = "menstrual";
  else if (cycleDay >= cycleLength - 16 && cycleDay <= cycleLength - 12) phase = "ovulatory";
  else if (cycleDay > cycleLength - 12) phase = "luteal";

  return {
    cycleDay,
    phase,
    nextPeriod,
    daysUntilNextPeriod: differenceInCalendarDays(nextPeriod, startOfDay(today)),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    periodEnd: addDays(currentStart, periodLength - 1),
  };
}

export function pretty(date: Date) {
  return format(date, "EEE d MMM");
}

export function isoDay(date: Date) {
  return format(date, "yyyy-MM-dd");
}
