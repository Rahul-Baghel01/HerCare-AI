import type { GatewayMessage, GatewayTool, GatewayToolCall } from "./ai-gateway.server";
import { connectHealthMcp, McpConnectionError, type HealthMcpAuth } from "./health-mcp.server.ts";
import {
  createMcpObserver,
  HEALTH_TOOL_NAMES,
  type McpEventSink,
  type McpFailureReason,
} from "./mcp-observability.server.ts";

const MAX_TOOL_ROUNDS = 2;
const MAX_TOOL_CALLS = 4;
const TOOL_TIMEOUT_MS = 8_000;
const ASSISTANT_TIMEOUT_MS = 60_000;
const TOOL_FAILURE =
  "Health records could not be loaded. Do not infer missing values; the user can retry.";
const INVALID_TOOL = "Invalid or unavailable health tool request. No records were accessed.";

type Completion = (
  messages: GatewayMessage[],
  tools: GatewayTool[],
  signal: AbortSignal,
) => Promise<{ content: string | null; toolCalls: GatewayToolCall[] }>;

type ToolOutcome = {
  text: string;
  success: boolean;
  coverage: string[];
  personalRecordsAccessed: boolean;
};

function toolArguments(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toolCoverage(
  name: string,
  text: string,
): Pick<ToolOutcome, "coverage" | "personalRecordsAccessed"> {
  try {
    const data = JSON.parse(text) as {
      rangeStart?: string;
      rangeEnd?: string;
      count?: number;
      counts?: Record<string, number>;
      profile?: unknown;
      coverage?: string[];
      records?: { fictionalDemo?: boolean }[];
      limitReached?: boolean;
    };
    const personalRecordsAccessed = Boolean(
      (data.count ?? 0) > 0 ||
      Object.values(data.counts ?? {}).some((count) => count > 0) ||
      data.profile,
    );
    if (Array.isArray(data.coverage)) return { coverage: data.coverage, personalRecordsAccessed };
    const labels: Record<string, string> = {
      get_cycle_history: "Cycle history",
      get_symptom_history: "Symptom history",
      get_mood_history: "Mood history",
    };
    const label = labels[name] ?? name;
    const coverage = [
      `${label}: ${data.count ?? 0} records found from ${data.rangeStart} to ${data.rangeEnd}.`,
    ];
    if (data.limitReached)
      coverage.push(`${label}: result limit reached; additional records may exist.`);
    if (data.records?.some((record) => record.fictionalDemo)) {
      coverage.push(
        "Includes explicitly labeled fictional demo QA records; these are not actual health observations.",
      );
    }
    return { coverage, personalRecordsAccessed };
  } catch {
    return { coverage: [`${name}: coverage details unavailable.`], personalRecordsAccessed: false };
  }
}

function callSignature(name: string, args: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {
    ...args,
    days: args.days === undefined ? 90 : args.days,
  };
  if (name === "get_symptom_history" && normalized.includeNotes === undefined) {
    normalized.includeNotes = false;
  }
  if (name === "get_mood_history" && normalized.includeJournal === undefined) {
    normalized.includeJournal = false;
  }
  if (name === "get_tracking_summary") {
    normalized.profileFields = Array.isArray(args.profileFields)
      ? [...args.profileFields].sort()
      : args.profileFields === undefined
        ? []
        : args.profileFields;
  }
  return `${name}:${JSON.stringify(Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b))))}`;
}

function cancellationReason(signal: AbortSignal): "cancelled" | "timeout" {
  return signal.reason instanceof DOMException && signal.reason.name === "TimeoutError"
    ? "timeout"
    : "cancelled";
}

function requireActive(signal: AbortSignal) {
  if (signal.aborted)
    throw new Error("The assistant request was cancelled or timed out. Please retry.");
}

function failureReason(error: unknown, signal: AbortSignal): McpFailureReason {
  if (signal.aborted) return cancellationReason(signal);
  if (error instanceof McpConnectionError) return error.stage;
  if (error instanceof Error && error.message.startsWith("Authenticated user context")) {
    return "authentication";
  }
  if (error instanceof Error && error.message.includes("too many health record lookups")) {
    return "call_limit";
  }
  return "provider";
}

export async function runAssistantWithMcp(input: {
  auth: HealthMcpAuth;
  messages: GatewayMessage[];
  complete: Completion;
  signal?: AbortSignal;
  observe?: McpEventSink;
  connect?: typeof connectHealthMcp;
  toolTimeoutMs?: number;
}) {
  const observer = createMcpObserver(input.observe);
  observer.emit("request_started", { toolCallCount: 0, usedMcpContext: false });
  const signal = AbortSignal.any(
    input.signal
      ? [input.signal, AbortSignal.timeout(ASSISTANT_TIMEOUT_MS)]
      : [AbortSignal.timeout(ASSISTANT_TIMEOUT_MS)],
  );
  const connect = input.connect ?? connectHealthMcp;
  let session: Awaited<ReturnType<typeof connectHealthMcp>> | undefined;
  const accessedTools = new Set<string>();
  const reportedOutcomes = new Set<ToolOutcome>();
  const coverage: string[] = [];
  const outcomeCache = new Map<string, ToolOutcome>();
  const signatureByCallId = new Map<string, string>();
  let requestedCalls = 0;
  let executedCalls = 0;
  let usedMcpContext = false;
  let personalRecordsAccessed = false;

  try {
    requireActive(signal);
    session = await connect(input.auth, signal, (stage, count) => {
      if (stage === "server_initialized") observer.emit("server_initialized", { success: true });
      else observer.emit("tools_discovered", { success: true, discoveredToolCount: count ?? 0 });
    });
    requireActive(signal);
    const known = new Set<string>(HEALTH_TOOL_NAMES);
    const discovered = new Map(
      session.tools.filter((tool) => known.has(tool.name)).map((tool) => [tool.name, tool]),
    );
    const offered: GatewayTool[] = [...discovered.values()].map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    }));
    const messages = [...input.messages];
    if (!offered.length) {
      messages.push({
        role: "system",
        content:
          "Health-record tools are unavailable. If asked about personal tracking, say records could not be checked.",
      });
      coverage.push("Health-record tools were unavailable; no personal records were checked.");
    }

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      requireActive(signal);
      const canCall =
        round < MAX_TOOL_ROUNDS && requestedCalls < MAX_TOOL_CALLS && offered.length > 0;
      const response = await input.complete(messages, canCall ? offered : [], signal);
      requireActive(signal);
      if (!response.toolCalls.length) {
        if (!response.content)
          throw new Error("The assistant returned an empty answer. Please try again.");
        if (!usedMcpContext && !coverage.length)
          coverage.push("No health records were accessed for this answer.");
        observer.emit("final_response_generated", {
          success: true,
          durationMs: observer.elapsedMs(),
          toolCallCount: executedCalls,
          usedMcpContext,
          personalRecordsAccessed,
        });
        return {
          answer: response.content,
          coverage: [...new Set(coverage)],
          accessedTools: [...accessedTools],
          usedMcpContext,
          personalRecordsAccessed,
          toolCallCount: executedCalls,
        };
      }
      if (!canCall || response.toolCalls.length > MAX_TOOL_CALLS - requestedCalls) {
        throw new Error(
          "The assistant requested too many health record lookups. Please retry with a narrower question.",
        );
      }
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls,
      });
      for (const call of response.toolCalls) {
        requireActive(signal);
        requestedCalls += 1;
        observer.emit("tool_selected", {
          toolName: call.function.name,
          toolCallCount: executedCalls,
        });
        const args = toolArguments(call.function.arguments);
        let outcome: ToolOutcome;
        if (!discovered.has(call.function.name)) {
          outcome = {
            text: INVALID_TOOL,
            success: false,
            coverage: [],
            personalRecordsAccessed: false,
          };
          observer.emit("tool_execution_failed", {
            toolName: call.function.name,
            success: false,
            reason: "unavailable_tool",
            toolCallCount: executedCalls,
          });
        } else if (!args) {
          outcome = {
            text: INVALID_TOOL,
            success: false,
            coverage: [],
            personalRecordsAccessed: false,
          };
          observer.emit("tool_execution_failed", {
            toolName: call.function.name,
            success: false,
            reason: "invalid_arguments",
            toolCallCount: executedCalls,
          });
        } else {
          const signature = callSignature(call.function.name, args);
          const priorSignature = signatureByCallId.get(call.id);
          if (priorSignature && priorSignature !== signature) {
            outcome = {
              text: INVALID_TOOL,
              success: false,
              coverage: [],
              personalRecordsAccessed: false,
            };
            observer.emit("tool_execution_failed", {
              toolName: call.function.name,
              success: false,
              reason: "duplicate_call",
              toolCallCount: executedCalls,
            });
          } else if (outcomeCache.has(signature)) {
            signatureByCallId.set(call.id, signature);
            outcome = outcomeCache.get(signature)!;
            observer.emit("tool_execution_skipped", {
              toolName: call.function.name,
              success: outcome.success,
              reason: "duplicate_call",
              toolCallCount: executedCalls,
            });
          } else {
            signatureByCallId.set(call.id, signature);
            executedCalls += 1;
            const startedAt = performance.now();
            observer.emit("tool_execution_started", {
              toolName: call.function.name,
              toolCallCount: executedCalls,
            });
            try {
              const result = await session.client.callTool(
                { name: call.function.name, arguments: args },
                { timeout: input.toolTimeoutMs ?? TOOL_TIMEOUT_MS, signal },
              );
              requireActive(signal);
              const returnedText =
                result.content
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("\n") || TOOL_FAILURE;
              const success = !result.isError && returnedText !== TOOL_FAILURE;
              const text = success ? returnedText : TOOL_FAILURE;
              const details = success
                ? toolCoverage(call.function.name, text)
                : { coverage: [], personalRecordsAccessed: false };
              outcome = { text, success, ...details };
              observer.emit(success ? "tool_execution_completed" : "tool_execution_failed", {
                toolName: call.function.name,
                durationMs: performance.now() - startedAt,
                success,
                toolCallCount: executedCalls,
                ...(!success ? { reason: "tool_error" as const } : {}),
              });
            } catch (error) {
              if (signal.aborted) throw error;
              const timedOut =
                error instanceof Error && "code" in error && error.code === "REQUEST_TIMEOUT";
              outcome = {
                text: TOOL_FAILURE,
                success: false,
                coverage: [],
                personalRecordsAccessed: false,
              };
              observer.emit("tool_execution_failed", {
                toolName: call.function.name,
                durationMs: performance.now() - startedAt,
                success: false,
                toolCallCount: executedCalls,
                reason: timedOut ? "timeout" : "tool_error",
              });
            }
            outcomeCache.set(signature, outcome);
          }
        }
        if (outcome.success) {
          accessedTools.add(call.function.name);
          if (!reportedOutcomes.has(outcome)) {
            reportedOutcomes.add(outcome);
            coverage.push(...outcome.coverage);
          }
          usedMcpContext = true;
          personalRecordsAccessed ||= outcome.personalRecordsAccessed;
        } else if (!outcome.success) {
          coverage.push(
            `${discovered.has(call.function.name) ? call.function.name : "Health tool"}: records could not be loaded; no answer should rely on them.`,
          );
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: outcome.text });
      }
    }
    throw new Error("The assistant could not complete the answer. Please retry.");
  } catch (error) {
    observer.emit("request_failed", {
      success: false,
      durationMs: observer.elapsedMs(),
      toolCallCount: executedCalls,
      usedMcpContext,
      personalRecordsAccessed,
      reason: failureReason(error, signal),
    });
    if (signal.aborted)
      throw new Error("The assistant request was cancelled or timed out. Please retry.");
    throw error;
  } finally {
    if (session) {
      try {
        await session.close();
        observer.emit("connection_closed", {
          success: true,
          durationMs: observer.elapsedMs(),
          toolCallCount: executedCalls,
          usedMcpContext,
        });
      } catch {
        observer.emit("connection_closed", {
          success: false,
          durationMs: observer.elapsedMs(),
          toolCallCount: executedCalls,
          usedMcpContext,
        });
      }
    }
  }
}
