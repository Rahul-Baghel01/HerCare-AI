import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { validNumber } from "@/lib/validation";
import { CareBanner, SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dumbbell, GlassWater, Minus, Moon, Plus, Salad, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GlassCard,
  PageHeader,
  EmptyState,
  SectionTitle,
  Disclaimer,
  LoadingCard,
  ErrorState,
} from "@/components/hercare/kit";
import { useDeleteRow, useInsertRow, useRows, useUpsertDaily, today } from "@/lib/data";
import { average, round } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/wellness")({
  head: () => ({
    meta: [
      { title: "Daily wellness — HerCare AI" },
      {
        name: "description",
        content:
          "Log hydration, sleep, nutrition and exercise in one place to spot wellness patterns.",
      },
      { property: "og:title", content: "Daily wellness — HerCare AI" },
      { property: "og:description", content: "Water, sleep, nutrition and movement tracking." },
    ],
  }),
  component: WellnessPage,
});

type WaterLog = { id: string; log_date: string; glasses: number; goal_glasses: number };
type SleepLog = { id: string; log_date: string; hours: number; quality: number | null };
type NutritionLog = {
  id: string;
  log_date: string;
  meal: string;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  iron_mg: number | null;
};
type ExerciseLog = {
  id: string;
  log_date: string;
  activity: string;
  minutes: number;
  intensity: string | null;
};

const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const INTENSITY = ["light", "moderate", "vigorous"];

