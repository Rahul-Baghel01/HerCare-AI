import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { transpileModule, ModuleKind } from "typescript";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import { errorMetadata } from "../src/lib/error-metadata.ts";
import { deleteAccountData } from "../src/lib/account-deletion.server.ts";
import { average, pregnancyProgress } from "../src/lib/stats.ts";
import {
  startMockServices,
  QA_USER_ID,
  QA_EMAIL,
  QA_PASSWORD,
  TRACKING_TABLES,
} from "./fixtures/mock-services.mjs";

let moduleSequence = 0;

async function loadTs(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    assert.ok(source.includes(from), `Missing test seam in ${path}`);
    source = source.replace(from, to);
  }
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext, target: 9 },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#qa-${++moduleSequence}`
  );
}
async function dataModule(supabase, user) {
  globalThis.__releaseData = {
    supabase,
    user,
    toast: { success() {}, error() {} },
    cache: { invalidateQueries() {} },
  };
  return loadTs("../src/lib/data.ts", {
    'import { format } from "date-fns";': 'const format = () => "2026-10-03";',
    'import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";':
      "const useMutation = options => options; const useQuery = () => ({data:globalThis.__releaseData.user}); const useQueryClient = () => globalThis.__releaseData.cache;",
    'import { supabase } from "@/integrations/supabase/client";':
      "const supabase = globalThis.__releaseData.supabase;",
    'import { toast } from "sonner";': "const toast = globalThis.__releaseData.toast;",
  });
}

test("error metadata excludes messages, causes, tokens and health fields", async () => {
  const error = new Error("PRIVATE_TOKEN and PRIVATE_HEALTH", {
    cause: new Error("PRIVATE_CAUSE"),
  });
  error.status = 503;
  assert.deepEqual(errorMetadata(error), { name: "Error", status: 503 });
  error.name = "PRIVATE_NAME";
  assert.equal(errorMetadata(error).name, "Error");
  const output = [];
  const original = console.error;
  console.error = (value) => output.push(value);
  try {
    const { logServerError } = await import("../src/lib/logger.server.ts");
    logServerError("qa.failure", error, {
      userId: "PRIVATE_USER",
      journal: "PRIVATE_HEALTH",
      apiKey: "PRIVATE_TOKEN",
      durationMs: 12,
    });
    const entry = JSON.parse(output[0]);
    assert.equal(entry.durationMs, 12);
    assert.deepEqual(entry.error, { name: "Error", status: 503 });
    assert.doesNotMatch(output[0], /PRIVATE_/);
    const { describeError } = await import("../src/lib/error-capture.ts");
    assert.doesNotMatch(describeError(error), /PRIVATE_|stack|cause/);
    console.error(error);
    assert.doesNotMatch(output.at(-1), /PRIVATE_/);
  } finally {
    console.error = original;
  }
});

test("account deletion removes only the verified owner's avatar files before deleting Auth", async () => {
  let files = Array.from({ length: 125 }, (_, i) => ({ id: `file-${i}`, name: `avatar-${i}.png` }));
  const events = [];
  const admin = {
    storage: {
      from(bucket) {
        assert.equal(bucket, "avatars");
        return {
          async list(prefix, options) {
            assert.equal(prefix, QA_USER_ID);
            assert.equal(options.offset, 0);
            return { data: files.slice(0, 100), error: null };
          },
          async remove(paths) {
            assert.ok(paths.every((path) => path.startsWith(`${QA_USER_ID}/`)));
            events.push("storage");
            files = files.filter((file) => !paths.includes(`${QA_USER_ID}/${file.name}`));
            return { error: null };
          },
        };
      },
    },
    auth: {
      admin: {
        async deleteUser(id) {
          assert.equal(id, QA_USER_ID);
          assert.equal(files.length, 0);
          events.push("auth");
          return { error: null };
        },
      },
    },
  };
  await deleteAccountData(admin, QA_USER_ID);
  assert.deepEqual(events, ["storage", "storage", "auth"]);
});

