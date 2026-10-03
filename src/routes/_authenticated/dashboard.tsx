import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Droplets,
  GlassWater,
  Smile,
  Sparkle,
  Heart,
  ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useReducedMotion } from "motion/react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { DailyCheckIn } from "@/components/hercare/daily-check-in";
import {
  GlassCard,
  PageHeader,
  Disclaimer,
  LoadingCard,
  ErrorState,
  EmptyState,
  SectionTitle,
} from "@/components/hercare/kit";
import { CareLink, Eyebrow, MetricValue } from "@/components/hercare/care-primitives";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfile, useRows, useUpsertDaily, today } from "@/lib/data";
import { computeCycle, PHASE_INFO, pretty } from "@/lib/cycle";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HerCare AI" },
      {
        name: "description",
        content: "Your cycle, daily check-in and recent health records at a glance.",
      },
      { property: "og:title", content: "Dashboard — HerCare AI" },
      { property: "og:description", content: "Your personal women's health overview." },
    ],
  }),
  component: Dashboard,
});

type Cycle = { id: string; start_date: string; end_date: string | null };
type WaterLog = { id: string; log_date: string; glasses: number; goal_glasses: number };
type Mood = {
  id: string;
  log_date: string;
  created_at: string;
  mood: string;
  energy_level: number | null;
  journal: string | null;
};
type Symptom = {
  id: string;
  log_date: string;
  created_at: string;
  name: string;
  severity: number;
  notes: string | null;
};

