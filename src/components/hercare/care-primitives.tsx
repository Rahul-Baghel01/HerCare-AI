import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CheckCircle2, CircleAlert, Loader2, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function CareBanner({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="care-banner flex items-start gap-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-sans text-sm font-semibold">{title}</h2>
        <div className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export function CareLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="care-link group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-secondary/30"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SaveStatus({
  pending,
  error,
  saved,
}: {
  pending?: boolean;
  error?: boolean;
  saved?: boolean;
}) {
  if (!pending && !error && !saved) return null;
  const Icon = pending ? Loader2 : error ? CircleAlert : CheckCircle2;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn("flex items-center gap-2 text-sm", error ? "text-destructive" : "text-primary")}
    >
      <Icon className={cn("size-4 shrink-0", pending && "animate-spin")} />
      {pending
        ? "Saving your entry..."
        : error
          ? "Not saved. Your entries are preserved; please try again."
          : "Saved to your history."}
    </p>
  );
}

// Animate the presentation, never count through invented intermediate measurements.
export function MetricValue({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      key={String(children)}
      initial={reduced ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="inline-block tabular-nums"
    >
      {children}
    </motion.span>
  );
}
