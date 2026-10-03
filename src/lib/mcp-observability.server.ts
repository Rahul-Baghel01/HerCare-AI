import { randomUUID } from "node:crypto";
import { serverLog } from "./logger.server.ts";

export const HEALTH_TOOL_NAMES = [
  "get_cycle_history",
  "get_symptom_history",
  "get_mood_history",
  "get_tracking_summary",
] as const;

export type McpLifecyclePhase =
  | "request_started"
  | "server_initialized"
  | "tools_discovered"
  | "tool_selected"
  | "tool_execution_started"
  | "tool_execution_completed"
  | "tool_execution_failed"
  | "tool_execution_skipped"
  | "final_response_generated"
  | "request_failed"
  | "connection_closed";

export type McpFailureReason =
  | "authentication"
  | "initialization"
  | "discovery"
  | "unavailable_tool"
  | "invalid_arguments"
  | "duplicate_call"
  | "tool_error"
  | "timeout"
  | "cancelled"
  | "provider"
  | "call_limit";

export type McpEventMetadata = {
  toolName?: string;
  durationMs?: number;
  success?: boolean;
  toolCallCount?: number;
  usedMcpContext?: boolean;
  personalRecordsAccessed?: boolean;
  discoveredToolCount?: number;
  reason?: McpFailureReason;
};

export type McpLifecycleEvent = McpEventMetadata & {
  requestId: string;
  phase: McpLifecyclePhase;
};

export type McpEventSink = (event: McpLifecycleEvent) => void;

const knownTools = new Set<string>(HEALTH_TOOL_NAMES);
const knownReasons = new Set<McpFailureReason>([
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
]);

/** One request ID and a fixed, metadata-only schema; caller data never reaches the log sink. */
export function createMcpObserver(sink: McpEventSink = logMcpEvent) {
  const requestId = randomUUID();
  const startedAt = performance.now();
  return {
    elapsedMs: () => Math.max(0, Math.round(performance.now() - startedAt)),
    emit(phase: McpLifecyclePhase, metadata: McpEventMetadata = {}) {
      const event: McpLifecycleEvent = { requestId, phase };
      if (metadata.toolName) {
        event.toolName = knownTools.has(metadata.toolName) ? metadata.toolName : "unavailable_tool";
      }
      if (typeof metadata.durationMs === "number" && Number.isFinite(metadata.durationMs)) {
        event.durationMs = Math.max(0, Math.round(metadata.durationMs));
      }
      if (typeof metadata.success === "boolean") event.success = metadata.success;
      if (typeof metadata.toolCallCount === "number") {
        event.toolCallCount = Math.max(0, Math.floor(metadata.toolCallCount));
      }
      if (typeof metadata.usedMcpContext === "boolean") {
        event.usedMcpContext = metadata.usedMcpContext;
      }
      if (typeof metadata.personalRecordsAccessed === "boolean") {
        event.personalRecordsAccessed = metadata.personalRecordsAccessed;
      }
      if (typeof metadata.discoveredToolCount === "number") {
        event.discoveredToolCount = Math.max(0, Math.floor(metadata.discoveredToolCount));
      }
      if (metadata.reason && knownReasons.has(metadata.reason)) event.reason = metadata.reason;
      sink(event);
    },
  };
}

function logMcpEvent(event: McpLifecycleEvent) {
  const level =
    event.phase === "tool_execution_failed" || event.phase === "request_failed" ? "warn" : "info";
  serverLog(level, `mcp.${event.phase}`, event);
}