function Dashboard() {
  const reduced = useReducedMotion();
  const { data: profile } = useProfile();
  const cyclesQuery = useRows<Cycle>("cycles", { orderBy: "start_date" });
  const range = {
    orderBy: "log_date",
    limit: 1000,
    rangeStart: today().slice(0, 7) + "-01",
    rangeEnd: today(),
  };
  const moodsQuery = useRows<Mood>("moods", range);
  const symptomsQuery = useRows<Symptom>("symptoms", range);
  const waterQuery = useRows<WaterLog>("water_logs", range);
  const saveWater = useUpsertDaily("water_logs", "Hydration updated");
  const queries = [cyclesQuery, moodsQuery, symptomsQuery, waterQuery];
  const cycles = cyclesQuery.data ?? [];
  const moods = moodsQuery.data ?? [];
  const symptoms = symptomsQuery.data ?? [];
  const water = waterQuery.data?.find((w) => w.log_date === today());
  const lastStart = cycles[0]?.start_date ?? profile?.last_period_start;
  const cycle = lastStart
    ? computeCycle(
        parseISO(lastStart),
        profile?.avg_cycle_length ?? 28,
        profile?.avg_period_length ?? 5,
      )
    : null;
  const unavailable = queries.some((q) => q.isError);
  const pending = queries.some((q) => q.isLoading);
  const glasses = water?.glasses ?? 0;
  const goal = water?.goal_glasses ?? 8;
  const activity = [
    ...moods.map((m) => ({
      id: m.id,
      date: m.log_date,
      created: m.created_at,
      title: `${m.mood} mood`,
      detail: m.energy_level === null ? "Energy not recorded" : `Energy ${m.energy_level}/5`,
      icon: Smile,
      to: "/mood",
      note: m.journal,
    })),
    ...symptoms.map((s) => ({
      id: s.id,
      date: s.log_date,
      created: s.created_at,
      title: s.name,
      detail: `Severity ${s.severity}/5`,
      icon: Activity,
      to: "/symptoms",
      note: s.notes,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created))
    .slice(0, 5);
  const energy = [...moods]
    .reverse()
    .slice(-14)
    .map((m) => ({ date: format(parseISO(m.log_date), "d MMM"), energy: m.energy_level }));
  const latestMood = moods[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${profile?.display_name?.split(" ")[0] ?? "there"}.`}
        description="A little attention to yourself. A clearer picture over time."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-4" />
            {format(parseISO(today()), "EEEE, d MMMM")}
          </span>
        }
      />
      {unavailable && (
        <ErrorState
          message="Your overview could not be refreshed. You can still complete your check-in."
          onRetry={() => queries.forEach((q) => void q.refetch())}
        />
      )}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="xl:order-2">
          <DailyCheckIn />
        </div>
        <div className="space-y-5 xl:order-1">
          <section
            className="care-feature relative overflow-hidden rounded-3xl p-6 sm:p-8"
            aria-label="Your cycle overview"
          >
            <div
              className="care-orbit pointer-events-none absolute -right-24 -top-32 size-80"
              aria-hidden="true"
            />
            <div
              className="care-orbit pointer-events-none absolute -right-12 -top-20 size-56"
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between gap-3">
              <Eyebrow className="care-subtle">Your rhythm</Eyebrow>
              <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-medium">
                Cycle estimates
              </span>
            </div>
            <div className="relative my-6 flex items-center gap-4 sm:my-8 sm:gap-6">
              <div className="relative grid size-24 sm:size-36 shrink-0 place-items-center rounded-full border-[10px] border-white/10">
                <svg
                  viewBox="0 0 140 140"
                  className="absolute -inset-2.5 size-24 sm:size-36 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="70"
                    cy="70"
                    r="65"
                    fill="none"
                    stroke="var(--rose)"
                    strokeWidth="7"
                    strokeDasharray={
                      cycle
                        ? `${Math.min(1, cycle.cycleDay / (profile?.avg_cycle_length ?? 28)) * 408} 408`
                        : "5 12"
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <p className="care-subtle text-[10px] uppercase tracking-widest">
                    {cycle && !unavailable ? "Cycle day" : "Your cycle"}
                  </p>
                  <p className="mt-1 font-display text-4xl">
                    {cycle && !unavailable ? (
                      <MetricValue>{cycle.cycleDay}</MetricValue>
                    ) : (
                      <Heart className="mx-auto mt-2 size-8" />
                    )}
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl leading-tight">
                  {cycle && !unavailable
                    ? `${PHASE_INFO[cycle.phase].label} phase`
                    : "Get to know your rhythm."}
                </h2>
                <p className="care-subtle mt-3 text-xs sm:text-sm leading-relaxed">
                  {cycle && !unavailable
                    ? `Next period estimated ${pretty(cycle.nextPeriod)}. Your patterns are personal; dates may vary.`
                    : "Start with your last period. Build a picture that is personal to you."}
                </p>
              </div>
            </div>
            <Link
              to="/cycle"
              className="relative inline-flex min-h-11 items-center gap-3 border-b border-white/30 text-sm font-medium"
            >
              {cycle ? "Explore your cycle" : "Add your first period"}
              <ArrowRight className="size-4" />
            </Link>
          </section>
          <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-5">
            <div className="px-3 sm:px-5">
              <Eyebrow>Latest mood</Eyebrow>
              <p className="mt-2 text-lg font-semibold">
                {unavailable || pending ? "--" : (latestMood?.mood ?? "Not logged")}
              </p>
            </div>
            <div className="px-3 sm:px-5">
              <Eyebrow>Energy</Eyebrow>
              <p className="mt-2 text-lg font-semibold">
                {!unavailable && latestMood?.energy_level != null
                  ? `${latestMood.energy_level}/5`
                  : "--"}
              </p>
            </div>
            <div className="px-3 sm:px-5">
              <Eyebrow>This month</Eyebrow>
              <p className="mt-2 text-lg font-semibold">
                <MetricValue>
                  {unavailable || pending ? "--" : moods.length + symptoms.length}
                </MetricValue>
                <span className="ml-1 text-xs font-normal text-muted-foreground">logs</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      {queries.some((q) => q.isLoading) ? (
        <LoadingCard />
      ) : (
        !unavailable && (
          <>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
              <GlassCard className="space-y-5">
                <SectionTitle hint="1 = low / 5 = high">Your energy, over time</SectionTitle>
                {energy.some((e) => e.energy !== null) ? (
                  <div className="h-52 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={energy}
                        margin={{ left: -20, right: 12, top: 10, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--border)"
                          strokeDasharray="4 4"
                        />
                        <XAxis
                          dataKey="date"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis
                          domain={[1, 5]}
                          ticks={[1, 3, 5]}
                          fontSize={11}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Line
                          name="Energy (1-5)"
                          dataKey="energy"
                          type="monotone"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "var(--card)" }}
                          isAnimationActive={!reduced}
                          animationDuration={320}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Activity className="size-5" />}
                    title="Your story starts with a check-in"
                    description="Saved energy entries will appear here. No sample trends, just your records."
                  />
                )}
                <Link
                  to="/analytics"
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary"
                >
                  Explore all insights <ArrowUpRight className="size-4" />
                </Link>
              </GlassCard>
              <GlassCard className="space-y-4">
                <SectionTitle hint="This month">Recent activity</SectionTitle>
                {activity.length ? (
                  <ul className="divide-y divide-border">
                    {activity.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={item.to}
                          className="group flex items-center gap-3 rounded-xl py-3"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                            <item.icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.detail}
                              {item.note?.startsWith("Fictional demo QA")
                                ? " / Fictional QA entry"
                                : ""}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(item.date), "d MMM")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Smile className="size-5" />}
                    title="A fresh start"
                    description="Your saved moods and symptoms will collect here."
                  />
                )}
              </GlassCard>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <Eyebrow>Small daily habits</Eyebrow>
                  <GlassWater className="size-5 text-primary" />
                </div>
                <h2 className="text-xl">A moment to hydrate</h2>
                <p className="text-3xl font-semibold tabular-nums">
                  {glasses}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    of {goal} glasses
                  </span>
                </p>
                <Progress
                  aria-label="Today's hydration goal"
                  value={Math.min(100, (glasses / Math.max(1, goal)) * 100)}
                />
                <Button
                  variant="outline"
                  disabled={saveWater.isPending}
                  onClick={() =>
                    saveWater.mutate({
                      logDate: today(),
                      values: { glasses: glasses + 1, goal_glasses: goal },
                    })
                  }
                >
                  {saveWater.isPending ? "Saving..." : "Add a glass"}
                </Button>
              </GlassCard>
              <div className="space-y-3">
                <CareLink
                  to="/symptoms"
                  icon={Activity}
                  title="Log a symptom"
                  description="Notice how you feel"
                />
                <CareLink
                  to="/mood"
                  icon={Smile}
                  title="Open your journal"
                  description="Make room for reflection"
                />
                <CareLink
                  to="/wellness"
                  icon={Droplets}
                  title="Daily wellness"
                  description="Sleep, meals and movement"
                />
              </div>
              <GlassCard className="flex flex-col items-start gap-4 bg-secondary/30">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                  <Sparkle className="size-5" />
                </span>
                <h2 className="text-2xl">A little perspective.</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ask about patterns in your saved cycle, mood and symptom records. Educational
                  guidance, with the context behind each answer.
                </p>
                <Button asChild variant="outline" className="mt-auto">
                  <Link to="/assistant">
                    Ask HerCare AI <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </GlassCard>
            </div>
          </>
        )
      )}
      <Disclaimer />
    </>
  );
}
