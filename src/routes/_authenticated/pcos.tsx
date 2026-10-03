import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { validLogDate, validNumber } from "@/lib/validation";
import { CareBanner, SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Stethoscope, Trash2 } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
import { average, round } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/pcos")({
  head: () => ({
    meta: [
      { title: "PCOS tracker — HerCare AI" },
      {
        name: "description",
        content:
          "Track PCOS symptoms, weight, acne, hair changes, blood sugar and lifestyle habits.",
      },
      { property: "og:title", content: "PCOS tracker — HerCare AI" },
      { property: "og:description", content: "Spot PCOS patterns over time with clear charts." },
    ],
  }),
  component: PcosPage,
});

type PcosLog = {
  id: string;
  log_date: string;
  weight_kg: number | null;
  bmi: number | null;
  waist_cm: number | null;
  acne: number | null;
  hair_growth: number | null;
  hair_loss: number | null;
  fatigue: number | null;
  cravings: number | null;
  blood_sugar: number | null;
  notes: string | null;
};

const LIFESTYLE = [
  {
    title: "Keep context with your numbers",
    detail:
      "Note when a measurement was taken and any changes you want to discuss with your clinician.",
  },
  {
    title: "Prepare for your next visit",
    detail:
      "Bring your dated symptom history and questions. Tracking supports a conversation; it does not establish a diagnosis.",
  },
];

