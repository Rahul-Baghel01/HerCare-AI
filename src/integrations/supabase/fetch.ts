export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** Ensures opaque Supabase keys are sent as `apikey`, without an invalid bearer header. */
export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    const signal =
      init?.signal ??
      (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);
    const timeout = AbortSignal.timeout(15_000);
    return fetch(input, {
      ...init,
      headers,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  };
}
