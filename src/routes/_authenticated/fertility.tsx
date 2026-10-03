import { useReducedMotion } from "motion/react";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { validLogDate, validNumber } from "@/lib/validation";
import { CareBanner, SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartPulse, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  StatCard,
  LoadingCard,
  ErrorState,
  Disclaimer,
  SectionTitle,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useProfile, useRows, today } from "@/lib/data";
import { computeCycle, pretty } from "@/lib/cycle";

export const Route = createFileRoute("/_authenticated/fertility")({
  head: () => ({
    meta: [
      { title: "Fertility tracking — HerCare AI" },
      {
        name: "description",
        content:
          "Log basal body temperature, cervical mucus and ovulation tests to find your fertile window.",
      },
      { property: "og:title", content: "Fertility tracking — HerCare AI" },
      { property: "og:description", content: "BBT charting and fertile window predictions." },
    ],
  }),
  component: FertilityPage,
});

type FertilityLog = {
  id: string;
  log_date: string;
  bbt_c: number | null;
  cervical_mucus: string | null;
  ovulation_test: string | null;
  intercourse: boolean;
  notes: string | null;
};

type Cycle = { id: string; start_date: string };

const MUCUS = ["dry", "sticky", "creamy", "watery", "egg white"];
const TESTS = ["not tested", "negative", "positive", "peak"];

function FertilityPage() {
  const reducedMotion = useReducedMotion();
  const { data: profile } = useProfile();
  const { data: cycles = [] } = useRows<Cycle>("cycles", { orderBy: "start_date" });
  const logsQuery = useRows<FertilityLog>("fertility_logs", { orderBy: "log_date" });
  const insert = useInsertRow("fertility_logs", "Fertility entry saved");
  const del = useDeleteRow("fertility_logs");

  const [date, setDate] = useState(today());
  const [bbt, setBbt] = useState("");
  const [mucus, setMucus] = useState("creamy");
  const [test, setTest] = useState("not tested");
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState("");

  const logs = logsQuery.data ?? [];
  const lastStart = cycles[0]?.start_date ?? profile?.last_period_start ?? null;
  const snapshot = lastStart
    ? computeCycle(
        parseISO(lastStart),
        profile?.avg_cycle_length ?? 28,
        profile?.avg_period_length ?? 5,
      )
    : null;

  const chart = [...logs]
    .reverse()
    .slice(-30)
    .filter((l) => l.bbt_c !== null)
    .map((l) => ({ date: l.log_date.slice(5), bbt: l.bbt_c }));

  function save() {
    const bbtValue = bbt ? Number(bbt) : null;
    if (!validLogDate(date, today())) return void toast.error("Choose a valid date up to today.");
    if (!validNumber(bbt, 34, 42))
      return void toast.error(
        "Enter a temperature between 34 and 42 degrees C, or leave it blank.",
      );
    insert.mutate(
      {
        log_date: date,
        bbt_c: bbtValue,
        cervical_mucus: mucus,
        ovulation_test: test,
        intercourse,
        notes: notes || null,
      },
      { onSuccess: () => setNotes("") },
    );
  }

  return (
    <>
      <PageHeader
        title="Fertility"
        description="Your temperature, observations and cycle estimates, together."
      />

      <CareBanner icon={HeartPulse} title="Observe your own patterns">
        Cycle dates are estimates, not confirmation of ovulation. Do not use these predictions as
        contraception.
      </CareBanner>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Fertile window"
          value={
            snapshot ? `${pretty(snapshot.fertileStart)} → ${pretty(snapshot.fertileEnd)}` : "—"
          }
          hint={snapshot ? "Estimated from cycle history" : "Log a period first"}
          icon={<HeartPulse className="size-5" />}
          tone="teal"
        />
        <StatCard
          label="Ovulation"
          value={snapshot ? pretty(snapshot.ovulation) : "—"}
          hint="Approximately"
          tone="rose"
          delay={0.05}
        />
        <StatCard
          label="Entries logged"
          value={logs.length}
          hint="BBT, mucus and tests"
          tone="lavender"
          delay={0.1}
        />
      </div>

      <GlassCard delay={0.05} className="space-y-5">
        <SectionTitle>Log a day</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="fertility-field-1">Date</Label>
            <Input
              id="fertility-field-1"
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fertility-field-2">BBT (°C)</Label>
            <Input
              id="fertility-field-2"
              type="number"
              min={34}
              max={42}
              step="0.01"
              value={bbt}
              onChange={(e) => setBbt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fertility-field-3">Cervical mucus</Label>
            <Select value={mucus} onValueChange={setMucus}>
              <SelectTrigger id="fertility-field-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUCUS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fertility-field-4">Ovulation test</Label>
            <Select value={test} onValueChange={setTest}>
              <SelectTrigger id="fertility-field-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TESTS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
          <Label htmlFor="fertility-field-5">Intercourse</Label>
          <Switch id="fertility-field-5" checked={intercourse} onCheckedChange={setIntercourse} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fertility-field-6">Notes</Label>
          <Textarea
            id="fertility-field-6"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={insert.isPending}>
          <HeartPulse className="size-4" /> Save entry
        </Button>
        <SaveStatus pending={insert.isPending} error={insert.isError} />
      </GlassCard>

      {chart.length > 1 ? (
        <GlassCard delay={0.1} className="space-y-4">
          <SectionTitle hint="Your recorded temperature in degrees C">BBT chart</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="bbt"
                  name="BBT (degrees C)"
                  isAnimationActive={!reducedMotion}
                  animationDuration={320}
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Disclaimer />
        </GlassCard>
      ) : null}

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle>History</SectionTitle>
        {logsQuery.isLoading ? (
          <LoadingCard />
        ) : logsQuery.isError ? (
          <ErrorState onRetry={() => logsQuery.refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState icon={<HeartPulse className="size-5" />} title="No fertility entries yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {logs.slice(0, 20).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{l.log_date}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.bbt_c ? `${l.bbt_c}°C · ` : ""}
                    {l.cervical_mucus ?? "—"} · test {l.ovulation_test ?? "—"}
                    {l.intercourse ? " · intercourse" : ""}
                  </p>
                  {l.notes ? <p className="mt-1 text-sm">{l.notes}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => del.mutate(l.id)}
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
