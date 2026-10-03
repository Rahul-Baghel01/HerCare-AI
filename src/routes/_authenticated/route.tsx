import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    // A document redirect avoids hydrating a different route after a direct protected-page load.
    if (error || !data.user) throw redirect({ to: "/auth", reloadDocument: true });
    context.queryClient.setQueryData(["auth-user"], data.user);
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
