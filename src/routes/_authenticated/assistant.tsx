import { CareBanner, Eyebrow } from "@/components/hercare/care-primitives";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GlassCard,
  PageHeader,
  Disclaimer,
  LoadingCard,
  ErrorState,
} from "@/components/hercare/kit";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/data";
import { askAssistant } from "@/lib/assistant.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI wellness assistant — HerCare AI" },
      {
        name: "description",
        content:
          "Ask HerCare AI about your cycle, symptoms, PCOS, nutrition, fertility and wellbeing.",
      },
      { property: "og:title", content: "AI wellness assistant — HerCare AI" },
      {
        property: "og:description",
        content: "Personalised, evidence-informed women's health answers.",
      },
    ],
  }),
  component: AssistantPage,
});

type ChatRow = { id: string; role: string; content: string; created_at: string };
const TOOL_LABELS: Record<string, string> = {
  get_cycle_history: "Cycle history",
  get_symptom_history: "Symptom history",
  get_mood_history: "Mood and energy history",
  get_tracking_summary: "Tracking summary",
};

function assistantErrorMessage(error: Error) {
  if (error.message.startsWith("Too many requests"))
    return "Too many requests. Please wait a moment and retry.";
  if (error.message.includes("cancelled or timed out"))
    return "The request ended before an answer was ready. Please retry.";
  if (error.message.includes("could not be saved"))
    return "The answer could not be saved. Please retry.";
  return "The assistant could not finish your answer. Please retry.";
}

const PROMPTS = [
  "Summarize my tracked symptoms, mood and energy over the last 90 days.",
  "What should I eat during the luteal phase?",
  "How can I manage PCOS symptoms naturally?",
  "Which exercises suit me this week?",
];

function AssistantPage() {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState("");

  const history = useQuery({
    queryKey: ["ai_chat_history", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_history")
        .select("id, role, content, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatRow[];
    },
  });

  const send = useMutation({
    mutationFn: async (question: string) => ask({ data: { question } }),
    onSuccess: (_data, question) => {
      setInput((current) => (current.trim() === question ? "" : current));
      queryClient.invalidateQueries({ queryKey: ["ai_chat_history"] });
    },
    onError: (error: Error) => toast.error(assistantErrorMessage(error)),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_chat_history").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conversation cleared");
      send.reset();
      queryClient.invalidateQueries({ queryKey: ["ai_chat_history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messages = history.data ?? [];

  function submit() {
    if (send.isPending) return;
    const question = input.trim();
    if (question.length < 2) {
      toast.error("Type a question first.");
      return;
    }
    send.mutate(question);
  }

  return (
    <>
      <PageHeader
        title="AI wellness assistant"
        description="Personalised answers using your tracked data."
        action={
          messages.length ? (
            <Button variant="outline" onClick={() => clear.mutate()} disabled={clear.isPending}>
              <Trash2 className="size-4" /> Clear
            </Button>
          ) : null
        }
      />

      <CareBanner icon={Sparkle} title="A conversation with context">
        When your question calls for tracked context, the assistant can access your recent cycle,
        symptom and mood records. Answers are educational and can be incomplete; review important
        questions with your clinician.
      </CareBanner>
      {history.isLoading ? (
        <LoadingCard rows={4} />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : (
        <GlassCard className="space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Sparkle className="size-5" />
                </span>
                <div>
                  <p className="font-medium">Ask me anything about your health</p>
                  <p className="text-sm text-muted-foreground">
                    I can look up your cycle, symptom and mood logs when they help answer your
                    question.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROMPTS.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal py-2.5 text-left"
                    onClick={() => setInput(p)}
                    disabled={send.isPending}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "min-w-0 break-words max-w-[95%] sm:max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-card/60",
                    )}
                  >
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      {m.role === "user" ? "You" : "HerCare AI"}
                    </p>
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&_li]:my-0.5 [&_p]:my-1.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {send.isPending ? (
            <div
              className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="mt-0.5 size-4 motion-safe:animate-spin" />
              <span>
                <span className="block font-medium text-foreground">Preparing your response…</span>
                <span className="block text-xs">
                  Checking whether saved tracking context is relevant.
                </span>
              </span>
            </div>
          ) : null}
          {send.isSuccess && (
            <details className="rounded-2xl border border-border p-4 text-sm">
              <summary className="cursor-pointer font-medium">How HerCare AI answered</summary>
              <div className="mt-3 space-y-2 text-foreground">
                <p>
                  {send.data.personalRecordsAccessed
                    ? "Personal tracking records were accessed."
                    : "No personal tracking records were accessed."}
                </p>
                <p>
                  {send.data.usedMcpContext
                    ? "A tracking lookup informed this answer, even if no records were found."
                    : "This answer did not use saved tracking context."}
                </p>
                {send.data.accessedTools.length > 0 ? (
                  <p>
                    Tools used:{" "}
                    {send.data.accessedTools
                      .map((name) => TOOL_LABELS[name] ?? "Health record lookup")
                      .join(", ")}
                    .
                  </p>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {send.data.coverage.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          )}
        </GlassCard>
      )}

      <GlassCard delay={0.05} className="space-y-3">
        <Eyebrow>Your question</Eyebrow>
        <Textarea
          aria-label="Ask HerCare AI a health and wellness question"
          aria-describedby="assistant-disclaimer"
          rows={3}
          value={input}
          placeholder="Ask about symptoms, cycle insights, nutrition, PCOS…"
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {send.isError && (
          <p role="alert" className="text-sm text-destructive">
            {assistantErrorMessage(send.error)} Your question is preserved. You can still review
            your saved history and analytics.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter to send / Shift + Enter for a new line. Suggestions fill the question for you to
          review.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            onClick={submit}
            disabled={send.isPending || input.trim().length < 2 || history.isError}
          >
            {send.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
          {send.isError ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (send.variables) send.mutate(send.variables);
              }}
            >
              Retry
            </Button>
          ) : null}
        </div>
        <div id="assistant-disclaimer">
          <Disclaimer />
        </div>
      </GlassCard>
    </>
  );
}
