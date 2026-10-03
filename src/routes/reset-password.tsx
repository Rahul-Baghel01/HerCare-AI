import { AuthLayout } from "@/components/hercare/auth-layout";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/hercare/kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — HerCare AI" },
      { name: "description", content: "Choose a new password for your HerCare AI account." },
      { property: "og:title", content: "Set a new password — HerCare AI" },
      { property: "og:description", content: "Securely reset your HerCare AI password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function save() {
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthLayout>
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Use the link from your reset email. Choose a password with at least 8 characters.
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              autoComplete="new-password"
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Updating..." : "Update password"}
          </Button>
        </form>
      </GlassCard>
    </AuthLayout>
  );
}
