import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { today, useUser } from "@/lib/data";
import { GlassCard } from "./kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function DailyCheckIn() {
  const { data: user } = useUser();
  const cache = useQueryClient();
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState(3);
  const attempt = useRef<{ moodId: string; symptomId: string; date: string } | null>(null);
  const [partial, setPartial] = useState(false);
  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in again to save your check-in.");
      if (!mood) throw new Error("Choose a mood first.");
      attempt.current ??= {
        moodId: crypto.randomUUID(),
        symptomId: crypto.randomUUID(),
        date: today(),
      };
      const { moodId, symptomId, date } = attempt.current;
      const result = await supabase.from("moods").upsert({
        id: moodId,
        user_id: user.id,
        log_date: date,
        mood,
        energy_level: energy,
        journal: note || null,
      });
      if (result.error)
        throw new Error(
          "Your check-in could not be saved. Your choices are still here; try again.",
        );
      setPartial(true);
      if (symptom) {
        const result = await supabase.from("symptoms").upsert({
          id: symptomId,
          user_id: user.id,
          log_date: date,
          name: symptom,
          category:
            symptom === "Fatigue" ? "Energy" : symptom === "Bloating" ? "Digestive" : "Pain",
          severity,
          notes: note || null,
        });
        if (result.error)
          throw new Error(
            "Mood and energy saved. The symptom did not save. Retry to finish without duplicating your entries.",
          );
      }
    },
    onSuccess: () => {
      toast.success("Check-in saved");
    },
    onSettled: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["moods"] }),
        cache.invalidateQueries({ queryKey: ["symptoms"] }),
      ]);
    },
  });
  return (
    <GlassCard id="daily-check-in" className="space-y-5 border-primary/15">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            DAILY CHECK-IN
          </p>
          <h2 className="mt-2 text-2xl">How are you, really?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A few small details. A little more understanding.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
          30 seconds
        </span>
      </div>
      {save.isSuccess ? (
        <div role="status" className="space-y-3 rounded-2xl bg-secondary p-4">
          <p className="flex items-center gap-2 font-medium">
            <Check className="size-5" /> Saved to your history
          </p>
          <p className="text-sm">
            {mood} mood / Energy {energy}/5{symptom ? ` / ${symptom} ${severity}/5` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/mood">
                View mood history <ArrowRight />
              </Link>
            </Button>
            {symptom && (
              <Button asChild variant="outline">
                <Link to="/symptoms">View symptom history</Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/analytics">Explore your trends</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}
          className="space-y-5"
        >
          <fieldset disabled={save.isPending || partial} className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">How are you feeling?</p>
              <div className="flex flex-wrap gap-2">
                {["Great", "Good", "Okay", "Low", "Anxious", "Irritable"].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={mood === value ? "default" : "outline"}
                    aria-pressed={mood === value}
                    onClick={() => {
                      setMood(value);
                      save.reset();
                    }}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <Label id="check-energy">Energy: {energy}/5</Label>
                <Slider
                  disabled={save.isPending || partial}
                  aria-labelledby="check-energy"
                  min={1}
                  max={5}
                  step={1}
                  value={[energy]}
                  onValueChange={(v) => setEnergy(v[0] ?? 3)}
                />
                <p className="text-xs text-muted-foreground">1: Very low to 5: Very high</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="check-symptom">Symptom (optional)</Label>
                <select
                  id="check-symptom"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                >
                  <option value="">Skip symptom</option>
                  {["Cramps", "Headache", "Bloating", "Fatigue"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {symptom && (
              <div className="space-y-3">
                <Label id="check-severity">
                  {symptom} severity: {severity}/5
                </Label>
                <Slider
                  disabled={save.isPending || partial}
                  aria-labelledby="check-severity"
                  min={1}
                  max={5}
                  step={1}
                  value={[severity]}
                  onValueChange={(v) => setSeverity(v[0] ?? 3)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="check-note">A note to remember (optional)</Label>
              <input
                id="check-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="A little context for your day"
                className="h-11 w-full rounded-xl border border-input bg-background px-3"
              />
            </div>
          </fieldset>
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message}
            </p>
          )}
          <Button type="submit" disabled={!mood || save.isPending}>
            {save.isPending
              ? "Saving check-in..."
              : save.isError
                ? "Retry check-in"
                : "Save check-in"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Saved privately to your mood and symptom history.
          </p>
        </form>
      )}
    </GlassCard>
  );
}
