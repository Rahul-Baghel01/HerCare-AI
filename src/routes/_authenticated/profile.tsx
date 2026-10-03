import { validLogDate } from "@/lib/validation";
import { SaveStatus } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Save, Scale, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  LoadingCard,
  ErrorState,
  SectionTitle,
  Disclaimer,
} from "@/components/hercare/kit";
import {
  useAvatarUpload,
  useAvatarUrl,
  useInsertRow,
  useProfile,
  useUpdateProfile,
  useUser,
  today,
} from "@/lib/data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — HerCare AI" },
      {
        name: "description",
        content:
          "Manage personal details, medical information, emergency contact and cycle preferences.",
      },
      { property: "og:title", content: "Your profile — HerCare AI" },
      { property: "og:description", content: "Keep your health profile accurate and up to date." },
    ],
  }),
  component: ProfilePage,
});

const MODES = ["cycle", "pregnancy", "postpartum", "menopause"] as const;

type FormState = {
  display_name: string;
  date_of_birth: string;
  height_cm: string;
  weight_kg: string;
  units: string;
  mode: string;
  avg_cycle_length: string;
  avg_period_length: string;
  last_period_start: string;
  pregnancy_due_date: string;
  has_pcos: boolean;
  medical_conditions: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

function ProfilePage() {
  const { data: user } = useUser();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useAvatarUpload();
  const insertWeight = useInsertRow("weight_history", "Weight logged");
  const fileRef = useRef<HTMLInputElement>(null);

  const profile = profileQuery.data;
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url);

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (!profile || form) return;
    setForm({
      display_name: profile.display_name ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      height_cm: profile.height_cm ? String(profile.height_cm) : "",
      weight_kg: profile.weight_kg ? String(profile.weight_kg) : "",
      units: profile.units ?? "metric",
      mode: profile.mode ?? "cycle",
      avg_cycle_length: String(profile.avg_cycle_length ?? 28),
      avg_period_length: String(profile.avg_period_length ?? 5),
      last_period_start: profile.last_period_start ?? "",
      pregnancy_due_date: profile.pregnancy_due_date ?? "",
      has_pcos: profile.has_pcos ?? false,
      medical_conditions: profile.medical_conditions ?? "",
      allergies: profile.allergies ?? "",
      emergency_contact_name: profile.emergency_contact_name ?? "",
      emergency_contact_phone: profile.emergency_contact_phone ?? "",
    });
  }, [profile, form]);

  if (profileQuery.isError || (!profileQuery.isLoading && !profile)) {
    return (
      <>
        <PageHeader title="Your profile" />
        <ErrorState onRetry={() => profileQuery.refetch()} />
      </>
    );
  }
  if (profileQuery.isLoading || !form) {
    return (
      <>
        <PageHeader title="Your profile" description="Loading your details..." />
        <LoadingCard rows={5} />
      </>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  function numberOrNull(value: string, min: number, max: number) {
    if (!value.trim()) return null;
    const n = Number(value);
    if (Number.isNaN(n) || n < min || n > max) return undefined;
    return n;
  }

  function save() {
    const name = form!.display_name.trim();
    if (name.length > 120) {
      toast.error("Name is too long.");
      return;
    }
    const height = numberOrNull(form!.height_cm, 80, 250);
    const weight = numberOrNull(form!.weight_kg, 25, 400);
    const cycleLength = Number(form!.avg_cycle_length);
    const periodLength = Number(form!.avg_period_length);
    if (height === undefined) {
      toast.error("Enter a height between 80 and 250 cm.");
      return;
    }
    if (weight === undefined) {
      toast.error("Enter a weight between 25 and 400 kg.");
      return;
    }
    if (!(Number.isInteger(cycleLength) && cycleLength >= 15 && cycleLength <= 60)) {
      toast.error("Cycle length should be between 15 and 60 days.");
      return;
    }
    if (!(Number.isInteger(periodLength) && periodLength >= 1 && periodLength <= 14)) {
      toast.error("Period length should be between 1 and 14 days.");
      return;
    }
    if (form!.emergency_contact_phone && form!.emergency_contact_phone.trim().length > 32) {
      toast.error("Phone number is too long.");
      return;
    }

    if (
      (form!.date_of_birth && !validLogDate(form!.date_of_birth, today())) ||
      (form!.last_period_start && !validLogDate(form!.last_period_start, today()))
    )
      return void toast.error("Birth date and last period must be valid dates up to today.");
    updateProfile.mutate({
      display_name: name || null,
      date_of_birth: form!.date_of_birth || null,
      height_cm: height,
      weight_kg: weight,
      units: form!.units,
      mode: form!.mode,
      avg_cycle_length: cycleLength,
      avg_period_length: periodLength,
      last_period_start: form!.last_period_start || null,
      pregnancy_due_date: form!.pregnancy_due_date || null,
      has_pcos: form!.has_pcos,
      medical_conditions: form!.medical_conditions.trim().slice(0, 2000) || null,
      allergies: form!.allergies.trim().slice(0, 1000) || null,
      emergency_contact_name: form!.emergency_contact_name.trim().slice(0, 160) || null,
      emergency_contact_phone: form!.emergency_contact_phone.trim().slice(0, 32) || null,
      onboarded: true,
    });
  }

  const initials =
    (form.display_name || user?.email || "H")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "H";

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Personal, medical and cycle details used to personalise your insights."
        action={
          <Button onClick={save} disabled={updateProfile.isPending}>
            <Save className="size-4" /> Save changes
          </Button>
        }
      />

      <GlassCard className="flex flex-wrap items-center gap-5">
        <Avatar className="size-20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="Your avatar" /> : null}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{form.display_name || "Add your name"}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) avatarUpload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={avatarUpload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-4" /> {avatarUpload.isPending ? "Uploading…" : "Change photo"}
          </Button>
        </div>
      </GlassCard>

      <GlassCard delay={0.06} className="space-y-4">
        <SectionTitle>Personal information</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-1">Display name</Label>
            <Input
              id="profile-field-1"
              value={form.display_name}
              maxLength={120}
              onChange={(e) => set("display_name", e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-2">Date of birth</Label>
            <Input
              id="profile-field-2"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-3">Height (cm)</Label>
            <Input
              id="profile-field-3"
              type="number"
              value={form.height_cm}
              onChange={(e) => set("height_cm", e.target.value)}
              placeholder="165"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-4">Weight (kg)</Label>
            <div className="flex gap-2">
              <Input
                id="profile-field-4"
                type="number"
                value={form.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
                placeholder="62"
              />
              <Button
                variant="outline"
                aria-label="Log weight"
                disabled={insertWeight.isPending}
                onClick={() => {
                  const n = Number(form.weight_kg);
                  if (!(n >= 25 && n <= 400)) {
                    toast.error("Enter a valid weight first.");
                    return;
                  }
                  insertWeight.mutate({ log_date: today(), weight_kg: n });
                }}
              >
                <Scale className="size-4" /> Log
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-5">Preferred units</Label>
            <Select value={form.units} onValueChange={(v) => set("units", v)}>
              <SelectTrigger id="profile-field-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                <SelectItem value="imperial">Imperial (lb, in)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Preference saved for your profile. Current tracking forms use the metric units shown
              on each field.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.1} className="space-y-4">
        <SectionTitle>Cycle preferences</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-6">Tracking mode</Label>
            <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
              <SelectTrigger id="profile-field-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-7">Average cycle length (days)</Label>
            <Input
              id="profile-field-7"
              type="number"
              value={form.avg_cycle_length}
              onChange={(e) => set("avg_cycle_length", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-8">Average period length (days)</Label>
            <Input
              id="profile-field-8"
              type="number"
              value={form.avg_period_length}
              onChange={(e) => set("avg_period_length", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-9">Last period start</Label>
            <Input
              id="profile-field-9"
              type="date"
              value={form.last_period_start}
              onChange={(e) => set("last_period_start", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-10">Pregnancy due date</Label>
            <Input
              id="profile-field-10"
              type="date"
              value={form.pregnancy_due_date}
              onChange={(e) => set("pregnancy_due_date", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">PCOS</p>
              <p className="text-xs text-muted-foreground">Show PCOS-specific guidance</p>
            </div>
            <Switch
              aria-label="PCOS"
              checked={form.has_pcos}
              onCheckedChange={(v) => set("has_pcos", v)}
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.14} className="space-y-4">
        <SectionTitle>Medical information</SectionTitle>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-11">Conditions & diagnoses</Label>
            <Textarea
              id="profile-field-11"
              rows={3}
              maxLength={2000}
              value={form.medical_conditions}
              onChange={(e) => set("medical_conditions", e.target.value)}
              placeholder="PCOS, endometriosis, thyroid, anaemia…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-12">Allergies</Label>
            <Textarea
              id="profile-field-12"
              rows={2}
              maxLength={1000}
              value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="Penicillin, latex, nuts…"
            />
          </div>
        </div>
        <Disclaimer />
      </GlassCard>

      <GlassCard delay={0.18} className="space-y-4">
        <SectionTitle>Emergency contact</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-13">Contact name</Label>
            <Input
              id="profile-field-13"
              value={form.emergency_contact_name}
              maxLength={160}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-field-14">Contact phone</Label>
            <Input
              id="profile-field-14"
              value={form.emergency_contact_phone}
              maxLength={32}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
              placeholder="+1 555 0100"
            />
          </div>
        </div>
        <Button onClick={save} disabled={updateProfile.isPending}>
          <User className="size-4" /> Save profile
        </Button>
        <SaveStatus pending={updateProfile.isPending} error={updateProfile.isError} />
      </GlassCard>
    </>
  );
}
