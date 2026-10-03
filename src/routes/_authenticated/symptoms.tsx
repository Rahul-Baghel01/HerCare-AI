import { useReducedMotion } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GlassCard,
  PageHeader,
  EmptyState,
  LoadingCard,
  ErrorState,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useRows, today } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/symptoms")({
  head: () => ({
    meta: [
      { title: "Symptom tracker — HerCare AI" },
      {
        name: "description",
        content: "Log cramps, headaches, bloating and more with severity levels.",
      },
      { property: "og:title", content: "Symptom tracker — HerCare AI" },
      { property: "og:description", content: "See how your symptoms change through your cycle." },
    ],
  }),
  component: SymptomsPage,
});

const CATEGORIES: Record<string, string[]> = {
  Pain: ["Cramps", "Headache", "Back pain", "Breast tenderness"],
  Digestive: ["Bloating", "Nausea", "Constipation", "Appetite change"],
  Skin: ["Acne", "Dryness", "Hair loss"],
  Energy: ["Fatigue", "Insomnia", "Dizziness"],
};

type Symptom = {
  id: string;
  log_date: string;
  category: string;
  name: string;
  severity: number;
  notes: string | null;
};

function SymptomsPage() {
  const recordsQuery = useRows<Symptom>("symptoms", { orderBy: "log_date" });
  const symptoms = recordsQuery.data ?? [];
  const reduced = useReducedMotion();
  const insert = useInsertRow("symptoms", "Symptom logged");
  const del = useDeleteRow("symptoms");

  const [category, setCategory] = useState("Pain");
  const [name, setName] = useState("Cramps");
  const [severity, setSeverity] = useState(3);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const chart = Object.entries(
    symptoms.reduce<Record<string, { total: number; count: number }>>((acc, s) => {
      const entry = acc[s.name] ?? { total: 0, count: 0 };
      acc[s.name] = { total: entry.total + s.severity, count: entry.count + 1 };
      return acc;
    }, {}),
  )
    .map(([label, v]) => ({ label, severity: Number((v.total / v.count).toFixed(1)) }))
    .slice(0, 8);

  return (
    <>
      <PageHeader title="Symptoms" description="Track what you feel and how strongly." />

      {recordsQuery.isError && <ErrorState onRetry={() => void recordsQuery.refetch()} />}
      <GlassCard className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="symptoms-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setName(CATEGORIES[v]?.[0] ?? "");
              }}
            >
              <SelectTrigger id="symptoms-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIES).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="symptoms-symptom">Symptom</Label>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger id="symptoms-symptom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(CATEGORIES[category] ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="symptoms-date">Date</Label>
            <Input
              id="symptoms-date"
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Severity: {severity}/5</Label>
          <Slider
            aria-label="Symptom severity"
            value={[severity]}
            min={1}
            max={5}
            step={1}
            onValueChange={(v) => setSeverity(v[0] ?? 3)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="symptoms-notes">Notes</Label>
          <Textarea
            id="symptoms-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button
          onClick={() =>
            insert.mutate({
              log_date: date,
              category,
              name,
              severity,
              notes: notes || null,
            })
          }
          disabled={insert.isPending || !date || date > today()}
        >
          <Activity className="size-4" /> Log symptom
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

      {chart.length > 0 ? (
        <GlassCard delay={0.06} className="space-y-4">
          <h2 className="font-medium">Average severity by symptom</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  height={50}
                />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  isAnimationActive={!reduced}
                  animationDuration={280}
                  dataKey="severity"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard delay={0.1} className="space-y-3">
        <h2 className="font-medium">Recent logs</h2>
        {recordsQuery.isLoading ? (
          <LoadingCard />
        ) : recordsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            History is unavailable. Retry above to load your records.
          </p>
        ) : symptoms.length === 0 ? (
          <EmptyState icon={<Activity className="size-5" />} title="Nothing logged yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {symptoms.slice(0, 20).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.name} · {s.severity}/5
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.log_date} · {s.category}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={del.isPending}
                  aria-label="Delete entry"
                  onClick={() => del.mutate(s.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
