import { Eyebrow, MetricValue } from "./care-primitives";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  delay = 0,
  ...rest
}: ComponentProps<"div"> & { delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.22,
        delay: Math.min(delay, 0.08),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn("glass care-panel min-w-0 rounded-3xl p-5 sm:p-6", className)}
      {...(rest as ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="care-page-header flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Eyebrow className="mb-2">Your personal care space</Eyebrow>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "lavender",
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "lavender" | "rose" | "teal" | "honey";
  delay?: number;
}) {
  const tones: Record<string, string> = {
    lavender: "bg-lavender/15 text-primary",
    rose: "bg-rose/15 text-primary",
    teal: "bg-teal/15 text-primary",
    honey: "bg-honey/20 text-primary",
  };
  return (
    <GlassCard delay={delay} className="flex items-start gap-4">
      {icon ? (
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tones[tone])}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-sans text-2xl font-semibold leading-tight">
          <MetricValue>{value}</MetricValue>
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </GlassCard>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 px-5 py-7 text-center">
      {icon ? (
        <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      HerCare AI provides educational wellness information only and is not a substitute for
      professional medical advice, diagnosis or treatment. Always consult a qualified clinician.
    </p>
  );
}

export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading records" className="glass space-y-3 rounded-3xl p-5">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function StatSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass flex items-start gap-4 rounded-3xl p-5">
          <Skeleton className="size-11 shrink-0 rounded-2xl" />
          <div className="w-full space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message = "We couldn't load this data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-destructive/40 px-6 py-10 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-medium">{children}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
