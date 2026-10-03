import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

export const QA_USER_ID = "11111111-1111-4111-8111-111111111111";
export const QA_EMAIL = "judge@example.test";
export const QA_PASSWORD = "qa-password-123";
export const TRACKING_TABLES = [
  "cycles",
  "symptoms",
  "moods",
  "medications",
  "medication_logs",
  "pcos_logs",
  "fertility_logs",
  "pregnancy_logs",
  "water_logs",
  "sleep_logs",
  "nutrition_logs",
  "exercise_logs",
  "appointments",
  "reminders",
  "reports",
  "weight_history",
  "health_notes",
  "notifications",
  "ai_chat_history",
];

/** Loopback-only, synthetic QA service. This is not Supabase or a deployed RLS test. */
export async function startMockServices(port = 0) {
  const tables = new Map(TRACKING_TABLES.map((table) => [table, []]));
  tables.set("profiles", []);
  const users = new Map();
  const tokens = new Map();
  const state = {
    tables,
    users,
    tokens,
    failures: new Map(),
    confirmationRequired: false,
    providerUnavailable: false,
  };
  function addUser(id, email, name = "Fictional QA Judge") {
    const user = {
      id,
      email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "email" },
      user_metadata: { full_name: name },
      created_at: new Date().toISOString(),
    };
    users.set(email, user);
    tables.get("profiles").push({
      id,
      display_name: name,
      mode: "cycle",
      avg_cycle_length: 28,
      avg_period_length: 5,
      units: "metric",
      theme: "system",
      has_pcos: false,
      onboarded: true,
      avatar_url: null,
      last_period_start: null,
      height_cm: null,
      weight_kg: null,
      pregnancy_due_date: null,
    });
    return user;
  }
  addUser(QA_USER_ID, QA_EMAIL);
  function session(user) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp, iat: exp - 3600, aud: "authenticated", role: "authenticated" })}.cWEtdGVzdC1vbmx5`;
    tokens.set(token, user);
    return {
      access_token: token,
      refresh_token: `qa-refresh-${user.id}`,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      user,
    };
  }
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range");
    const send = (data, status = 200) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(data === undefined ? undefined : JSON.stringify(data));
    };
    const fail = (message, status = 400, code = "QA_ERROR") =>
      send({ message, error: message, code }, status);
    if (req.method === "OPTIONS") return send(undefined, 204);
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (text.length > 1_000_000) throw new Error("QA body limit");
      }
      const body = text ? JSON.parse(text) : {};
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      const user = tokens.get(token);
      if (url.pathname === "/__qa/control" && req.method === "POST") {
        if (body.failTable) state.failures.set(body.failTable, body.count ?? 1);
        if (typeof body.providerUnavailable === "boolean")
          state.providerUnavailable = body.providerUnavailable;
        if (typeof body.confirmationRequired === "boolean")
          state.confirmationRequired = body.confirmationRequired;
        return send({ ok: true });
      }
      if (url.pathname === "/__qa/counts")
        return send(Object.fromEntries([...tables].map(([name, rows]) => [name, rows.length])));
      if (url.pathname === "/auth/v1/token") {
        const candidate =
          url.searchParams.get("grant_type") === "refresh_token"
            ? [...users.values()].find((u) => body.refresh_token === `qa-refresh-${u.id}`)
            : users.get(body.email);
        if (
          !candidate ||
          (url.searchParams.get("grant_type") === "password" && body.password !== QA_PASSWORD)
        )
          return fail("Invalid login credentials", 400, "invalid_credentials");
        return send(session(candidate));
      }
      if (url.pathname === "/auth/v1/signup") {
        if (
          typeof body.email !== "string" ||
          !body.email.endsWith("@example.test") ||
          body.password?.length < 8
        )
          return fail(
            "Use synthetic example.test accounts and a password of at least 8 characters",
          );
        const candidate =
          users.get(body.email) ?? addUser(randomUUID(), body.email, body.data?.full_name);
        return send(state.confirmationRequired ? candidate : session(candidate));
      }
      if (url.pathname === "/auth/v1/user") {
        if (!user || !users.has(user.email))
          return fail("Session no longer exists", 401, "session_not_found");
        if (req.method === "PUT") Object.assign(user.user_metadata, body.data ?? {});
        return send(user);
      }
      if (url.pathname === "/auth/v1/logout") {
        tokens.delete(token);
        return send(undefined, 204);
      }
      if (url.pathname === "/auth/v1/recover") return send({});
      if (url.pathname === "/auth/v1/.well-known/jwks.json") return send({ keys: [] });
      if (!user) return fail("Authentication required", 401, "unauthorized");
      if (url.pathname === "/rest/v1/rpc/consume_ai_request") return send(true);
      if (!url.pathname.startsWith("/rest/v1/")) return fail("Mock endpoint unavailable", 404);
      const table = url.pathname.slice("/rest/v1/".length);
      if (!tables.has(table)) return fail("Unknown table", 404);
      const remaining = state.failures.get(table) ?? 0;
      if (remaining > 0) {
        state.failures.set(table, remaining - 1);
        return fail("Synthetic QA service unavailable", 503);
      }
      const owns = (row) => (table === "profiles" ? row.id === user.id : row.user_id === user.id);
      const matches = (row) =>
        [...url.searchParams].every(([key, value]) => {
          if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) return true;
          const dot = value.indexOf(".");
          const op = value.slice(0, dot),
            expected = value.slice(dot + 1);
          if (op === "eq") return String(row[key]) === expected;
          if (op === "gte") return String(row[key]) >= expected;
          if (op === "lte") return String(row[key]) <= expected;
          return true;
        });
      let rows = tables.get(table);
      if (req.method === "POST") {
        const values = Array.isArray(body) ? body : [body];
        if (values.some((row) => !owns(row))) return fail("Synthetic RLS rejected ownership", 403);
        const inserted = values.map((row) => ({
          id: randomUUID(),
          created_at: new Date().toISOString(),
          ...row,
        }));
        const upsert = req.headers.prefer?.includes("resolution=merge-duplicates");
        for (const row of inserted) {
          const index = rows.findIndex((old) => old.id === row.id);
          if (index >= 0 && upsert) {
            if (!owns(rows[index])) return fail("Synthetic RLS rejected ownership", 403);
            rows[index] = { ...rows[index], ...row };
          } else rows.push(row);
        }
        return send(
          req.headers.prefer?.includes("return=representation") ? inserted : undefined,
          201,
        );
      }
      const selected = rows.filter((row) => owns(row) && matches(row));
      if (req.method === "PATCH") {
        if ("user_id" in body && body.user_id !== user.id)
          return fail("Synthetic RLS rejected ownership", 403);
        for (const row of selected) Object.assign(row, body);
        return send(
          req.headers.prefer?.includes("return=representation") ? selected : undefined,
          204,
        );
      }
      if (req.method === "DELETE") {
        tables.set(
          table,
          rows.filter((row) => !selected.includes(row)),
        );
        return send(undefined, 204);
      }
      let sorted = [...selected];
      if (url.searchParams.has("order")) {
        const orders = url.searchParams.get("order").split(",");
        sorted.sort((a, b) => {
          for (const order of orders) {
            const [key, direction] = order.split(".");
            const compare = String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
            if (compare) return direction === "desc" ? -compare : compare;
          }
          return 0;
        });
      }
      const from = Number(url.searchParams.get("offset") ?? 0),
        limit = Number(url.searchParams.get("limit") ?? sorted.length);
      sorted = sorted.slice(from, from + limit);
      const columns = url.searchParams.get("select");
      if (columns && columns !== "*")
        sorted = sorted.map((row) =>
          Object.fromEntries(columns.split(",").map((key) => [key, row[key] ?? null])),
        );
      res.setHeader(
        "Content-Range",
        `${from}-${Math.max(from, from + sorted.length - 1)}/${selected.length}`,
      );
      if (req.headers.accept?.includes("application/vnd.pgrst.object+json")) {
        if (sorted.length !== 1)
          return fail("JSON object requested, multiple (or no) rows returned", 406, "PGRST116");
        return send(sorted[0]);
      }
      return send(sorted);
    } catch {
      return fail("Synthetic QA request failed", 500);
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    state,
    baseUrl,
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Deterministic Gemini-shaped responses; no provider network request is made. */
export function installMockProvider(state) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://generativelanguage.googleapis.com/")) {
      if (state.providerUnavailable)
        return new Response("Synthetic provider unavailable", { status: 503 });
      const body = JSON.parse(init.body);
      const question =
        [...body.messages].reverse().find((message) => message.role === "user")?.content ?? "";
      const hasResult = body.messages.at(-1)?.role === "tool";
      if (body.tools?.length && !hasResult && /my|tracked|log/i.test(question)) {
        const name = /summary|summari/i.test(question)
          ? "get_tracking_summary"
          : /symptom/i.test(question)
            ? "get_symptom_history"
            : /cycle/i.test(question)
              ? "get_cycle_history"
              : "get_mood_history";
        return Response.json({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  { id: "qa-call", type: "function", function: { name, arguments: "{}" } },
                ],
              },
            },
          ],
        });
      }
      return Response.json({
        choices: [
          {
            message: {
              content: hasResult
                ? "Mock QA answer: the internal MCP lookup completed. This uses synthetic test data only.\n\n*Educational information only; consult a qualified clinician.*"
                : "Mock QA general educational response. No health records were accessed.\n\n*Educational information only; consult a qualified clinician.*",
            },
          },
        ],
      });
    }
    if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url))
      throw new Error("External requests are disabled in local mock QA");
    return original(input, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}
