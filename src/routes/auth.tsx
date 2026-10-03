import { AuthLayout } from "@/components/hercare/auth-layout";
import { Eyebrow } from "@/components/hercare/care-primitives";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useId } from "react";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard, Disclaimer } from "@/components/hercare/kit";
import { supabase } from "@/integrations/supabase/client";
import { authRedirectUrl } from "@/lib/auth-redirect";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — HerCare AI" },
      { name: "description", content: "Sign in or create your private HerCare AI account." },
      { property: "og:title", content: "Sign in — HerCare AI" },
      { property: "og:description", content: "Access your HerCare AI wellness dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState(mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"verify" | "reset" | null>(null);

  useEffect(() => {
    let active = true;
    // Cached sessions can outlive revoked accounts. Verify before leaving sign-in.
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && !error && data.user) navigate({ to: "/dashboard", replace: true });
      })
      .catch(() => {
        if (active) setAuthError("Your session could not be verified. Please sign in again.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function signIn() {
    setAuthError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp() {
    if (password.length < 8) {
      setAuthError("Use at least 8 characters for your password.");
      return;
    }
    setAuthError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectUrl("/dashboard", window.location.origin),
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent("verify");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function google() {
    setAuthError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectUrl("/dashboard", window.location.origin) },
    });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message || "Google sign-in failed. Please try again.");
    }
  }

  async function forgot() {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl("/reset-password", window.location.origin),
    });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      toast.error(error.message);
      return;
    }
    setSent("reset");
  }

  if (sent) {
    return (
      <AuthLayout>
        <GlassCard className="space-y-3 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Mail className="size-6" />
          </span>
          <h1 className="text-xl font-semibold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            {sent === "verify"
              ? `We sent a verification link to ${email}. Confirm it to activate your account.`
              : `We sent a password reset link to ${email}.`}
          </p>
          <Button variant="outline" onClick={() => setSent(null)}>
            Back to sign in
          </Button>
        </GlassCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-7 space-y-3">
        <Eyebrow>Your personal care space</Eyebrow>
        <h1 className="text-4xl">{tab === "signin" ? "Welcome back." : "Start with you."}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {tab === "signin"
            ? "A moment to check in. A place to feel understood."
            : "Create an account to keep your observations and health history together."}
        </p>
      </div>
      <GlassCard className="space-y-6">
        {authError && (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {authError}
          </p>
        )}
        <Tabs
          value={tab}
          onValueChange={(next) => {
            setTab(next);
            setAuthError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-5">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void signIn();
              }}
            >
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field label="Password" value={password} onChange={setPassword} type="password" />
              <button
                type="button"
                onClick={forgot}
                disabled={busy}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot your password?
              </button>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-5">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void signUp();
              }}
            >
              <Field label="Name" value={name} onChange={setName} />
              <Field label="Email" value={email} onChange={setEmail} type="email" />
              <Field label="Password" value={password} onChange={setPassword} type="password" />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
          Continue with Google
        </Button>
        <Disclaimer />
      </GlassCard>
    </AuthLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={type === "password" && visible ? "text" : type}
          required
          autoComplete={
            type === "password" ? "current-password" : type === "email" ? "email" : "name"
          }
          className={type === "password" ? "pr-12" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {type === "password" && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-xl text-muted-foreground"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
