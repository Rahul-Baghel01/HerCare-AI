import { errorMetadata } from "./error-metadata.ts";

// Recover only safe metadata when h3 normalizes an unhandled failure into HTTPError.
let lastCapturedError: { error: ReturnType<typeof errorMetadata>; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error: errorMetadata(error), at: Date.now() };
}

export function describeError(error: unknown): string {
  return JSON.stringify(errorMetadata(error));
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const safe = args.map((arg) => {
    if (arg === null || typeof arg !== "object") return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...safe);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  const captured = lastCapturedError;
  lastCapturedError = undefined;
  return captured && Date.now() - captured.at <= TTL_MS ? captured.error : undefined;
}
