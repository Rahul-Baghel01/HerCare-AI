import { errorMetadata } from "./error-metadata.ts";

type LogLevel = "info" | "warn" | "error";

const SAFE_REASONS = new Set([
  "authentication",
  "initialization",
  "discovery",
  "unavailable_tool",
  "invalid_arguments",
  "duplicate_call",
  "tool_error",
  "timeout",
  "cancelled",
  "provider",
  "call_limit",
  "network_or_timeout",
]);
const SAFE_PHASES = new Set([
  "request_started",
  "server_initialized",
  "tools_discovered",
  "tool_selected",
  "tool_execution_started",
  "tool_execution_completed",
  "tool_execution_failed",
  "tool_execution_skipped",
  "final_response_generated",
  "request_failed",
  "connection_closed",
]);
const SAFE_TOOLS = new Set([
  "get_cycle_history",
  "get_symptom_history",
  "get_mood_history",
  "get_tracking_summary",
  "unavailable_tool",
]);

function logMetadata(details: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const key of ["attempt", "status", "durationMs", "toolCallCount", "discoveredToolCount"]) {
    const value = details[key];
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
  }
  for (const key of ["success", "usedMcpContext", "personalRecordsAccessed"]) {
    if (typeof details[key] === "boolean") safe[key] = details[key];
  }
  if (typeof details.requestId === "string" && /^[0-9a-f-]{36}$/i.test(details.requestId))
    safe.requestId = details.requestId;
  if (typeof details.reason === "string" && SAFE_REASONS.has(details.reason))
    safe.reason = details.reason;
  if (typeof details.phase === "string" && SAFE_PHASES.has(details.phase))
    safe.phase = details.phase;
  if (typeof details.toolName === "string" && SAFE_TOOLS.has(details.toolName))
    safe.toolName = details.toolName;
  if (details.model === "gemini-3.6-flash") safe.model = details.model;
  if (details.error) safe.error = errorMetadata(details.error);
  return safe;
}

export function serverLog(level: LogLevel, event: string, details: Record<string, unknown> = {}) {
  const entry = JSON.stringify({
    level,
    event,
    ...logMetadata(details),
    timestamp: new Date().toISOString(),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export function logServerError(
  event: string,
  error: unknown,
  details: Record<string, unknown> = {},
) {
  serverLog("error", event, { ...details, error: errorMetadata(error) });
}
