import { Link } from "@tanstack/react-router";
import { Flower2, ArrowLeft, HeartHandshake } from "lucide-react";
import type { ReactNode } from "react";
import { Eyebrow } from "./care-primitives";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="care-feature relative hidden overflow-hidden p-12 lg:flex lg:flex-col xl:p-16">
        <Link to="/" className="flex items-center gap-3 font-display text-xl">
          <Flower2 className="size-7" /> HerCare AI
        </Link>
        <div aria-hidden className="care-orbit absolute -right-36 top-32 size-[32rem]" />
        <div aria-hidden className="care-orbit absolute -right-20 top-48 size-96" />
        <div className="relative my-auto max-w-lg py-20">
          <HeartHandshake className="mb-8 size-10 text-rose" strokeWidth={1.25} />
          <Eyebrow className="care-subtle">A little more in tune with you</Eyebrow>
          <h2 className="mt-5 text-5xl leading-[1.12] xl:text-6xl">
            Your health.
            <br />
            Your rhythm.
            <br />
            Your space.
          </h2>
          <p className="care-subtle mt-7 max-w-sm leading-relaxed">
            Bring your everyday observations together. Build a clearer picture, one check-in at a
            time.
          </p>
        </div>
        <p className="care-subtle text-xs">Personal tracking and educational support.</p>
      </section>
      <section className="flex min-w-0 flex-col px-5 py-8 sm:px-10">
        <Link
          to="/"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to HerCare
        </Link>
        <div className="mx-auto my-auto w-full max-w-md py-10">{children}</div>
      </section>
    </main>
  );
}