test("account deletion fails closed on storage failures and unexpected paths", async () => {
  for (const result of [
    { data: null, error: { message: "private storage error" } },
    { data: [{ id: "file", name: "../other-user.png" }], error: null },
    { data: [{ id: null, name: "folder" }], error: null },
  ]) {
    let deleted = false;
    const admin = {
      storage: {
        from() {
          return {
            async list() {
              return result;
            },
            async remove() {
              throw new Error("Must not remove");
            },
          };
        },
      },
      auth: {
        admin: {
          async deleteUser() {
            deleted = true;
          },
        },
      },
    };
    await assert.rejects(deleteAccountData(admin, QA_USER_ID), /could not be deleted/);
    assert.equal(deleted, false);
  }
  await assert.rejects(deleteAccountData({}, "../other-user"), /could not be deleted/);
});

test("gestational age uses completed weeks and finite measurements", () => {
  assert.equal(pregnancyProgress("2026-10-03", new Date(2026, 9, 3, 12)).week, 40);
  assert.equal(pregnancyProgress("2026-10-03", new Date(2026, 8, 26, 12)).week, 39);
  assert.equal(pregnancyProgress("2026-10-03", new Date(2026, 9, 4, 12)).day, 1);
  assert.equal(average([Infinity, NaN, null, 4, 2]), 3);
  assert.equal(average([Infinity, -Infinity]), null);
});

