import { useReducedMotion } from "motion/react";
import { summaryRange, describeCoverage, SUMMARY_LIMIT, fictionalDataNotice } from "@/lib/summary";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, Droplets, FileDown, Moon, Scale, Smile } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GlassCard,
  PageHeader,
  StatCard,
  StatSkeletons,
  EmptyState,
  ErrorState,
  SectionTitle,
  Disclaimer,
} from "@/components/hercare/kit";
import { useProfile, useRows, useInsertRow } from "@/lib/data";
import { analyseCycles, average, round } from "@/lib/stats";
import { downloadHealthReport } from "@/lib/report";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & insights — HerCare AI" },
      {
        name: "description",
        content:
          "Cycle history, mood and symptom trends, sleep, hydration and weight analytics with a wellness score.",
      },
      { property: "og:title", content: "Analytics & insights — HerCare AI" },
      { property: "og:description", content: "See how your health trends over time." },
    ],
  }),
  component: AnalyticsPage,
});

type Cycle = { id: string; start_date: string; end_date: string | null };
type Mood = {
  id: string;
  log_date: string;
  journal?: string | null;
  energy_level: number | null;
  stress_level: number | null;
};
type Symptom = {
  id: string;
  log_date: string;
  name: string;
  notes?: string | null;
  severity: number;
};
type Sleep = { id: string; log_date: string; hours: number; quality: number | null };
type Water = { id: string; log_date: string; glasses: number; goal_glasses: number };
type Weight = { id: string; log_date: string; weight_kg: number };

const label = (iso: string) => format(parseISO(iso), "d MMM");

