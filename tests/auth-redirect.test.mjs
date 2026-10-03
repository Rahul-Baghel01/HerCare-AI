import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { AUTH_REDIRECT_PATHS, authRedirectUrl } from "../src/lib/auth-redirect.ts";

const src = new URL("../src/", import.meta.url);

async function sourceFiles(dir = src) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) files.push(...(await sourceFiles(url)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(url);
  }
  return files;
}

test("auth redirects return to the origin serving the app", () => {
  for (const origin of [
    "https://her-care-ai.vercel.app",
    "https://her-care-abc123-team.vercel.app",
    "http://localhost:8080",
  ]) {
    assert.equal(authRedirectUrl("/dashboard", origin), `${origin}/dashboard`);
    assert.equal(authRedirectUrl("/reset-password", origin), `${origin}/reset-password`);
  }
  // A full href (path, query, hash) still resolves against the origin only.
  assert.equal(
    authRedirectUrl("/dashboard", "https://her-care-ai.vercel.app/auth?mode=signin#x"),
    "https://her-care-ai.vercel.app/dashboard",
  );
});

test("auth redirects reject paths outside the supported in-app routes", () => {
  for (const path of [
    "//aura-well-co.vercel.app/dashboard",
    "https://evil.test/",
    "/auth/callback",
  ]) {
    assert.throws(() => authRedirectUrl(path, "https://her-care-ai.vercel.app"), /Unsupported/);
  }
});

test("every auth redirect target is a generated application route", async () => {
  const routeTree = await readFile(new URL("routeTree.gen.ts", src), "utf8");
  for (const path of AUTH_REDIRECT_PATHS) {
    assert.match(routeTree, new RegExp(`path: '${path}'`), `${path} is not a route`);
  }
});

test("sign-in page builds every Supabase redirect from the current origin", async () => {
  const auth = await readFile(new URL("routes/auth.tsx", src), "utf8");
  const calls = auth.match(/(?:emailRedirectTo|redirectTo):\s*[^)\n]*\)?/g) ?? [];
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call, /authRedirectUrl\("\/[a-z-]+", window\.location\.origin\)/);
  }
});

test("source never hardcodes a deployment hostname", async () => {
  for (const file of await sourceFiles()) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /[a-z0-9-]+\.vercel\.app/i, `${file.pathname} hardcodes a host`);
  }
});