test("client mutation helpers reject signed-out users and always scope update/delete ownership", async () => {
  const operations = [];
  const supabase = {
    from(table) {
      const op = { table, filters: [] };
      operations.push(op);
      const builder = {
        delete() {
          op.method = "delete";
          return builder;
        },
        update(values) {
          op.method = "update";
          op.values = values;
          return builder;
        },
        eq(key, value) {
          op.filters.push([key, value]);
          return builder;
        },
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
  const signedIn = await dataModule(supabase, { id: QA_USER_ID });
  await signedIn.useDeleteRow("symptoms").mutationFn("row");
  await signedIn
    .useUpdateRow("appointments")
    .mutationFn({ id: "row", values: { title: "Fictional QA visit", user_id: "other-user" } });
  assert.ok(
    operations.every((op) =>
      op.filters.some(([key, value]) => key === "user_id" && value === QA_USER_ID),
    ),
  );
  assert.equal(operations[1].values.user_id, QA_USER_ID);
  const signedOut = await dataModule(supabase, null);
  await assert.rejects(signedOut.useDeleteRow("symptoms").mutationFn("row"), /signed in/);
  await assert.rejects(
    signedOut.useUpdateRow("appointments").mutationFn({ id: "row", values: {} }),
    /signed in/,
  );
  delete globalThis.__releaseData;
});

test("local mock HTTP service exercises SDK auth, session recovery and all tracking table CRUD", async () => {
  const fixture = await startMockServices();
  try {
    const client = createClient(fixture.baseUrl, "sb_publishable_local_mock_qa", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const failed = await client.auth.signInWithPassword({
      email: QA_EMAIL,
      password: "wrong-synthetic-password",
    });
    assert.ok(failed.error);
    const signedIn = await client.auth.signInWithPassword({
      email: QA_EMAIL,
      password: QA_PASSWORD,
    });
    assert.equal(signedIn.error, null);
    assert.equal((await client.auth.getUser()).data.user.id, QA_USER_ID);
    const restored = createClient(fixture.baseUrl, "sb_publishable_local_mock_qa", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal((await restored.auth.setSession(signedIn.data.session)).data.user.id, QA_USER_ID);
    for (const table of TRACKING_TABLES) {
      const id = crypto.randomUUID();
      assert.equal(
        (
          await client.from(table).insert({
            id,
            user_id: QA_USER_ID,
            log_date: "2026-10-03",
            notes: "Fictional demo QA record",
          })
        ).error,
        null,
        table,
      );
      assert.equal((await client.from(table).select("*").eq("id", id)).data.length, 1, table);
      assert.equal(
        (
          await client
            .from(table)
            .update({ notes: "Fictional demo QA record updated" })
            .eq("id", id)
        ).error,
        null,
        table,
      );
      assert.equal(
        (await client.from(table).select("notes").eq("id", id)).data[0].notes,
        "Fictional demo QA record updated",
        table,
      );
      assert.equal((await client.from(table).delete().eq("id", id)).error, null, table);
    }
    assert.ok(
      (await client.from("moods").insert({ user_id: "other-user", mood: "private" })).error,
    );
    assert.equal((await client.auth.signOut()).error, null);
    assert.ok((await client.auth.getUser()).error);
    const signup = await client.auth.signUp({
      email: "new-judge@example.test",
      password: QA_PASSWORD,
      options: { data: { full_name: "Fictional QA Signup" } },
    });
    assert.equal(signup.error, null);
    assert.ok(signup.data.user);
  } finally {
    await fixture.close();
  }
});

test("JSON export paginates, contains all 19 tables, and refuses incomplete output", async () => {
  const fixture = await startMockServices();
  try {
    const client = createClient(fixture.baseUrl, "sb_publishable_local_mock_qa", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await client.auth.signInWithPassword({ email: QA_EMAIL, password: QA_PASSWORD });
    fixture.state.tables.set(
      "moods",
      Array.from({ length: 1005 }, (_, index) => ({
        id: String(index).padStart(4, "0"),
        user_id: QA_USER_ID,
        log_date: "2026-10-03",
        mood: "Fictional QA",
      })),
    );
    const { exportAllData } = await dataModule(client, { id: QA_USER_ID });
    const exported = await exportAllData(QA_USER_ID);
    assert.equal(exported.moods.length, 1005);
    assert.equal(exported.profile.id, QA_USER_ID);
    for (const table of TRACKING_TABLES) assert.ok(Array.isArray(exported[table]), table);
    fixture.state.failures.set("symptoms", 100);
    await assert.rejects(exportAllData(QA_USER_ID), /no incomplete file/);
  } finally {
    delete globalThis.__releaseData;
    await fixture.close();
  }
});

test("PDF export renders real multi-page output and matching metrics without overflow", async () => {
  await mkdir(new URL("../.release-qa/", import.meta.url), { recursive: true });
  let pdf;
  globalThis.__releasePdf = function (options) {
    pdf = new jsPDF(options);
    pdf.save = () => {};
    return pdf;
  };
  try {
    const { downloadHealthReport } = await loadTs("../src/lib/report.ts", {
      'const { default: jsPDF } = await import("jspdf");': "const jsPDF = globalThis.__releasePdf;",
    });
    const file = await downloadHealthReport({
      name: "Fictional QA Judge",
      rangeStart: "2026-07-06",
      rangeEnd: "2026-10-03",
      stats: [{ label: "Energy", value: "4/5" }],
      insights: Array.from(
        { length: 120 },
        (_, i) => `Fictional QA insight ${i + 1}: logged records describe observations only.`,
      ),
      coverage: ["Fictional demo QA records; not actual health observations."],
      symptoms: [{ name: "Fatigue", severity: 3, count: 1 }],
    });
    assert.equal(file, "hercare-report-2026-10-03.pdf");
    assert.ok(pdf.getNumberOfPages() >= 3);
    const stream = pdf.internal.pages.flat().join("\n");
    assert.match(stream, /Energy: 4\/5/);
    assert.match(stream, /educational information only/);
    await writeFile(
      new URL("../.release-qa/report-verification.pdf", import.meta.url),
      Buffer.from(pdf.output("arraybuffer")),
    );
  } finally {
    delete globalThis.__releasePdf;
  }
});

test("server authentication rejects missing, malformed and revoked users", async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  let called = 0;
  globalThis.__authQA = {
    request: { headers: new Headers() },
    client: {
      auth: { getUser: async () => ({ data: { user: null }, error: { name: "AuthApiError" } }) },
    },
  };
  try {
    const module = await loadTs("../src/integrations/supabase/auth-middleware.ts", {
      'import { createMiddleware } from "@tanstack/react-start";':
        "const createMiddleware = () => ({server: fn => fn});",
      'import { getRequest } from "@tanstack/react-start/server";':
        "const getRequest = () => globalThis.__authQA.request;",
      'import { createClient } from "@supabase/supabase-js";':
        "const createClient = () => globalThis.__authQA.client;",
      'import { createSupabaseFetch } from "./fetch";':
        "const createSupabaseFetch = () => globalThis.fetch;",
    });
    const next = async ({ context }) => {
      called++;
      return context;
    };
    await assert.rejects(module.requireSupabaseAuth({ next }), /No authorization/);
    globalThis.__authQA.request.headers.set("authorization", "Bearer malformed");
    await assert.rejects(module.requireSupabaseAuth({ next }), /Invalid token/);
    globalThis.__authQA.request.headers.set("authorization", "Bearer fictional.revoked.token");
    await assert.rejects(module.requireSupabaseAuth({ next }), /session could not be verified/);
    assert.equal(called, 0);
    globalThis.__authQA.client.auth.getUser = async () => ({
      data: { user: { id: QA_USER_ID } },
      error: null,
    });
    const result = await module.requireSupabaseAuth({ next });
    assert.equal(result.userId, QA_USER_ID);
    assert.equal(called, 1);
    globalThis.__authQA.client.auth.getUser = async () => ({
      data: null,
      error: { name: "AuthRetryableFetchError" },
    });
    await assert.rejects(
      module.requireSupabaseAuth({ next }),
      /authentication service could not be reached/,
    );
  } finally {
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previous.key;
    delete globalThis.__authQA;
  }
});

test("sign-in redirect verifies the current user and ignores revoked or unmounted sessions", async () => {
  const { createSourceFile, ScriptTarget, forEachChild } = await import("typescript");
  const source = await readFile(new URL("../src/routes/auth.tsx", import.meta.url), "utf8");
  const tree = createSourceFile("auth.tsx", source, ScriptTarget.Latest, true);
  let effect;
  function visit(node) {
    if (node.expression?.getText(tree) === "useEffect" && node.arguments?.[0])
      effect ??= node.arguments[0].getText(tree);
    forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(effect, "Actual auth session effect must be present");
  const compiled = transpileModule(
    "const {supabase,navigate,setAuthError} = globalThis.__sessionQA; export const effect = " +
      effect,
    { compilerOptions: { module: ModuleKind.ESNext, target: 9 } },
  ).outputText;
  async function run(getUser, unmount = false) {
    const navigations = [];
    globalThis.__sessionQA = {
      supabase: {
        auth: {
          getUser,
          getSession() {
            throw new Error("Cached session must not authorize redirect");
          },
        },
      },
      navigate: (options) => navigations.push(options),
      setAuthError() {},
    };
    const module = await import(
      `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#qa-${++moduleSequence}`
    );
    const cleanup = module.effect();
    if (unmount) cleanup();
    await new Promise((resolve) => setImmediate(resolve));
    cleanup();
    return navigations;
  }
  try {
    assert.deepEqual(
      await run(async () => ({ data: { user: null }, error: { name: "AuthApiError" } })),
      [],
    );
    assert.deepEqual(await run(async () => ({ data: { user: { id: QA_USER_ID } }, error: null })), [
      { to: "/dashboard", replace: true },
    ]);
    assert.deepEqual(
      await run(async () => ({ data: { user: { id: QA_USER_ID } }, error: null }), true),
      [],
    );
    assert.deepEqual(
      await run(async () => {
        throw new Error("Synthetic auth outage");
      }),
      [],
    );
  } finally {
    delete globalThis.__sessionQA;
  }
});