function AnalyticsPage() {
  const reduced = useReducedMotion();
  const [exporting, setExporting] = useState(false);
  const [range] = useState(() => summaryRange());
  const { rangeStart, rangeEnd } = range;
  const { data: profile } = useProfile();
  const saveReport = useInsertRow("reports", "Report saved to your history");
  const cyclesQuery = useRows<Cycle>("cycles", {
    orderBy: "start_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });
  const moodsQuery = useRows<Mood>("moods", {
    orderBy: "log_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });
  const symptomsQuery = useRows<Symptom>("symptoms", {
    orderBy: "log_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });
  const sleepQuery = useRows<Sleep>("sleep_logs", {
    orderBy: "log_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });
  const waterQuery = useRows<Water>("water_logs", {
    orderBy: "log_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });
  const weightQuery = useRows<Weight>("weight_history", {
    orderBy: "log_date",
    limit: SUMMARY_LIMIT,
    ...range,
  });

  const loading =
    cyclesQuery.isLoading ||
    moodsQuery.isLoading ||
    symptomsQuery.isLoading ||
    sleepQuery.isLoading ||
    waterQuery.isLoading ||
    weightQuery.isLoading;
  const errored =
    cyclesQuery.isError ||
    moodsQuery.isError ||
    symptomsQuery.isError ||
    sleepQuery.isError ||
    waterQuery.isError ||
    weightQuery.isError;

  const cycles = useMemo(() => cyclesQuery.data ?? [], [cyclesQuery.data]);
  const moods = useMemo(() => moodsQuery.data ?? [], [moodsQuery.data]);
  const symptoms = useMemo(() => symptomsQuery.data ?? [], [symptomsQuery.data]);
  const sleep = useMemo(() => sleepQuery.data ?? [], [sleepQuery.data]);
  const water = useMemo(() => waterQuery.data ?? [], [waterQuery.data]);
  const weights = useMemo(() => weightQuery.data ?? [], [weightQuery.data]);

  const cycleStats = useMemo(() => analyseCycles(cycles), [cycles]);

  const moodSeries = useMemo(
    () =>
      [...moods]
        .reverse()
        .slice(-30)
        .map((m) => ({
          day: label(m.log_date),
          energy: m.energy_level ?? null,
          stress: m.stress_level ?? null,
        })),
    [moods],
  );

  const symptomSeries = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    symptoms.forEach((s) => {
      const entry = map.get(s.name) ?? { total: 0, count: 0 };
      entry.total += s.severity;
      entry.count += 1;
      map.set(s.name, entry);
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, severity: round(v.total / v.count, 1) ?? 0, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [symptoms]);

  const sleepSeries = useMemo(
    () =>
      [...sleep]
        .reverse()
        .slice(-30)
        .map((s) => ({ day: label(s.log_date), hours: s.hours, quality: s.quality ?? null })),
    [sleep],
  );

  const waterSeries = useMemo(
    () =>
      [...water]
        .reverse()
        .slice(-30)
        .map((w) => ({ day: label(w.log_date), glasses: w.glasses, goal: w.goal_glasses })),
    [water],
  );

  const weightSeries = useMemo(
    () =>
      [...weights]
        .reverse()
        .slice(-60)
        .map((w) => ({ day: label(w.log_date), weight: Number(w.weight_kg) })),
    [weights],
  );

  const avgSleep = round(average(sleep.map((s) => Number(s.hours))));
  const avgEnergy = round(average(moods.map((m) => m.energy_level)));
  const avgStress = round(average(moods.map((m) => m.stress_level)));
  const hydrationRate = (() => {
    if (!water.length) return null;
    const hit = water.filter((w) => w.glasses >= (w.goal_glasses || 8)).length;
    return Math.round((hit / water.length) * 100);
  })();
  const weightChange =
    weightSeries.length >= 2
      ? round(weightSeries[weightSeries.length - 1]!.weight - weightSeries[0]!.weight)
      : null;

  const wellnessScore = useMemo(() => {
    const parts: number[] = [];
    if (avgSleep !== null) parts.push(Math.max(0, Math.min(100, (avgSleep / 8) * 100)));
    if (hydrationRate !== null) parts.push(hydrationRate);
    if (avgEnergy !== null) parts.push((avgEnergy / 5) * 100);
    if (avgStress !== null) parts.push(100 - (avgStress / 5) * 100);
    if (symptoms.length) {
      const sevAvg = average(symptoms.map((s) => s.severity)) ?? 0;
      parts.push(Math.max(0, 100 - (sevAvg / 5) * 100));
    }
    if (!parts.length) return null;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }, [avgSleep, hydrationRate, avgEnergy, avgStress, symptoms]);

  const monthlyInsights = useMemo(() => {
    const out: string[] = [];
    if (cycleStats.averageLength) {
      out.push(
        `Your average cycle length is ${cycleStats.averageLength} days${
          cycleStats.averagePeriodLength
            ? ` with a ${cycleStats.averagePeriodLength}-day period`
            : ""
        }.`,
      );
    }
    if (cycleStats.irregular) {
      out.push(
        "Your recent cycles vary noticeably in length — worth mentioning to a clinician if it continues.",
      );
    }
    if (avgSleep !== null)
      out.push(`You recorded an average of ${avgSleep} hours of sleep on logged days.`);
    if (hydrationRate !== null)
      out.push(`You met your chosen hydration goal on ${hydrationRate}% of logged days.`);
    if (symptoms.length) {
      const top = symptomSeries[0];
      if (top) out.push(`Your most logged symptom in this range is ${top.name}.`);
    }
    if (weightChange !== null && weightChange !== 0) {
      out.push(
        `Weight has ${weightChange > 0 ? "increased" : "decreased"} by ${Math.abs(
          weightChange,
        )} kg across your logs.`,
      );
    }
    if (!out.length)
      out.push("Log a few days of cycle, mood and wellness data to unlock insights.");
    return out;
  }, [cycleStats, avgSleep, hydrationRate, symptomSeries, symptoms, weightChange]);

  const coverage = describeCoverage(
    [
      { label: "Cycles", dates: cycles.map((r) => r.start_date) },
      { label: "Moods", dates: moods.map((r) => r.log_date) },
      { label: "Symptoms", dates: symptoms.map((r) => r.log_date) },
      { label: "Sleep", dates: sleep.map((r) => r.log_date) },
      { label: "Hydration", dates: water.map((r) => r.log_date) },
      { label: "Weight", dates: weights.map((r) => r.log_date) },
    ],
    range,
  );

  const demoNotice = fictionalDataNotice([
    ...moods.map((r) => r.journal),
    ...symptoms.map((r) => r.notes),
  ]);
  if (demoNotice) coverage.push(demoNotice);

  if (loading) {
    return (
      <>
        <PageHeader title="Analytics & insights" description="Loading your health trends…" />
        <StatSkeletons />
      </>
    );
  }

  if (errored) {
    return (
      <>
        <PageHeader title="Analytics & insights" />
        <ErrorState
          onRetry={() => {
            void cyclesQuery.refetch();
            void moodsQuery.refetch();
            void symptomsQuery.refetch();
            void sleepQuery.refetch();
            void waterQuery.refetch();
            void weightQuery.refetch();
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics & insights"
        description={`Your saved records / ${rangeStart} to ${rangeEnd}. The report uses this same range.`}
        action={
          <Button
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              const stats = [
                {
                  label: "Logged wellness index",
                  value: wellnessScore !== null ? `${wellnessScore}/100` : "No data",
                },
                {
                  label: "Average cycle length",
                  value: cycleStats.averageLength ? `${cycleStats.averageLength} days` : "No data",
                },
                {
                  label: "Average period length",
                  value: cycleStats.averagePeriodLength
                    ? `${cycleStats.averagePeriodLength} days`
                    : "No data",
                },
                {
                  label: "Average sleep",
                  value: avgSleep !== null ? `${avgSleep} hours` : "No data",
                },
                {
                  label: "Hydration goal hit",
                  value: hydrationRate !== null ? `${hydrationRate}% of logged days` : "No data",
                },
                {
                  label: "Average energy",
                  value: avgEnergy !== null ? `${avgEnergy}/5` : "No data",
                },
                {
                  label: "Average stress",
                  value: avgStress !== null ? `${avgStress}/5` : "No data",
                },
                {
                  label: "Weight change",
                  value:
                    weightChange !== null
                      ? `${weightChange > 0 ? "+" : ""}${weightChange} kg`
                      : "No data",
                },
              ];
              void (async () => {
                try {
                  await downloadHealthReport({
                    name: profile?.display_name ?? "HerCare user",
                    rangeStart,
                    rangeEnd,
                    stats,
                    insights: monthlyInsights,
                    symptoms: symptomSeries,
                    coverage,
                  });
                  toast.success("PDF report downloaded");
                  saveReport.mutate({
                    title: `Health report ${rangeEnd}`,
                    range_start: rangeStart,
                    range_end: rangeEnd,
                    summary: {
                      stats,
                      insights: monthlyInsights,
                      coverage,
                      symptoms: symptomSeries,
                    },
                  });
                } catch {
                  toast.error("Could not generate the PDF. Please try again.");
                } finally {
                  setExporting(false);
                }
              })();
            }}
          >
            <FileDown className="size-4" />{" "}
            {exporting ? "Preparing report..." : "Download PDF report"}
          </Button>
        }
      />

      {demoNotice && (
        <p role="note" className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
          {demoNotice}
        </p>
      )}
      <GlassCard className="space-y-2">
        <details>
          <summary className="cursor-pointer font-medium">What informed this summary?</summary>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {coverage.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Calculated from your saved records, not an AI diagnosis. Charts show the latest entries
            within this range; averages use all loaded records. Mood energy/stress and symptom
            severity use a 1-5 scale.
          </p>
        </details>
      </GlassCard>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Logged wellness index"
          value={wellnessScore !== null ? `${wellnessScore}/100` : "—"}
          hint={wellnessScore !== null ? "Sleep, hydration, mood & symptoms" : "Log data to unlock"}
          icon={<BarChart3 className="size-5" />}
          tone="lavender"
        />
        <StatCard
          label="Avg cycle length"
          value={cycleStats.averageLength ? `${cycleStats.averageLength} days` : "—"}
          hint={
            cycleStats.variation !== null
              ? `${cycleStats.variation} day variation${cycleStats.irregular ? " · irregular" : ""}`
              : "Needs 2+ logged cycles"
          }
          icon={<Droplets className="size-5" />}
          tone="rose"
          delay={0.05}
        />
        <StatCard
          label="Avg sleep"
          value={avgSleep !== null ? `${avgSleep} h` : "—"}
          hint={sleep.length ? `${sleep.length} nights logged` : "No sleep logs"}
          icon={<Moon className="size-5" />}
          tone="teal"
          delay={0.1}
        />
        <StatCard
          label="Hydration goal hit"
          value={hydrationRate !== null ? `${hydrationRate}%` : "—"}
          hint={water.length ? `${water.length} days logged` : "No water logs"}
          icon={<Activity className="size-5" />}
          tone="honey"
          delay={0.15}
        />
      </div>

      {wellnessScore !== null ? (
        <GlassCard className="space-y-3">
          <SectionTitle hint={`${wellnessScore}/100`}>Your logged wellness index</SectionTitle>
          <Progress value={wellnessScore} />
          <p className="text-xs text-muted-foreground">
            A blended score from sleep duration, hydration consistency, energy, stress and symptom
            severity. This descriptive index is not clinically validated and is not a health
            assessment.
          </p>
        </GlassCard>
      ) : null}

      <GlassCard delay={0.06} className="space-y-4">
        <SectionTitle hint={`${cycleStats.lengths.length} cycles compared`}>
          Cycle history
        </SectionTitle>
        {cycleStats.lengths.length === 0 ? (
          <EmptyState
            icon={<Droplets className="size-5" />}
            title="Not enough cycle data"
            description="Log at least two periods to compare cycle lengths."
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cycleStats.lengths.map((l) => ({ day: label(l.start), length: l.length }))}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={30} />
                <Tooltip />
                <Bar
                  isAnimationActive={!reduced}
                  animationDuration={280}
                  dataKey="length"
                  radius={[6, 6, 0, 0]}
                  fill="var(--primary)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard delay={0.08} className="space-y-4">
          <SectionTitle hint="Last 30 entries">Mood trends</SectionTitle>
          {moodSeries.length === 0 ? (
            <EmptyState icon={<Smile className="size-5" />} title="No mood entries yet" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 5]} fontSize={11} tickLine={false} width={26} />
                  <Tooltip />
                  <Line
                    isAnimationActive={!reduced}
                    animationDuration={280}
                    type="monotone"
                    dataKey="energy"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    isAnimationActive={!reduced}
                    animationDuration={280}
                    type="monotone"
                    dataKey="stress"
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.1} className="space-y-4">
          <SectionTitle hint="Average severity">Symptom trends</SectionTitle>
          {symptomSeries.length === 0 ? (
            <EmptyState icon={<Activity className="size-5" />} title="No symptoms logged yet" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptomSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    height={50}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 5]} fontSize={11} tickLine={false} width={26} />
                  <Tooltip />
                  <Bar
                    isAnimationActive={!reduced}
                    animationDuration={280}
                    dataKey="severity"
                    radius={[6, 6, 0, 0]}
                    fill="var(--primary)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.12} className="space-y-4">
          <SectionTitle hint="Hours per night">Sleep analytics</SectionTitle>
          {sleepSeries.length === 0 ? (
            <EmptyState icon={<Moon className="size-5" />} title="No sleep logs yet" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} width={26} />
                  <Tooltip />
                  <Line
                    isAnimationActive={!reduced}
                    animationDuration={280}
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.14} className="space-y-4">
          <SectionTitle hint="Glasses vs goal">Hydration analytics</SectionTitle>
          {waterSeries.length === 0 ? (
            <EmptyState icon={<Droplets className="size-5" />} title="No hydration logs yet" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} width={26} />
                  <Tooltip />
                  <Bar
                    isAnimationActive={!reduced}
                    animationDuration={280}
                    dataKey="glasses"
                    radius={[6, 6, 0, 0]}
                    fill="var(--primary)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard delay={0.16} className="space-y-4">
        <SectionTitle
          hint={
            weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange} kg` : undefined
          }
        >
          Weight progress
        </SectionTitle>
        {weightSeries.length === 0 ? (
          <EmptyState
            icon={<Scale className="size-5" />}
            title="No weight entries yet"
            description="Log your weight from the PCOS or Profile page to see progress."
          />
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={34} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  isAnimationActive={!reduced}
                  animationDuration={280}
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard delay={0.18} className="space-y-3">
        <SectionTitle>Your 90-day summary</SectionTitle>
        <ul className="space-y-2">
          {monthlyInsights.map((insight) => (
            <li
              key={insight}
              className="rounded-2xl border border-border/60 p-3 text-sm leading-relaxed"
            >
              {insight}
            </li>
          ))}
        </ul>
        <Disclaimer />
      </GlassCard>
    </>
  );
}
