import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isWithinInterval } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Droplets, Trash2 } from "lucide-react";
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
  LoadingCard,
  ErrorState,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useProfile, useRows, today } from "@/lib/data";
import { computeCycle, PHASE_INFO, pretty } from "@/lib/cycle";

export const Route = createFileRoute("/_authenticated/cycle")({
  head: () => ({
    meta: [
      { title: "Cycle tracking — HerCare AI" },
      {
        name: "description",
        content: "Log period start and end dates, flow intensity and spotting.",
      },
      { property: "og:title", content: "Cycle tracking — HerCare AI" },
      { property: "og:description", content: "Period logs with predictions for your next cycle." },
    ],
  }),
  component: CyclePage,
});

type Cycle = {
  id: string;
  start_date: string;
  end_date: string | null;
  flow_intensity: string | null;
  spotting: boolean;
  notes: string | null;
};

function CyclePage() {
  const { data: profile } = useProfile();
  const recordsQuery = useRows<Cycle>("cycles", { orderBy: "start_date" });
  const cycles = recordsQuery.data ?? [];
  const insert = useInsertRow("cycles", "Cycle logged");
  const del = useDeleteRow("cycles");

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [flow, setFlow] = useState("medium");
  const [spotting, setSpotting] = useState(false);
  const [notes, setNotes] = useState("");

  const last = cycles[0]?.start_date ?? profile?.last_period_start ?? null;
  const snapshot = last
    ? computeCycle(parseISO(last), profile?.avg_cycle_length ?? 28, profile?.avg_period_length ?? 5)
    : null;

  return (
    <>
      <PageHeader
        title="Cycle tracking"
        description="Your recorded periods, in one place. Predictions are estimates, not guarantees."
      />

      <GlassCard className="grid gap-6 md:grid-cols-[auto_1fr]">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          modifiers={{
            recorded: (day) =>
              cycles.some((c) =>
                isWithinInterval(day, {
                  start: parseISO(c.start_date),
                  end: parseISO(
                    c.end_date && c.end_date >= c.start_date ? c.end_date : c.start_date,
                  ),
                }),
              ),
          }}
          modifiersClassNames={{
            recorded:
              "bg-secondary font-semibold rounded-lg underline decoration-primary decoration-2 underline-offset-4",
          }}
        />
        <div className="space-y-3">
          <h2 className="text-xl">
            {selectedDay ? format(selectedDay, "EEEE, d MMMM") : "Choose a day"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Underlined dates have saved period records. Today is shaded; your selection is plum.
          </p>
          {recordsQuery.isLoading ? (
            <LoadingCard rows={2} />
          ) : (
            selectedDay &&
            cycles
              .filter((c) =>
                isWithinInterval(selectedDay, {
                  start: parseISO(c.start_date),
                  end: parseISO(
                    c.end_date && c.end_date >= c.start_date ? c.end_date : c.start_date,
                  ),
                }),
              )
              .map((c) => (
                <p key={c.id} className="rounded-xl bg-secondary p-3 text-sm">
                  Recorded period / {c.flow_intensity ?? "Unspecified"} flow
                  {c.notes ? ` / ${c.notes}` : ""}
                </p>
              ))
          )}
          {!recordsQuery.isLoading &&
            !recordsQuery.isError &&
            selectedDay &&
            !cycles.some((c) =>
              isWithinInterval(selectedDay, {
                start: parseISO(c.start_date),
                end: parseISO(c.end_date && c.end_date >= c.start_date ? c.end_date : c.start_date),
              }),
            ) && <p className="text-sm">No period recorded for this day.</p>}
        </div>
      </GlassCard>
      {snapshot ? (
        <GlassCard className="grid gap-4 sm:grid-cols-3">
          <Info
            label="Current phase"
            value={PHASE_INFO[snapshot.phase].label}
            hint={`Day ${snapshot.cycleDay}`}
          />
          <Info
            label="Next period"
            value={pretty(snapshot.nextPeriod)}
            hint={`in ${snapshot.daysUntilNextPeriod} days`}
          />
          <Info label="Period ends" value={pretty(snapshot.periodEnd)} hint="Estimated" />
        </GlassCard>
      ) : null}

      {recordsQuery.isError && <ErrorState onRetry={() => void recordsQuery.refetch()} />}
      <GlassCard delay={0.05} className="space-y-4">
        <h2 className="font-medium">Log a period</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cycle-start-date">Start date</Label>
            <Input
              id="cycle-start-date"
              type="date"
              max={today()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cycle-end-date">End date (optional)</Label>
            <Input
              id="cycle-end-date"
              type="date"
              max={today()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cycle-flow">Flow intensity</Label>
            <Select value={flow} onValueChange={setFlow}>
              <SelectTrigger id="cycle-flow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["light", "medium", "heavy"].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
            <Label htmlFor="cycle-spotting">Spotting</Label>
            <Switch id="cycle-spotting" checked={spotting} onCheckedChange={setSpotting} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cycle-notes">Notes</Label>
          <Textarea
            id="cycle-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <Button
          onClick={() =>
            insert.mutate({
              start_date: startDate,
              end_date: endDate || null,
              flow_intensity: flow,
              spotting,
              notes: notes || null,
            })
          }
          disabled={
            insert.isPending ||
            !startDate ||
            startDate > today() ||
            Boolean(endDate && (endDate < startDate || endDate > today()))
          }
        >
          <Droplets className="size-4" /> {insert.isPending ? "Saving..." : "Save cycle"}
        </Button>
        {endDate && endDate < startDate && (
          <p role="alert" className="text-sm text-destructive">
            End date must be on or after the start date.
          </p>
        )}
        {insert.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not save. Please try again; your entries are preserved.
          </p>
        )}
        {insert.isSuccess && (
          <p role="status" className="text-sm text-primary">
            Saved to your calendar and history.
          </p>
        )}
      </GlassCard>

      <GlassCard delay={0.1} className="space-y-3">
        <h2 className="font-medium">History</h2>
        {recordsQuery.isLoading ? (
          <LoadingCard />
        ) : recordsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            History is unavailable. Retry above to load your records.
          </p>
        ) : cycles.length === 0 ? (
          <EmptyState
            icon={<Droplets className="size-5" />}
            title="No cycles logged yet"
            description="Add your most recent period start date to begin predictions."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {cycles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.start_date}
                    {c.end_date ? ` → ${c.end_date}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.flow_intensity ?? "—"} flow{c.spotting ? " · spotting" : ""}
                    {c.notes ? ` · ${c.notes}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={del.isPending}
                  aria-label="Delete entry"
                  onClick={() => del.mutate(c.id)}
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

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
