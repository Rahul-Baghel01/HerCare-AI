/** In-app routes that Supabase email links and Google sign-in may return to. */
export const AUTH_REDIRECT_PATHS = ["/dashboard", "/reset-password"] as const;

export type AuthRedirectPath = (typeof AUTH_REDIRECT_PATHS)[number];

/**
 * Builds a Supabase `redirectTo` URL on the origin currently serving the app, so every
 * deployment returns to itself. Supabase only honours it when the exact URL is in
 * Authentication > URL Configuration > Redirect URLs; otherwise it falls back to Site URL.
 */
export function authRedirectUrl(path: AuthRedirectPath, origin: string): string {
  if (!AUTH_REDIRECT_PATHS.includes(path)) throw new Error(`Unsupported auth redirect: ${path}`);
  return new URL(path, new URL(origin).origin).toString();
}