function WellnessPage() {
  const waterQuery = useRows<WaterLog>("water_logs", { orderBy: "log_date", limit: 60 });
  const sleepQuery = useRows<SleepLog>("sleep_logs", { orderBy: "log_date", limit: 60 });
  const nutritionQuery = useRows<NutritionLog>("nutrition_logs", {
    orderBy: "log_date",
    limit: 80,
  });
  const exerciseQuery = useRows<ExerciseLog>("exercise_logs", {
    orderBy: "log_date",
    limit: 60,
  });

  const water = waterQuery.data ?? [];
  const sleep = sleepQuery.data ?? [];
  const nutrition = nutritionQuery.data ?? [];
  const exercise = exerciseQuery.data ?? [];
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const upsertWater = useUpsertDaily("water_logs", "Hydration updated");
  const upsertSleep = useUpsertDaily("sleep_logs", "Sleep saved");
  const insertNutrition = useInsertRow("nutrition_logs", "Meal logged");
  const insertExercise = useInsertRow("exercise_logs", "Workout logged");
  const delNutrition = useDeleteRow("nutrition_logs");
  const delExercise = useDeleteRow("exercise_logs");

  const todayWater = water.find((w) => w.log_date === today());
  const glasses = todayWater?.glasses ?? 0;
  const goal = todayWater?.goal_glasses ?? 8;

  const [sleepHours, setSleepHours] = useState("7.5");
  const [sleepQuality, setSleepQuality] = useState(3);

  const [meal, setMeal] = useState("breakfast");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [iron, setIron] = useState("");

  const [activity, setActivity] = useState("Walking");
  const [minutes, setMinutes] = useState("30");
  const [intensity, setIntensity] = useState("moderate");

  const avgSleep = round(
    average(sleep.filter((s) => withinDays(s.log_date, 7)).map((s) => s.hours)),
  );
  const weekMinutes = exercise
    .filter((e) => withinDays(e.log_date, 7))
    .reduce((sum, e) => sum + (e.minutes ?? 0), 0);
  const todayCalories = nutrition
    .filter((n) => n.log_date === today())
    .reduce((sum, n) => sum + (n.calories ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Daily wellness"
        description="Hydration, sleep, nutrition and movement in one place."
      />

      <CareBanner icon={GlassWater} title="Small habits, recorded simply">
        All entries on this page are saved for today. Choose a tab to focus on one part of your day.
      </CareBanner>
      <Tabs defaultValue="hydration">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="hydration">Hydration</TabsTrigger>
          <TabsTrigger value="sleep">Sleep</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="exercise">Exercise</TabsTrigger>
        </TabsList>

        <TabsContent value="hydration" className="mt-4 space-y-4">
          <GlassCard className="space-y-4">
            <SectionTitle hint={`${glasses}/${goal} glasses`}>Today's water</SectionTitle>
            <Progress value={Math.min(100, (glasses / Math.max(1, goal)) * 100)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Remove a glass"
                disabled={
                  upsertWater.isPending ||
                  waterQuery.isLoading ||
                  waterQuery.isError ||
                  glasses === 0
                }
                onClick={() =>
                  upsertWater.mutate({
                    logDate: today(),
                    values: { glasses: Math.max(0, glasses - 1), goal_glasses: goal },
                  })
                }
              >
                <Minus className="size-4" />
              </Button>
              <Button
                disabled={upsertWater.isPending || waterQuery.isLoading || waterQuery.isError}
                onClick={() =>
                  upsertWater.mutate({
                    logDate: today(),
                    values: { glasses: glasses + 1, goal_glasses: goal },
                  })
                }
              >
                <GlassWater className="size-4" /> Add a glass
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="water-goal" className="text-xs text-muted-foreground">
                  Goal
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  className="w-20"
                  id="water-goal"
                  value={goalDraft ?? goal}
                  onChange={(e) => setGoalDraft(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={
                    upsertWater.isPending ||
                    waterQuery.isLoading ||
                    waterQuery.isError ||
                    goalDraft === null
                  }
                  onClick={() => {
                    if (!validNumber(goalDraft ?? "", 1, 30, false, true))
                      return void toast.error("Choose a goal of 1-30 whole glasses.");
                    upsertWater.mutate(
                      { logDate: today(), values: { glasses, goal_glasses: Number(goalDraft) } },
                      { onSuccess: () => setGoalDraft(null) },
                    );
                  }}
                >
                  Save goal
                </Button>
              </div>
            </div>
            <SaveStatus pending={upsertWater.isPending} error={upsertWater.isError} />
            <p className="text-xs text-muted-foreground">
              Set a personal goal that fits your needs. Your count updates after it is saved.
            </p>
          </GlassCard>

          <GlassCard delay={0.05} className="space-y-3">
            <SectionTitle>Recent days</SectionTitle>
            {waterQuery.isLoading ? (
              <LoadingCard rows={2} />
            ) : waterQuery.isError ? (
              <ErrorState onRetry={() => waterQuery.refetch()} />
            ) : water.length === 0 ? (
              <EmptyState icon={<GlassWater className="size-5" />} title="No hydration logs yet" />
            ) : (
              <ul className="divide-y divide-border/60">
                {water.slice(0, 10).map((w) => (
                  <li key={w.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{w.log_date}</span>
                    <span className="text-muted-foreground">
                      {w.glasses}/{w.goal_glasses} glasses
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="sleep" className="mt-4 space-y-4">
          <GlassCard className="space-y-4">
            <SectionTitle hint={avgSleep !== null ? `${avgSleep}h average over 7 days` : undefined}>
              Log sleep
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-1">Hours slept</Label>
                <Input
                  id="wellness-field-1"
                  type="number"
                  min={0}
                  max={24}
                  step="0.25"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quality · {sleepQuality}/5</Label>
                <Slider
                  aria-label="Sleep quality"
                  min={1}
                  max={5}
                  step={1}
                  value={[sleepQuality]}
                  onValueChange={(v) => setSleepQuality(v[0] ?? 3)}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                if (!validNumber(sleepHours, 0, 24, false))
                  return void toast.error("Enter hours slept between 0 and 24.");
                upsertSleep.mutate({
                  logDate: today(),
                  values: {
                    hours: Number(sleepHours),
                    quality: sleepQuality,
                  },
                });
              }}
              disabled={upsertSleep.isPending}
            >
              <Moon className="size-4" /> Save sleep
            </Button>
            <SaveStatus pending={upsertSleep.isPending} error={upsertSleep.isError} />
          </GlassCard>

          <GlassCard delay={0.05} className="space-y-3">
            <SectionTitle>Sleep history</SectionTitle>
            {sleepQuery.isLoading ? (
              <LoadingCard rows={2} />
            ) : sleepQuery.isError ? (
              <ErrorState onRetry={() => sleepQuery.refetch()} />
            ) : sleep.length === 0 ? (
              <EmptyState icon={<Moon className="size-5" />} title="No sleep logs yet" />
            ) : (
              <ul className="divide-y divide-border/60">
                {sleep.slice(0, 10).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{s.log_date}</span>
                    <span className="text-muted-foreground">
                      {s.hours}h{s.quality ? ` · quality ${s.quality}/5` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4 space-y-4">
          <GlassCard className="space-y-4">
            <SectionTitle hint={todayCalories ? `${todayCalories} kcal today` : undefined}>
              Log a meal
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-2">Meal</Label>
                <Select value={meal} onValueChange={setMeal}>
                  <SelectTrigger id="wellness-field-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEALS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-3">Calories</Label>
                <Input
                  id="wellness-field-3"
                  type="number"
                  min={0}
                  max={10000}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-4">Protein (g)</Label>
                <Input
                  id="wellness-field-4"
                  type="number"
                  min={0}
                  max={500}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-5">Iron (mg)</Label>
                <Input
                  id="wellness-field-5"
                  type="number"
                  min={0}
                  max={200}
                  value={iron}
                  onChange={(e) => setIron(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wellness-field-6">What did you eat?</Label>
              <Textarea
                id="wellness-field-6"
                rows={2}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!description.trim() && !calories && !protein && !iron)
                  return void toast.error("Add a meal description or nutrient measurement.");
                if (
                  !validNumber(calories, 0, 10000) ||
                  !validNumber(protein, 0, 500) ||
                  !validNumber(iron, 0, 200)
                )
                  return void toast.error(
                    "Check calories (0-10000), protein (0-500 g) and iron (0-200 mg).",
                  );
                insertNutrition.mutate(
                  {
                    log_date: today(),
                    meal,
                    description: description.trim() || null,
                    calories: calories ? Number(calories) : null,
                    protein_g: protein ? Number(protein) : null,
                    iron_mg: iron ? Number(iron) : null,
                  },
                  {
                    onSuccess: () => {
                      setDescription("");
                      setCalories("");
                      setProtein("");
                      setIron("");
                    },
                  },
                );
              }}
              disabled={insertNutrition.isPending}
            >
              <Salad className="size-4" /> Save meal
            </Button>
            <SaveStatus pending={insertNutrition.isPending} error={insertNutrition.isError} />
          </GlassCard>

          <GlassCard delay={0.05} className="space-y-3">
            <SectionTitle>Recent meals</SectionTitle>
            {nutritionQuery.isLoading ? (
              <LoadingCard rows={2} />
            ) : nutritionQuery.isError ? (
              <ErrorState onRetry={() => nutritionQuery.refetch()} />
            ) : nutrition.length === 0 ? (
              <EmptyState icon={<Salad className="size-5" />} title="No meals logged yet" />
            ) : (
              <ul className="divide-y divide-border/60">
                {nutrition.slice(0, 15).map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {n.log_date} · {n.meal}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          n.calories ? `${n.calories} kcal` : null,
                          n.protein_g ? `${n.protein_g}g protein` : null,
                          n.iron_mg ? `${n.iron_mg}mg iron` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      {n.description ? <p className="mt-1 text-sm">{n.description}</p> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => delNutrition.mutate(n.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Disclaimer />
          </GlassCard>
        </TabsContent>

        <TabsContent value="exercise" className="mt-4 space-y-4">
          <GlassCard className="space-y-4">
            <SectionTitle hint={`${weekMinutes} min over 7 days`}>Log movement</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-7">Activity</Label>
                <Input
                  id="wellness-field-7"
                  value={activity}
                  maxLength={100}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-8">Minutes</Label>
                <Input
                  id="wellness-field-8"
                  type="number"
                  min={1}
                  max={600}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wellness-field-9">Intensity</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger id="wellness-field-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITY.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!activity.trim() || !validNumber(minutes, 1, 600, false, true))
                  return void toast.error("Enter an activity and 1-600 whole minutes.");
                insertExercise.mutate({
                  log_date: today(),
                  activity: activity.trim().slice(0, 100),
                  minutes: Number(minutes),
                  intensity,
                });
              }}
              disabled={insertExercise.isPending}
            >
              <Dumbbell className="size-4" /> Save workout
            </Button>
            <SaveStatus pending={insertExercise.isPending} error={insertExercise.isError} />
          </GlassCard>

          <GlassCard delay={0.05} className="space-y-3">
            <SectionTitle>Recent workouts</SectionTitle>
            {exerciseQuery.isLoading ? (
              <LoadingCard rows={2} />
            ) : exerciseQuery.isError ? (
              <ErrorState onRetry={() => exerciseQuery.refetch()} />
            ) : exercise.length === 0 ? (
              <EmptyState icon={<Dumbbell className="size-5" />} title="No workouts logged yet" />
            ) : (
              <ul className="divide-y divide-border/60">
                {exercise.slice(0, 15).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{e.activity}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.log_date} · {e.minutes} min{e.intensity ? ` · ${e.intensity}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => delExercise.mutate(e.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>

      <GlassCard delay={0.1} className="flex items-center gap-3">
        <Plus className="size-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          These logs are your personal record. Analytics includes sleep and hydration. The assistant
          currently uses your profile, cycle, mood and symptom history.
        </p>
      </GlassCard>
    </>
  );
}

function withinDays(date: string, days: number) {
  const cutoff = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  return date >= cutoff && date <= today();
}
