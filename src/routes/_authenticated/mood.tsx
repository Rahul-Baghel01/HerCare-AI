import { useReducedMotion } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Smile, SmilePlus, Meh, Frown, Cloud, Flame, Trash2 } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  GlassCard,
  PageHeader,
  EmptyState,
  LoadingCard,
  ErrorState,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useRows, today } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mood")({
  head: () => ({
    meta: [
      { title: "Mood journal — HerCare AI" },
      { name: "description", content: "Log mood, energy, stress and daily gratitude reflections." },
      { property: "og:title", content: "Mood journal — HerCare AI" },
      { property: "og:description", content: "Notice emotional patterns across your cycle." },
    ],
  }),
  component: MoodPage,
});

const MOODS = [
  { icon: SmilePlus, mood: "Great", emoji: "😄" },
  { icon: Smile, mood: "Good", emoji: "🙂" },
  { icon: Meh, mood: "Okay", emoji: "😐" },
  { icon: Frown, mood: "Low", emoji: "😔" },
  { icon: Cloud, mood: "Anxious", emoji: "😰" },
  { icon: Flame, mood: "Irritable", emoji: "😤" },
];

type Mood = {
  id: string;
  log_date: string;
  mood: string;
  emoji: string | null;
  energy_level: number | null;
  stress_level: number | null;
  journal: string | null;
  gratitude: string | null;
};

function MoodPage() {
  const recordsQuery = useRows<Mood>("moods", { orderBy: "log_date" });
  const moods = recordsQuery.data ?? [];
  const reduced = useReducedMotion();
  const insert = useInsertRow("moods", "Mood saved");
  const del = useDeleteRow("moods");

  const [selected, setSelected] = useState(MOODS[1]!);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(2);
  const [date, setDate] = useState(today());
  const [journal, setJournal] = useState("");
  const [gratitude, setGratitude] = useState("");

  const chart = [...moods]
    .reverse()
    .slice(-21)
    .map((m) => ({
      date: m.log_date.slice(5),
      energy: m.energy_level ?? null,
      stress: m.stress_level ?? null,
    }));

  return (
    <>
      <PageHeader title="Mood journal" description="A gentle check-in with yourself." />

      {recordsQuery.isError && <ErrorState onRetry={() => void recordsQuery.refetch()} />}
      <GlassCard className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.mood}
              aria-pressed={selected.mood === m.mood}
              type="button"
              onClick={() => setSelected(m)}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors",
                selected.mood === m.mood
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:bg-accent",
              )}
            >
              <m.icon aria-hidden className="size-5" />
              {m.mood}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Energy: {energy}/5</Label>
            <Slider
              aria-label="Energy"
              value={[energy]}
              min={1}
              max={5}
              step={1}
              onValueChange={(v) => setEnergy(v[0] ?? 3)}
            />
          </div>
          <div className="space-y-2">
            <Label>Stress: {stress}/5</Label>
            <Slider
              aria-label="Stress"
              value={[stress]}
              min={1}
              max={5}
              step={1}
              onValueChange={(v) => setStress(v[0] ?? 2)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mood-date">Date</Label>
            <Input
              id="mood-date"
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mood-gratitude">Grateful for</Label>
            <Input
              id="mood-gratitude"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mood-journal">Journal</Label>
          <Textarea
            id="mood-journal"
            rows={4}
            placeholder="How did today feel?"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
          />
        </div>

        <Button
          onClick={() =>
            insert.mutate({
              log_date: date,
              mood: selected.mood,
              emoji: selected.emoji,
              energy_level: energy,
              stress_level: stress,
              journal: journal || null,
              gratitude: gratitude || null,
            })
          }
          disabled={insert.isPending || !date || date > today()}
        >
          <Smile className="size-4" /> Save entry
        </Button>
        {insert.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not save. Your entries are still here. Please try again.
          </p>
        )}
        {insert.isSuccess && (
          <p role="status" className="text-sm text-primary">
            Saved. View your entry in the history below.
          </p>
        )}
      </GlassCard>

      {chart.length > 1 ? (
        <GlassCard delay={0.06} className="space-y-4">
          <h2 className="font-medium">Energy vs stress</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  isAnimationActive={!reduced}
                  animationDuration={280}
                  type="monotone"
                  dataKey="energy"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  isAnimationActive={!reduced}
                  animationDuration={280}
                  type="monotone"
                  dataKey="stress"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard delay={0.1} className="space-y-3">
        <h2 className="font-medium">Journal entries</h2>
        {recordsQuery.isLoading ? (
          <LoadingCard />
        ) : recordsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            History is unavailable. Retry above to load your records.
          </p>
        ) : moods.length === 0 ? (
          <EmptyState icon={<Smile className="size-5" />} title="No entries yet" />
        ) : (
          <ul className="space-y-3">
            {moods.slice(0, 15).map((m) => (
              <li key={m.id} className="rounded-2xl border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <Smile aria-hidden className="mr-1 inline size-4 text-primary" />
                      {m.mood} · {m.log_date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Energy {m.energy_level ?? "—"}/5 · Stress {m.stress_level ?? "—"}/5
                    </p>
                    {m.journal ? <p className="mt-2 text-sm">{m.journal}</p> : null}
                    {m.gratitude ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Grateful for: {m.gratitude}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={del.isPending}
                    aria-label="Delete entry"
                    onClick={() => del.mutate(m.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
