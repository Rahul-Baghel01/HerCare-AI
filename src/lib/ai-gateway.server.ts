const GEMINI_CHAT_COMPLETIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

import { serverLog } from "./logger.server";

export type GatewayToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type GatewayMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: GatewayToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
export type GatewayTool = {
  type: "function";
  function: { name: string; description?: string; parameters: Record<string, unknown> };
};

function resolveGeminiApiUrl(configuredUrl: string | undefined) {
  if (!configuredUrl?.trim()) return GEMINI_CHAT_COMPLETIONS_URL;

  const url = configuredUrl.trim().replace(/\/+$/, "");
  const apiUrl = url.endsWith("/chat/completions") ? url : `${url}/chat/completions`;

  if (apiUrl !== GEMINI_CHAT_COMPLETIONS_URL) {
    throw new Error(`Invalid OPENAI_BASE_URL. HerCare AI requires ${GEMINI_CHAT_COMPLETIONS_URL}.`);
  }

  return apiUrl;
}

function resolveGeminiModel(configuredModel: string | undefined) {
  const model = configuredModel?.trim() || DEFAULT_GEMINI_MODEL;
  if (model !== DEFAULT_GEMINI_MODEL) {
    throw new Error(
      `Invalid OPENAI_MODEL "${model}". HerCare AI requires ${DEFAULT_GEMINI_MODEL}.`,
    );
  }
  return model;
}

export async function requestCompletion(
  messages: GatewayMessage[],
  tools: GatewayTool[] = [],
  signal?: AbortSignal,
): Promise<{ content: string | null; toolCalls: GatewayToolCall[] }> {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();
  if (!apiKey) throw new Error("The AI assistant is not configured yet.");

  const apiUrl = resolveGeminiApiUrl(process.env["OPENAI_BASE_URL"]);
  const model = resolveGeminiModel(process.env["OPENAI_MODEL"]);

  let response: Response | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          ...(tools.length ? { tools, tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.any(
          signal
            ? [signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]
            : [AbortSignal.timeout(REQUEST_TIMEOUT_MS)],
        ),
      });
    } catch (error) {
      if (signal?.aborted)
        throw new Error("The assistant request was cancelled.", { cause: error });
      if (attempt === MAX_ATTEMPTS) {
        serverLog("error", "gemini.request_failed", { attempt, reason: "network_or_timeout" });
        throw new Error("The assistant could not connect just now. Please try again.", {
          cause: error,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      continue;
    }

    if (response.status !== 429 && response.status < 500) break;
    if (attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 2000)
            : attempt * 400,
        ),
      );
    }
  }

  if (!response) throw new Error("The assistant could not answer just now. Please try again.");

  if (!response.ok) {
    await response.body?.cancel();
    serverLog("error", "gemini.provider_error", { status: response.status, model });
    if (response.status === 429) {
      throw new Error("The assistant is busy right now. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI billing is not active. Check the configured provider account.");
    }
    throw new Error("The assistant could not answer just now. Please try again.");
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: GatewayToolCall[] } }[];
  };
  const message = data.choices?.[0]?.message;
  const content = message?.content?.trim() || null;
  const toolCalls = message?.tool_calls ?? [];
  if (!content && !toolCalls.length)
    throw new Error("The assistant returned an empty answer. Please try again.");
  if (
    toolCalls.some(
      (call) =>
        !call.id ||
        call.type !== "function" ||
        !call.function?.name ||
        typeof call.function.arguments !== "string",
    )
  ) {
    throw new Error("The assistant returned an invalid tool request. Please try again.");
  }
  return { content, toolCalls };
}

export async function chatCompletion(messages: GatewayMessage[]) {
  const response = await requestCompletion(messages);
  if (!response.content)
    throw new Error("The assistant returned an empty answer. Please try again.");
  return response.content;
}
