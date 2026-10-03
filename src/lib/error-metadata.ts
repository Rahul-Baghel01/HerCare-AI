const ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "TimeoutError",
  "HTTPError",
  "AuthApiError",
  "AuthRetryableFetchError",
]);

/** Error messages and stacks can contain credentials or health data. Never log them. */
export function errorMetadata(error: unknown) {
  const metadata: { name: string; status?: number } = { name: "Error" };
  if (error && typeof error === "object") {
    if ("name" in error && typeof error.name === "string" && ERROR_NAMES.has(error.name)) {
      metadata.name = error.name;
    }
    const status =
      "status" in error ? error.status : "statusCode" in error ? error.statusCode : undefined;
    if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
      metadata.status = status;
    }
  }
  return metadata;
}
