import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";
import * as z from "zod/v4";
import type { Database } from "../integrations/supabase/types";
import { describeCoverage, fictionalDataNotice } from "./summary.ts";

const RECORD_LIMIT = 200;
const TOOL_TIMEOUT_MS = 8_000;
const TRANSIENT_STATUSES = new Set([0, 408, 429, 500, 502, 503, 504]);
const inputSchema = z.object({ days: z.number().int().min(1).max(90).default(90) }).strict();
const symptomInputSchema = inputSchema.extend({ includeNotes: z.boolean().default(false) });
const moodInputSchema = inputSchema.extend({ includeJournal: z.boolean().default(false) });
const profileFieldSchema = z.enum([
  "mode",
  "avg_cycle_length",
  "avg_period_length",
  "last_period_start",
  "has_pcos",
  "date_of_birth",
  "medical_conditions",
  "allergies",
]);
const summaryInputSchema = inputSchema.extend({
  profileFields: z.array(profileFieldSchema).max(8).default([]),
});
const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export type HealthMcpAuth = {
  /** Only supply the subject returned by verified Supabase authentication middleware. */
  userId: string;
  /** Request-scoped client carrying the user's bearer token, never a service-role client. */
  supabase: SupabaseClient<Database>;
};

function dateRange(days: number, now: Date) {
  return {
    rangeStart: format(subDays(now, days - 1), "yyyy-MM-dd"),
    rangeEnd: format(now, "yyyy-MM-dd"),
  };
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function failure() {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: "Health records could not be loaded. Do not infer missing values; the user can retry.",
      },
    ],
  };
}

async function readWithTransientRetry<T extends { error: unknown; status: number }>(
  read: () => PromiseLike<T>,
  signal: AbortSignal,
): Promise<T> {
  let response = await read();
  if (!response.error || !TRANSIENT_STATUSES.has(response.status) || signal.aborted) {
    return response;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 150);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
  signal.throwIfAborted();
  response = await read();
  return response;
}

export class McpConnectionError extends Error {
  readonly stage: "initialization" | "discovery";

  constructor(stage: "initialization" | "discovery") {
    super(
      stage === "initialization"
        ? "Health tools could not start."
        : "Health tools could not be discovered.",
    );
    this.stage = stage;
  }
}