function PcosPage() {
  const reducedMotion = useReducedMotion();
  const [metric, setMetric] = useState<"weight" | "acne" | "sugar">("weight");
  const metricLabels = { weight: "Weight (kg)", acne: "Acne (0-5)", sugar: "Blood sugar (mg/dL)" };
  const { data: profile } = useProfile();
  const logsQuery = useRows<PcosLog>("pcos_logs", { orderBy: "log_date" });
  const insert = useInsertRow("pcos_logs", "PCOS entry saved");
  const del = useDeleteRow("pcos_logs");

  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [acne, setAcne] = useState(2);
  const [hairGrowth, setHairGrowth] = useState(2);
  const [hairLoss, setHairLoss] = useState(1);
  const [fatigue, setFatigue] = useState(2);
  const [cravings, setCravings] = useState(2);
  const [notes, setNotes] = useState("");

  const logs = logsQuery.data ?? [];
  const height = profile?.height_cm ?? null;

  const chart = [...logs]
    .reverse()
    .slice(-30)
    .map((l) => ({
      date: l.log_date.slice(5),
      weight: l.weight_kg ?? null,
      acne: l.acne ?? null,
      sugar: l.blood_sugar ?? null,
    }));

  function save() {
    const weightValue = weight ? Number(weight) : null;
    if (!validLogDate(date, today())) return void toast.error("Choose a valid date up to today.");
    if (
      !validNumber(weight, 20, 400) ||
      !validNumber(waist, 30, 250) ||
      !validNumber(bloodSugar, 30, 600)
    ) {
      return void toast.error(
        "Check your measurements: weight 20-400 kg, waist 30-250 cm, blood sugar 30-600 mg/dL. Leave unmeasured fields blank.",
      );
    }
    const bmi =
      weightValue && height ? Number((weightValue / (Number(height) / 100) ** 2).toFixed(1)) : null;
    insert.mutate(
      {
        log_date: date,
        weight_kg: weightValue,
        bmi,
        waist_cm: waist ? Number(waist) : null,
        blood_sugar: bloodSugar ? Number(bloodSugar) : null,
        acne,
        hair_growth: hairGrowth,
        hair_loss: hairLoss,
        fatigue,
        cravings,
        notes: notes || null,
      },
      { onSuccess: () => setNotes("") },
    );
  }

  return (
    <>
      <PageHeader
        title="PCOS tracker"
        description="Weight, skin, hair, energy and blood sugar in one place."
      />

      <CareBanner icon={Stethoscope} title="A record of your experience">
        Keep measurements and symptoms together, at your own pace. All measurements are optional.
      </CareBanner>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest weight"
          value={logs[0]?.weight_kg ? `${logs[0]!.weight_kg} kg` : "—"}
          hint={logs[0]?.bmi ? `BMI ${logs[0]!.bmi}` : "Add height in profile for BMI"}
          icon={<Stethoscope className="size-5" />}
          tone="teal"
        />
        <StatCard
          label="Avg acne"
          value={round(average(logs.map((l) => l.acne))) ?? "—"}
          hint="0–5 scale"
          tone="rose"
          delay={0.05}
        />
        <StatCard
          label="Avg fatigue"
          value={round(average(logs.map((l) => l.fatigue))) ?? "—"}
          hint="0–5 scale"
          tone="lavender"
          delay={0.1}
        />
        <StatCard
          label="Avg blood sugar"
          value={round(average(logs.map((l) => l.blood_sugar))) ?? "—"}
          hint="mg/dL as logged"
          tone="honey"
          delay={0.15}
        />
      </div>

      <GlassCard delay={0.05} className="space-y-5">
        <SectionTitle>Log today</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="pcos-field-1">Date</Label>
            <Input
              id="pcos-field-1"
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcos-field-2">Weight (kg)</Label>
            <Input
              id="pcos-field-2"
              type="number"
              min={20}
              max={400}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcos-field-3">Waist (cm)</Label>
            <Input
              id="pcos-field-3"
              type="number"
              min={30}
              max={250}
              step="0.1"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcos-field-4">Blood sugar (mg/dL)</Label>
            <Input
              id="pcos-field-4"
              type="number"
              min={30}
              max={600}
              step="1"
              value={bloodSugar}
              onChange={(e) => setBloodSugar(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Scale label="Acne" value={acne} onChange={setAcne} />
          <Scale label="Hair growth (hirsutism)" value={hairGrowth} onChange={setHairGrowth} />
          <Scale label="Hair loss" value={hairLoss} onChange={setHairLoss} />
          <Scale label="Fatigue" value={fatigue} onChange={setFatigue} />
          <Scale label="Sugar cravings" value={cravings} onChange={setCravings} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pcos-field-5">Insulin resistance & other notes</Label>
          <Textarea
            id="pcos-field-5"
            rows={3}
            maxLength={1000}
            placeholder="Fasting insulin results, medication changes, skin tags, energy crashes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button onClick={save} disabled={insert.isPending}>
          <Stethoscope className="size-4" /> Save entry
        </Button>
        <SaveStatus pending={insert.isPending} error={insert.isError} />
      </GlassCard>

      {chart.length > 1 ? (
        <GlassCard delay={0.1} className="space-y-4">
          <SectionTitle hint="Last 30 entries; gaps mean no measurement">Trends</SectionTitle>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chart measurement">
            {(["weight", "acne", "sugar"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={metric === key ? "default" : "outline"}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {metricLabels[key]}
              </Button>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={metric === "acne" ? [0, 5] : ["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Line
                  key={metric}
                  name={metricLabels[metric]}
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={!reducedMotion}
                  animationDuration={320}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle>Make your history useful</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LIFESTYLE.map((item) => (
            <li key={item.title} className="rounded-2xl border border-border/60 p-4">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
        <Disclaimer />
      </GlassCard>

      <GlassCard delay={0.18} className="space-y-3">
        <SectionTitle>History</SectionTitle>
        {logsQuery.isLoading ? (
          <LoadingCard />
        ) : logsQuery.isError ? (
          <ErrorState onRetry={() => logsQuery.refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="size-5" />}
            title="No PCOS entries yet"
            description="Log weekly to see how symptoms shift with your cycle and habits."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {logs.slice(0, 20).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{l.log_date}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.weight_kg ? `${l.weight_kg} kg · ` : ""}
                    acne {l.acne ?? "—"} · hair growth {l.hair_growth ?? "—"} · fatigue{" "}
                    {l.fatigue ?? "—"}
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

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}: {value}/5
      </Label>
      <Slider
        aria-label={label}
        value={[value]}
        min={0}
        max={5}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
    </div>
  );
}
