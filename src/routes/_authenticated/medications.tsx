import { validDoseTimes } from "@/lib/validation";
import { CareBanner, SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pill, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  SectionTitle,
  Disclaimer,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useRows, useUpdateRow, today } from "@/lib/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/medications")({
  head: () => ({
    meta: [
      { title: "Medications & supplements — HerCare AI" },
      {
        name: "description",
        content: "Track medications and supplements, set dose times and tick off today's doses.",
      },
      { property: "og:title", content: "Medications & supplements — HerCare AI" },
      { property: "og:description", content: "Never miss a dose with daily medication tracking." },
    ],
  }),
  component: MedicationsPage,
});

type Medication = {
  id: string;
  name: string;
  med_type: string;
  dosage: string | null;
  times: string[];
  active: boolean;
};

type MedicationLog = { id: string; medication_id: string; log_date: string; taken: boolean };

const TYPES = ["supplement", "prescription", "contraceptive", "pain relief", "other"];

function MedicationsPage() {
  const medsQuery = useRows<Medication>("medications");
  const logsQuery = useRows<MedicationLog>("medication_logs", { orderBy: "log_date", limit: 400 });
  const insertMed = useInsertRow("medications", "Medication added");
  const insertLog = useInsertRow("medication_logs", "Dose logged");
  const updateMed = useUpdateRow("medications");
  const delMed = useDeleteRow("medications");
  const delLog = useDeleteRow("medication_logs");

  const [name, setName] = useState("");
  const [type, setType] = useState("supplement");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState("08:00");

  const meds = medsQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const todaysLogs = logs.filter((l) => l.log_date === today());

  function add() {
    const clean = name.trim();
    if (clean.length < 2) {
      toast.error("Enter a medication name.");
      return;
    }
    if (!validDoseTimes(times))
      return void toast.error("Use up to six times in 24-hour HH:mm format, separated by commas.");
    insertMed.mutate(
      {
        name: clean.slice(0, 120),
        med_type: type,
        dosage: dosage.trim() ? dosage.trim().slice(0, 120) : null,
        times: times
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 6),
        active: true,
      },
      {
        onSuccess: () => {
          setName("");
          setDosage("");
        },
      },
    );
  }

  function toggleDose(med: Medication) {
    const existing = todaysLogs.find((l) => l.medication_id === med.id);
    if (existing) {
      delLog.mutate(existing.id);
      return;
    }
    insertLog.mutate({ medication_id: med.id, log_date: today(), taken: true });
  }

  return (
    <>
      <PageHeader
        title="Medications & supplements"
        description="Keep your schedule and a daily medication record together."
      />

      <CareBanner icon={Pill} title="Your schedule, at a glance">
        Times are a reference. Mark taken records one confirmation per medication per day, not each
        individual dose. Follow your prescribed schedule.
      </CareBanner>
      <GlassCard className="space-y-4">
        <SectionTitle>Add a medication</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="medications-field-1">Name</Label>
            <Input
              id="medications-field-1"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Metformin"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medications-field-2">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="medications-field-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medications-field-3">Dosage</Label>
            <Input
              id="medications-field-3"
              value={dosage}
              maxLength={120}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="500 mg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medications-field-4">Times (comma separated)</Label>
            <Input
              id="medications-field-4"
              value={times}
              onChange={(e) => setTimes(e.target.value)}
              placeholder="08:00, 20:00"
            />
          </div>
        </div>
        <Button onClick={add} disabled={insertMed.isPending}>
          <Pill className="size-4" /> Add medication
        </Button>
        <SaveStatus pending={insertMed.isPending} error={insertMed.isError} />
      </GlassCard>

      <GlassCard delay={0.06} className="space-y-3">
        <SectionTitle hint="One confirmation per medication">Today's medications</SectionTitle>
        {medsQuery.isLoading || logsQuery.isLoading ? (
          <LoadingCard />
        ) : medsQuery.isError || logsQuery.isError ? (
          <ErrorState
            onRetry={() => {
              void medsQuery.refetch();
              void logsQuery.refetch();
            }}
          />
        ) : meds.filter((m) => m.active).length === 0 ? (
          <EmptyState
            icon={<Pill className="size-5" />}
            title="No active medications"
            description="Add a medication or supplement above to start tracking doses."
          />
        ) : (
          <ul className="space-y-2">
            {meds
              .filter((m) => m.active)
              .map((m) => {
                const taken = todaysLogs.some((l) => l.medication_id === m.id);
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {m.name}
                        {m.dosage ? ` · ${m.dosage}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.med_type}
                        {m.times?.length ? ` · ${m.times.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={taken ? "default" : "outline"}
                        size="sm"
                        className={cn(taken && "gap-1.5")}
                        disabled={insertLog.isPending || delLog.isPending}
                        aria-pressed={taken}
                        onClick={() => toggleDose(m)}
                      >
                        <Check className="size-4" /> {taken ? "Taken" : "Mark taken"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete medication"
                        onClick={() => delMed.mutate(m.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </GlassCard>

      <GlassCard delay={0.1} className="space-y-3">
        <SectionTitle>All medications</SectionTitle>
        {medsQuery.isLoading ? (
          <LoadingCard rows={2} />
        ) : medsQuery.isError ? (
          <ErrorState onRetry={() => medsQuery.refetch()} />
        ) : meds.length === 0 ? (
          <EmptyState title="Nothing here yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {meds.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.med_type}
                    {m.dosage ? ` · ${m.dosage}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    aria-label={`Active: ${m.name}`}
                    disabled={updateMed.isPending}
                    checked={m.active}
                    onCheckedChange={(active) => updateMed.mutate({ id: m.id, values: { active } })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Disclaimer />
      </GlassCard>

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle>Recent dose history</SectionTitle>
        {logsQuery.isLoading ? (
          <LoadingCard rows={2} />
        ) : logsQuery.isError ? (
          <ErrorState onRetry={() => logsQuery.refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState title="No doses logged yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {logs.slice(0, 15).map((l) => {
              const med = meds.find((m) => m.id === l.medication_id);
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="text-sm">
                    {med?.name ?? "Medication"} · {l.log_date}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => delLog.mutate(l.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
