import { useProfile } from "@/lib/data";
import { toast } from "sonner";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  Flower2,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Sparkle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/theme-provider";
import { NAV_GROUPS } from "@/components/layout/nav";
import { NotificationBell } from "@/components/hercare/notification-bell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Flower2 className="size-5" />
      </span>
      <span className="font-display whitespace-nowrap text-lg font-semibold">HerCare AI</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-5 pb-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const currentPage =
    NAV_GROUPS.flatMap((g) => g.items).find((item) => item.to === pathname)?.label ?? "Your care";
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="care-sidebar sticky top-0 hidden h-screen flex-col px-4 py-6 lg:flex">
        <Brand />
        <ScrollArea className="mt-7 flex-1 pr-1">
          <NavList />
        </ScrollArea>
        <Button variant="ghost" className="justify-start gap-3" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="care-sidebar w-72 overflow-y-auto px-4 py-5">
                <SheetTitle className="sr-only">Main navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Choose a health tracker or view your account.
                </SheetDescription>
                <Brand />
                <div className="mt-6">
                  <NavList onNavigate={() => setOpen(false)} />
                </div>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                HerCare
              </span>
              <span className="text-border">/</span>
              <span className="text-sm font-medium">{currentPage}</span>
            </div>
            <div className="lg:hidden">
              <Brand />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Link
              to="/profile"
              aria-label="Open your profile"
              className="ml-1 hidden sm:grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary"
            >
              {profile?.display_name?.slice(0, 1).toUpperCase() ?? "H"}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
              }
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="pb-28 lg:pb-8 mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 xl:px-10"
        >
          {children}
        </main>
        <nav
          aria-label="Quick navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          {[
            { to: "/dashboard", label: "Today", icon: LayoutDashboard },
            { to: "/cycle", label: "Calendar", icon: CalendarDays },
            { to: "/analytics", label: "Insights", icon: BarChart3 },
            { to: "/assistant", label: "Assistant", icon: Sparkle },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={pathname === item.to ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs",
                pathname === item.to
                  ? "bg-secondary font-semibold text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
