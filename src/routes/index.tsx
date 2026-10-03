import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Baby,
  CalendarDays,
  Flower2,
  HeartPulse,
  MessageCircle,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/hercare/kit";
import { Eyebrow } from "@/components/hercare/care-primitives";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HerCare AI — Cycle, PCOS & Wellness Tracking" },
      {
        name: "description",
        content:
          "HerCare AI tracks your cycle, symptoms, mood, PCOS and fertility, with predictions, charts and an AI wellness assistant.",
      },
      { property: "og:title", content: "HerCare AI — Cycle, PCOS & Wellness Tracking" },
      {
        property: "og:description",
        content: "A premium, private women's health companion with AI-powered wellness insights.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Know your rhythm",
    text: "A cycle calendar, period logs and clearly marked estimates.",
  },
  {
    icon: Activity,
    title: "Notice the little things",
    text: "Symptoms, mood and energy, with room for your own words.",
  },
  {
    icon: Stethoscope,
    title: "Keep your PCOS history",
    text: "Record measurements, skin and hair changes over time.",
  },
  {
    icon: HeartPulse,
    title: "Track fertility signs",
    text: "Keep BBT, observations and ovulation test results together.",
  },
  {
    icon: Baby,
    title: "Follow your pregnancy",
    text: "Due-date progress, weekly milestones and personal logs.",
  },
  {
    icon: MessageCircle,
    title: "Make space for questions",
    text: "An educational AI assistant with context from your tracked history.",
  },
];

function Landing() {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-screen">
      <a
        href="#welcome"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg">
          <Flower2 className="size-6 text-primary" /> HerCare AI
        </Link>
        <nav aria-label="Welcome navigation" className="flex items-center gap-2">
          <a
            href="#care"
            className="mr-4 hidden text-sm text-muted-foreground hover:text-primary md:block"
          >
            Explore your care
          </a>
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>
      <main id="welcome">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Eyebrow>Women's health, with you at the centre</Eyebrow>
            <h1 className="mt-6 max-w-xl text-5xl font-medium leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">
              A little more
              <br />
              in tune with <span className="italic text-primary">you.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Your cycle, your energy, your everyday feelings. Bring them together in a calm space
              that grows with your story.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your care space <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Your own records. Clear trends. Room for questions.
            </p>
          </motion.div>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[2rem] border border-border bg-secondary">
              <img
                src={heroImage}
                alt="Soft botanical shapes in lavender and rose"
                width={1600}
                height={1200}
                fetchPriority="high"
                className="aspect-[1.12] w-full object-cover"
              />
              <div className="care-feature px-7 py-7 sm:px-9">
                <Eyebrow className="care-subtle">Your wellbeing, in your own words</Eyebrow>
                <p className="mt-3 font-display text-2xl sm:text-3xl">
                  Small check-ins.
                  <br />A clearer picture over time.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
        <section id="care" className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-10 sm:py-20">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <Eyebrow>Care for every chapter</Eyebrow>
                <h2 className="mt-3 text-3xl sm:text-4xl">Your whole story belongs here.</h2>
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground lg:justify-self-end">
                Choose what is relevant to you. Track daily habits, prepare for appointments, and
                export a report from the same records you see in your analytics.
              </p>
            </div>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article
                  key={f.title}
                  className="flex items-start gap-4 border-t border-border pt-6"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-sans text-sm font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-10 md:flex-row md:items-center">
          <div>
            <Eyebrow>Begin with a moment for yourself</Eyebrow>
            <h2 className="mt-3 text-3xl">Meet yourself where you are.</h2>
          </div>
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-border px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p className="flex items-center gap-2 font-display">
          <Flower2 className="size-5 text-primary" /> HerCare AI
        </p>
        <Disclaimer className="max-w-lg" />
      </footer>
    </div>
  );
}
