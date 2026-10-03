import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, LogOut, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  GlassCard,
  PageHeader,
  LoadingCard,
  ErrorState,
  SectionTitle,
  Disclaimer,
} from "@/components/hercare/kit";
import { useTheme } from "@/components/theme-provider";
import { exportAllData, useProfile, useUpdateProfile, useUser } from "@/lib/data";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HerCare AI" },
      {
        name: "description",
        content: "Manage notifications, privacy, appearance, data export and your account.",
      },
      { property: "og:title", content: "Settings — HerCare AI" },
      { property: "og:description", content: "Control your HerCare AI experience and your data." },
    ],
  }),
  component: SettingsPage,
});

const NOTIFICATIONS: { key: string; label: string; hint: string }[] = [
  { key: "notify_period", label: "Period predictions", hint: "Heads-up before your next period." },
  { key: "notify_ovulation", label: "Fertile window", hint: "Alerts around predicted ovulation." },
  { key: "notify_medication", label: "Medication doses", hint: "Daily dose reminders." },
  { key: "notify_water", label: "Hydration nudges", hint: "Gentle reminders to drink water." },
  { key: "notify_appointment", label: "Appointments", hint: "Reminders a day before a visit." },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: user } = useUser();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const profile = profileQuery.data;

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return void toast.error(error.message);
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  async function exportData() {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportAllData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hercare-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  }

  if (profileQuery.isLoading) {
    return (
      <>
        <PageHeader title="Settings" description="Loading your preferences…" />
        <LoadingCard rows={4} />
      </>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <>
        <PageHeader title="Settings" />
        <ErrorState onRetry={() => profileQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Notifications, privacy, appearance and your data."
      />

      <GlassCard className="space-y-3">
        <SectionTitle>Notification preferences</SectionTitle>
        <p className="text-sm text-muted-foreground">
          These preferences are saved to your account. Appointment notifications are created when
          you add a visit; automatic period, hydration and dose scheduling is not configured.
        </p>
        <ul className="divide-y divide-border/60">
          {NOTIFICATIONS.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <Switch
                aria-label={item.label}
                checked={Boolean((profile as Record<string, unknown> | null)?.[item.key])}
                disabled={updateProfile.isPending}
                onCheckedChange={(value) => updateProfile.mutate({ [item.key]: value })}
              />
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard delay={0.06} className="space-y-3">
        <SectionTitle>Privacy</SectionTitle>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Research sharing preference</p>
            <p className="text-xs text-muted-foreground">
              Preference only. No research data transfer is configured in this application.
            </p>
          </div>
          <Switch
            aria-label="Research sharing preference"
            checked={Boolean(profile?.share_anonymised_data)}
            disabled={updateProfile.isPending}
            onCheckedChange={(share_anonymised_data) =>
              updateProfile.mutate({ share_anonymised_data })
            }
          />
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Your health data is private to your
          account and protected by row-level security.
        </p>
      </GlassCard>

      <GlassCard delay={0.1} className="space-y-3">
        <SectionTitle>Appearance</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((option) => (
            <Button
              key={option}
              variant={theme === option ? "default" : "outline"}
              size="sm"
              className={cn("capitalize")}
              aria-pressed={theme === option}
              onClick={() => {
                setTheme(option);
                updateProfile.mutate({ theme: option });
              }}
            >
              {option === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}{" "}
              {option}
            </Button>
          ))}
        </div>
      </GlassCard>

      <GlassCard delay={0.14} className="space-y-3">
        <SectionTitle>Your data</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Download everything you've logged — profile, cycles, symptoms, moods, wellness and more —
          as a JSON file.
        </p>
        <Button variant="outline" onClick={exportData} disabled={exporting}>
          <Download className="size-4" /> {exporting ? "Preparing…" : "Export my data"}
        </Button>
      </GlassCard>

      <GlassCard delay={0.18} className="space-y-4">
        <SectionTitle>Account</SectionTitle>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="size-4" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your account and every health record you've logged. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="settings-field-1">Type DELETE to confirm</Label>
                <Input
                  id="settings-field-1"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                  onClick={(e) => {
                    e.preventDefault();
                    void deleteAccount();
                  }}
                >
                  {deleting ? "Deleting…" : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Disclaimer />
      </GlassCard>
    </>
  );
}