export function createHealthMcpServer(
  auth: HealthMcpAuth,
  now = new Date(),
  parentSignal?: AbortSignal,
) {
  if (!auth?.userId || !z.string().uuid().safeParse(auth.userId).success || !auth.supabase) {
    throw new Error("Authenticated user context is required for health tools.");
  }

  const server = new McpServer({ name: "hercare-health-records", version: "1.0.0" });
  const makeSignal = () =>
    AbortSignal.any(
      parentSignal
        ? [parentSignal, AbortSignal.timeout(TOOL_TIMEOUT_MS)]
        : [AbortSignal.timeout(TOOL_TIMEOUT_MS)],
    );

  server.registerTool(
    "get_cycle_history",
    {
      description:
        "Read this signed-in user's recorded menstrual cycle dates and flow for up to 90 recent days. Missing dates are unknown.",
      inputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ days }) => {
      const range = dateRange(days, now);
      const signal = makeSignal();
      try {
        const { data, error } = await readWithTransientRetry(
          () =>
            auth.supabase
              .from("cycles")
              .select("start_date, end_date, flow_intensity")
              .eq("user_id", auth.userId)
              .gte("start_date", range.rangeStart)
              .lte("start_date", range.rangeEnd)
              .order("start_date", { ascending: false })
              .limit(RECORD_LIMIT)
              .abortSignal(signal),
          signal,
        );
        if (error) return failure();
        return result({
          ...range,
          records: data ?? [],
          count: data?.length ?? 0,
          limitReached: (data?.length ?? 0) >= RECORD_LIMIT,
        });
      } catch {
        return failure();
      }
    },
  );

  server.registerTool(
    "get_symptom_history",
    {
      description:
        "Read this signed-in user's recorded symptoms and severity for up to 90 recent days. Set includeNotes only when the user explicitly asks about their notes.",
      inputSchema: symptomInputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ days, includeNotes }) => {
      const range = dateRange(days, now);
      const signal = makeSignal();
      try {
        const { data, error } = await readWithTransientRetry(
          () =>
            auth.supabase
              .from("symptoms")
              .select("log_date, name, severity, notes")
              .eq("user_id", auth.userId)
              .gte("log_date", range.rangeStart)
              .lte("log_date", range.rangeEnd)
              .order("log_date", { ascending: false })
              .limit(RECORD_LIMIT)
              .abortSignal(signal),
          signal,
        );
        if (error) return failure();
        return result({
          ...range,
          records: (data ?? []).map((row) => ({
            log_date: row.log_date,
            name: row.name,
            severity: row.severity,
            ...(includeNotes ? { notes: row.notes?.slice(0, 240) ?? null } : {}),
            fictionalDemo: Boolean(fictionalDataNotice([row.notes])),
          })),
          count: data?.length ?? 0,
          limitReached: (data?.length ?? 0) >= RECORD_LIMIT,
        });
      } catch {
        return failure();
      }
    },
  );

  server.registerTool(
    "get_mood_history",
    {
      description:
        "Read this signed-in user's mood, energy and stress logs for up to 90 recent days. Set includeJournal only when the user explicitly asks about their journal.",
      inputSchema: moodInputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ days, includeJournal }) => {
      const range = dateRange(days, now);
      const signal = makeSignal();
      try {
        const { data, error } = await readWithTransientRetry(
          () =>
            auth.supabase
              .from("moods")
              .select("log_date, mood, energy_level, stress_level, journal")
              .eq("user_id", auth.userId)
              .gte("log_date", range.rangeStart)
              .lte("log_date", range.rangeEnd)
              .order("log_date", { ascending: false })
              .limit(RECORD_LIMIT)
              .abortSignal(signal),
          signal,
        );
        if (error) return failure();
        return result({
          ...range,
          records: (data ?? []).map((row) => ({
            log_date: row.log_date,
            mood: row.mood,
            energy_level: row.energy_level,
            stress_level: row.stress_level,
            ...(includeJournal ? { journal: row.journal?.slice(0, 240) ?? null } : {}),
            fictionalDemo: Boolean(fictionalDataNotice([row.journal])),
          })),
          count: data?.length ?? 0,
          limitReached: (data?.length ?? 0) >= RECORD_LIMIT,
        });
      } catch {
        return failure();
      }
    },
  );

  server.registerTool(
    "get_tracking_summary",
    {
      description:
        "Summarize this signed-in user's cycle, symptom and mood record coverage for up to 90 recent days. Request only the specific profileFields needed for the user's question; leave the list empty otherwise.",
      inputSchema: summaryInputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ days, profileFields }) => {
      const range = dateRange(days, now);
      const signal = makeSignal();
      try {
        const [cycles, symptoms, moods] = await Promise.all([
          readWithTransientRetry(
            () =>
              auth.supabase
                .from("cycles")
                .select("start_date")
                .eq("user_id", auth.userId)
                .gte("start_date", range.rangeStart)
                .lte("start_date", range.rangeEnd)
                .order("start_date", { ascending: false })
                .limit(RECORD_LIMIT)
                .abortSignal(signal),
            signal,
          ),
          readWithTransientRetry(
            () =>
              auth.supabase
                .from("symptoms")
                .select("log_date, notes")
                .eq("user_id", auth.userId)
                .gte("log_date", range.rangeStart)
                .lte("log_date", range.rangeEnd)
                .order("log_date", { ascending: false })
                .limit(RECORD_LIMIT)
                .abortSignal(signal),
            signal,
          ),
          readWithTransientRetry(
            () =>
              auth.supabase
                .from("moods")
                .select("log_date, journal")
                .eq("user_id", auth.userId)
                .gte("log_date", range.rangeStart)
                .lte("log_date", range.rangeEnd)
                .order("log_date", { ascending: false })
                .limit(RECORD_LIMIT)
                .abortSignal(signal),
            signal,
          ),
        ]);
        if (cycles.error || symptoms.error || moods.error) return failure();
        const groups = [
          { label: "Cycles", dates: (cycles.data ?? []).map((r) => r.start_date) },
          { label: "Symptoms", dates: (symptoms.data ?? []).map((r) => r.log_date) },
          { label: "Moods", dates: (moods.data ?? []).map((r) => r.log_date) },
        ];
        const coverage = describeCoverage(groups, range, days);
        if (groups.some((g) => g.dates.length >= RECORD_LIMIT)) {
          coverage.push(
            "Result limit reached for at least one record type; additional entries may exist.",
          );
        }
        const fictional = fictionalDataNotice([
          ...(symptoms.data ?? []).map((r) => r.notes),
          ...(moods.data ?? []).map((r) => r.journal),
        ]);
        if (fictional) coverage.push(fictional);
        const profile = profileFields.length
          ? await readWithTransientRetry(
              () =>
                auth.supabase
                  .from("profiles")
                  .select(profileFields.join(","))
                  .eq("id", auth.userId)
                  .abortSignal(signal)
                  .maybeSingle(),
              signal,
            )
          : null;
        if (profile?.error) return failure();
        if (profileFields.length)
          coverage.push(
            profile?.data
              ? `${profileFields.length} requested profile fields supplied.`
              : "No profile data found.",
          );
        return result({
          ...range,
          coverage,
          counts: Object.fromEntries(groups.map((g) => [g.label, g.dates.length])),
          limitReached: groups.some((g) => g.dates.length >= RECORD_LIMIT),
          ...(profileFields.length ? { profile: profile?.data ?? null } : {}),
        });
      } catch {
        return failure();
      }
    },
  );
  return server;
}

export async function connectHealthMcp(
  auth: HealthMcpAuth,
  signal?: AbortSignal,
  onStage?: (stage: "server_initialized" | "tools_discovered", toolCount?: number) => void,
) {
  const server = createHealthMcpServer(auth, new Date(), signal);
  const client = new Client({ name: "hercare-assistant", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  let stage: "initialization" | "discovery" = "initialization";
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport, { timeout: TOOL_TIMEOUT_MS, signal });
    onStage?.("server_initialized");
    stage = "discovery";
    const tools = (await client.listTools(undefined, { timeout: TOOL_TIMEOUT_MS, signal })).tools;
    onStage?.("tools_discovered", tools.length);
    return {
      client,
      tools,
      close: async () => {
        const closed = await Promise.allSettled([
          Promise.resolve().then(() => client.close()),
          Promise.resolve().then(() => server.close()),
        ]);
        if (closed.some((result) => result.status === "rejected")) {
          throw new Error("Health tool connection could not close cleanly.");
        }
      },
    };
  } catch {
    await Promise.allSettled([
      Promise.resolve().then(() => client.close()),
      Promise.resolve().then(() => server.close()),
    ]);
    throw new McpConnectionError(stage);
  }
}
