import { toast } from "sonner";
import { validLogDate, validNumber } from "@/lib/validation";
import { CareBanner, SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Baby, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import {
  useDeleteRow,
  useInsertRow,
  useProfile,
  useRows,
  useUpdateProfile,
  today,
} from "@/lib/data";
import { BABY_TIMELINE, pregnancyProgress } from "@/lib/stats";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pregnancy")({
  head: () => ({
    meta: [
      { title: "Pregnancy mode — HerCare AI" },
      {
        name: "description",
        content:
          "Track pregnancy week by week with baby development, weight, kicks and appointments.",
      },
      { property: "og:title", content: "Pregnancy mode — HerCare AI" },
      {
        property: "og:description",
        content: "Trimester progress and a week-by-week baby timeline.",
      },
    ],
  }),
  component: PregnancyPage,
});

type PregnancyLog = {
  id: string;
  log_date: string;
  week: number | null;
  weight_kg: number | null;
  kick_count: number | null;
  notes: string | null;
};

type Appointment = { id: string; title: string; doctor: string | null; scheduled_at: string };

function PregnancyPage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const logsQuery = useRows<PregnancyLog>("pregnancy_logs", { orderBy: "log_date" });
  const appointmentsQuery = useRows<Appointment>("appointments", {
    orderBy: "scheduled_at",
    ascending: true,
  });
  const insert = useInsertRow("pregnancy_logs", "Pregnancy entry saved");
  const del = useDeleteRow("pregnancy_logs");

  const [dueDateDraft, setDueDate] = useState<string | null>(null);
  const dueDate = dueDateDraft ?? profile?.pregnancy_due_date ?? "";
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("");
  const [kicks, setKicks] = useState("");
  const [notes, setNotes] = useState("");

  const logs = logsQuery.data ?? [];
  const due = profile?.pregnancy_due_date ?? null;
  const progress = due ? pregnancyProgress(due) : null;
  const upcoming = (appointmentsQuery.data ?? [])
    .filter((a) => new Date(a.scheduled_at) >= new Date())
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title="Pregnancy mode"
        description="Week-by-week progress and baby development."
      />

      <CareBanner icon={Baby} title="One week at a time">
        Your timeline is calculated from your saved due date. Milestones are general educational
        information, not an assessment of your pregnancy.
      </CareBanner>
      <GlassCard className="space-y-4">
        <SectionTitle hint="Used for all pregnancy calculations">Due date</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pregnancy-field-1">Estimated due date</Label>
            <Input
              id="pregnancy-field-1"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button
            onClick={() =>
              updateProfile.mutate({
                pregnancy_due_date: dueDate || null,
                mode: dueDate ? "pregnancy" : (profile?.mode ?? "cycle"),
              })
            }
            disabled={updateProfile.isPending}
          >
            Save due date
          </Button>
        </div>
      </GlassCard>

      {progress ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Gestational age"
              value={`Week ${progress.week}`}
              hint={`${progress.day} day${progress.day === 1 ? "" : "s"}`}
              icon={<Baby className="size-5" />}
              tone="rose"
            />
            <StatCard
              label="Trimester"
              value={progress.trimester.name}
              hint={`Weeks ${progress.trimester.from}–${progress.trimester.to}`}
              tone="lavender"
              delay={0.05}
            />
            <StatCard
              label="Days to due date"
              value={progress.daysToDue >= 0 ? progress.daysToDue : "Overdue"}
              hint={format(parseISO(due!), "d MMM yyyy")}
              tone="teal"
              delay={0.1}
            />
            <StatCard
              label="Baby size"
              value={progress.milestone.title}
              hint={`Week ${progress.milestone.week} milestone`}
              tone="honey"
              delay={0.15}
            />
          </div>

          <GlassCard delay={0.05} className="space-y-3">
            <SectionTitle hint={`${progress.percent}% complete`}>Pregnancy progress</SectionTitle>
            <Progress value={Math.min(100, progress.percent)} />
            <p className="text-sm text-muted-foreground">{progress.milestone.detail}</p>
          </GlassCard>

          <GlassCard delay={0.08} className="space-y-3">
            <SectionTitle>Baby development timeline</SectionTitle>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BABY_TIMELINE.map((m) => {
                const done = progress.week >= m.week;
                const current = m.week === progress.milestone.week;
                return (
                  <li
                    key={m.week}
                    className={cn(
                      "rounded-2xl border p-3",
                      current ? "border-primary bg-primary/5" : "border-border/60",
                      !done && "opacity-70",
                    )}
                  >
                    <p className="text-sm font-medium">
                      Week {m.week} · {m.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.detail}</p>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </>
      ) : (
        <EmptyState
          icon={<Baby className="size-5" />}
          title="Add your due date to unlock pregnancy mode"
          description="We'll calculate your week, trimester progress and baby development timeline."
        />
      )}

      <GlassCard delay={0.1} className="space-y-4">
        <SectionTitle>Log today</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pregnancy-field-2">Date</Label>
            <Input
              id="pregnancy-field-2"
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pregnancy-field-3">Weight (kg)</Label>
            <Input
              id="pregnancy-field-3"
              type="number"
              min={20}
              max={400}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pregnancy-field-4">Kick count</Label>
            <Input
              id="pregnancy-field-4"
              type="number"
              min={0}
              max={500}
              value={kicks}
              onChange={(e) => setKicks(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pregnancy-field-5">Notes</Label>
          <Textarea
            id="pregnancy-field-5"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            if (!validLogDate(date, today()))
              return void toast.error("Choose a valid date up to today.");
            if (!validNumber(weight, 20, 400) || !validNumber(kicks, 0, 500, true, true))
              return void toast.error(
                "Check weight (20-400 kg) and kick count (0-500 whole numbers), or leave them blank.",
              );
            if (!weight && !kicks && !notes.trim())
              return void toast.error("Add a measurement or note before saving.");
            insert.mutate(
              {
                log_date: date,
                week: due ? pregnancyProgress(due, parseISO(date)).week : null,
                weight_kg: weight ? Number(weight) : null,
                kick_count: kicks ? Number(kicks) : null,
                notes: notes || null,
              },
              { onSuccess: () => setNotes("") },
            );
          }}
          disabled={insert.isPending}
        >
          <Baby className="size-4" /> Save entry
        </Button>
        <SaveStatus pending={insert.isPending} error={insert.isError} />
      </GlassCard>

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle hint={upcoming.length ? undefined : "None scheduled"}>
          Upcoming appointments
        </SectionTitle>
        {appointmentsQuery.isLoading ? (
          <LoadingCard rows={2} />
        ) : appointmentsQuery.isError ? (
          <ErrorState onRetry={() => appointmentsQuery.refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No appointments booked"
            description="Keep scans and check-ups together in your appointment calendar."
            action={
              <Button asChild variant="outline">
                <Link to="/appointments">Add appointment</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {upcoming.map((a) => (
              <li key={a.id} className="py-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(a.scheduled_at), "EEE d MMM, HH:mm")}
                  {a.doctor ? ` · ${a.doctor}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard delay={0.18} className="space-y-3">
        <SectionTitle>Entries</SectionTitle>
        {logsQuery.isLoading ? (
          <LoadingCard />
        ) : logsQuery.isError ? (
          <ErrorState onRetry={() => logsQuery.refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState icon={<Baby className="size-5" />} title="No pregnancy entries yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {logs.slice(0, 20).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {l.log_date}
                    {l.week ? ` · week ${l.week}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.weight_kg ? `${l.weight_kg} kg · ` : ""}
                    {l.kick_count !== null ? `${l.kick_count} kicks` : "—"}
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
        <Disclaimer />
      </GlassCard>
    </>
  );
}
