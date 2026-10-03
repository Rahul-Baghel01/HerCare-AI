import test from "node:test";
import assert from "node:assert/strict";
import { format } from "date-fns";
import { connectHealthMcp, McpConnectionError } from "../src/lib/health-mcp.server.ts";
import { runAssistantWithMcp } from "../src/lib/assistant-mcp.server.ts";
import { createMcpObserver } from "../src/lib/mcp-observability.server.ts";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const DATE = format(new Date(), "yyyy-MM-dd");
const quiet = () => {};

test("MCP observability keeps only allowlisted metadata", () => {
  const events = [];
  const observer = createMcpObserver((event) => events.push(event));
  observer.emit("tool_selected", {
    toolName: "Bearer private-token",
    reason: "private journal text",
    journal: "private journal text",
    password: "password-value",
    apiKey: "API_TEST_SECRET",
    toolCallCount: 1,
  });
  assert.equal(events[0].toolName, "unavailable_tool");
  assert.equal(events[0].reason, undefined);
  assert.equal(events[0].toolCallCount, 1);
  assert.doesNotMatch(
    JSON.stringify(events),
    /private-token|journal text|password-value|API_TEST_SECRET/,
  );
});

function fakeSupabase(rows = {}, failTable, tokenUserId) {
  const queries = [];
  let remainingFailures = typeof failTable === "object" ? failTable.remaining : 0;
  const supabase = {
    from(table) {
      const query = { table, filters: [], limitValue: null, signal: null };
      queries.push(query);
      const builder = {
        select(columns) {
          query.columns = columns;
          return builder;
        },
        eq(column, value) {
          query.filters.push(["eq", column, value]);
          return builder;
        },
        gte(column, value) {
          query.filters.push(["gte", column, value]);
          return builder;
        },
        lte(column, value) {
          query.filters.push(["lte", column, value]);
          return builder;
        },
        order() {
          return builder;
        },
        limit(value) {
          query.limitValue = value;
          return builder;
        },
        maybeSingle() {
          query.single = true;
          return builder;
        },
        abortSignal(signal) {
          query.signal = signal;
          return builder;
        },
        then(resolve, reject) {
          const data = (rows[table] ?? []).filter(
            (row) =>
              (!tokenUserId || row.user_id === tokenUserId) &&
              query.filters.every(([op, key, value]) =>
                op === "eq"
                  ? row[key] === value
                  : op === "gte"
                    ? row[key] >= value
                    : row[key] <= value,
              ),
          );
          const fails =
            failTable === table ||
            (typeof failTable === "object" && failTable.table === table && remainingFailures-- > 0);
          return Promise.resolve(
            fails
              ? {
                  data: null,
                  error: { message: "private database failure" },
                  status: typeof failTable === "object" ? failTable.status : 400,
                }
              : {
                  data: query.single
                    ? (data[0] ?? null)
                    : data.slice(0, query.limitValue ?? data.length),
                  error: null,
                  status: 200,
                },
          ).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { supabase, queries };
}

const rows = {
  profiles: [
    { id: ALICE, mode: "cycle", avg_cycle_length: 28, has_pcos: false },
    { id: BOB, mode: "cycle", avg_cycle_length: 35, has_pcos: true },
  ],
  cycles: [
    { user_id: ALICE, start_date: DATE, end_date: null, flow_intensity: "light" },
    { user_id: BOB, start_date: DATE, end_date: null, flow_intensity: "heavy" },
  ],
  symptoms: [
    {
      user_id: ALICE,
      log_date: DATE,
      name: "Cramps",
      severity: 2,
      notes: "Fictional demo QA record",
    },
    { user_id: BOB, log_date: DATE, name: "Private symptom", severity: 5, notes: "private" },
  ],
  moods: [
    {
      user_id: ALICE,
      log_date: DATE,
      mood: "calm",
      energy_level: 4,
      stress_level: 2,
      journal: null,
    },
    {
      user_id: BOB,
      log_date: DATE,
      mood: "private",
      energy_level: 1,
      stress_level: 5,
      journal: "private",
    },
  ],
};

function readResult(result) {
  assert.equal(result.isError, undefined);
  return JSON.parse(result.content.find((part) => part.type === "text").text);
}

test("MCP initializes, discovers four registered tools and executes each over the protocol", async () => {
  const db = fakeSupabase(rows);
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    assert.equal(session.client.getServerVersion().name, "hercare-health-records");
    assert.deepEqual(session.tools.map((tool) => tool.name).sort(), [
      "get_cycle_history",
      "get_mood_history",
      "get_symptom_history",
      "get_tracking_summary",
    ]);
    assert.ok(session.tools.every((tool) => tool.annotations?.readOnlyHint === true));
    for (const tool of session.tools) {
      const value = readResult(
        await session.client.callTool({ name: tool.name, arguments: { days: 1 } }),
      );
      assert.equal(value.rangeEnd, DATE);
      assert.equal(value.rangeStart, DATE);
      if (value.records) {
        assert.equal(value.count, 1);
        assert.doesNotMatch(JSON.stringify(value), /Private symptom|private|heavy/);
      } else {
        assert.deepEqual(value.counts, { Cycles: 1, Symptoms: 1, Moods: 1 });
        assert.match(value.coverage.join(" "), /fictional demo/i);
      }
    }
    assert.ok(
      db.queries.every((query) =>
        query.filters.some(
          ([op, key, value]) => op === "eq" && key === "user_id" && value === ALICE,
        ),
      ),
    );
    assert.ok(db.queries.every((query) => query.limitValue === 200 && query.signal));
  } finally {
    await session.close();
  }
});

test("MCP rejects invalid arguments and caller-supplied user IDs", async () => {
  const db = fakeSupabase(rows);
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    for (const args of [{ days: 91 }, { days: "90" }, { days: 1, user_id: BOB }]) {
      const result = await session.client.callTool({ name: "get_cycle_history", arguments: args });
      assert.equal(result.isError, true);
    }
    assert.equal(db.queries.length, 0);
  } finally {
    await session.close();
  }
});

test("tracking summary reads only requested profile fields and keeps them user-scoped", async () => {
  const db = fakeSupabase(rows);
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    const plain = readResult(
      await session.client.callTool({ name: "get_tracking_summary", arguments: {} }),
    );
    assert.equal("profile" in plain, false);
    assert.equal(db.queries.filter((query) => query.table === "profiles").length, 0);
    const expanded = readResult(
      await session.client.callTool({
        name: "get_tracking_summary",
        arguments: { profileFields: ["avg_cycle_length"] },
      }),
    );
    assert.equal(expanded.profile.avg_cycle_length, 28);
    const profileQuery = db.queries.find((query) => query.table === "profiles");
    assert.equal(profileQuery.filters[0][2], ALICE);
    assert.equal(profileQuery.columns, "avg_cycle_length");
  } finally {
    await session.close();
  }
});

test("a mismatched user filter still cannot bypass the simulated token RLS boundary", async () => {
  const db = fakeSupabase(rows, undefined, ALICE);
  const session = await connectHealthMcp({ userId: BOB, supabase: db.supabase });
  try {
    const result = readResult(
      await session.client.callTool({ name: "get_cycle_history", arguments: { days: 1 } }),
    );
    assert.deepEqual(result.records, []);
    assert.equal(result.count, 0);
  } finally {
    await session.close();
  }
});

test("MCP refuses unauthenticated context and returns empty history without invented data", async () => {
  const db = fakeSupabase();
  await assert.rejects(connectHealthMcp({ userId: "", supabase: db.supabase }), /Authenticated/);
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    const history = readResult(
      await session.client.callTool({ name: "get_mood_history", arguments: {} }),
    );
    assert.deepEqual(history.records, []);
    const summary = readResult(
      await session.client.callTool({ name: "get_tracking_summary", arguments: {} }),
    );
    assert.match(summary.coverage.join(" "), /No tracked records/);
    assert.deepEqual(summary.counts, { Cycles: 0, Symptoms: 0, Moods: 0 });
  } finally {
    await session.close();
  }
});

test("MCP reports database failures without exposing raw database messages", async () => {
  const db = fakeSupabase(rows, "symptoms");
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    for (const name of ["get_symptom_history", "get_tracking_summary"]) {
      const result = await session.client.callTool({ name, arguments: {} });
      assert.equal(result.isError, true);
      assert.doesNotMatch(JSON.stringify(result), /private database failure/);
    }
  } finally {
    await session.close();
  }
});

test("assistant only marks health records accessed after a real successful tool call", async () => {
  const db = fakeSupabase(rows);
  const requests = [];
  const events = [];
  const complete = async (messages, tools) => {
    requests.push({ messages, tools });
    if (requests.length === 1)
      return {
        content: null,
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "get_mood_history", arguments: '{"days":1}' },
          },
        ],
      };
    assert.equal(messages.at(-1).role, "tool");
    assert.match(messages.at(-1).content, /"mood":"calm"/);
    assert.doesNotMatch(messages.at(-1).content, /"mood":"private"/);
    return { content: "Your logged mood was calm. *Educational information only.*", toolCalls: [] };
  };
  const result = await runAssistantWithMcp({
    auth: { userId: ALICE, supabase: db.supabase },
    messages: [{ role: "user", content: "What mood did I log today?" }],
    complete,
    observe: (event) => events.push(event),
  });
  assert.deepEqual(result.accessedTools, ["get_mood_history"]);
  assert.equal(result.usedMcpContext, true);
  assert.equal(result.personalRecordsAccessed, true);
  assert.equal(result.toolCallCount, 1);
  assert.equal(requests[0].tools.length, 4);
  assert.match(result.coverage.join(" "), /Mood history: 1 records found/);
  assert.deepEqual(
    events.map((event) => event.phase),
    [
      "request_started",
      "server_initialized",
      "tools_discovered",
      "tool_selected",
      "tool_execution_started",
      "tool_execution_completed",
      "final_response_generated",
      "connection_closed",
    ],
  );
  assert.ok(events.every((event) => event.requestId === events[0].requestId));
  assert.ok(events.every((event) => !JSON.stringify(event).includes("calm")));
});

test("general answer avoids record lookup, and AI provider failure does not claim one", async () => {
  const db = fakeSupabase(rows);
  const auth = { userId: ALICE, supabase: db.supabase };
  const messages = [{ role: "user", content: "What is a menstrual cycle?" }];
  const general = await runAssistantWithMcp({
    auth,
    messages,
    complete: async () => ({ content: "A general educational answer.", toolCalls: [] }),
    observe: quiet,
  });
  assert.deepEqual(general.accessedTools, []);
  assert.equal(general.usedMcpContext, false);
  assert.equal(general.personalRecordsAccessed, false);
  assert.match(general.coverage[0], /No health records/);
  assert.equal(db.queries.length, 0);
  await assert.rejects(
    runAssistantWithMcp({
      auth,
      messages,
      complete: async () => {
        throw new Error("provider unavailable");
      },
      observe: quiet,
    }),
    /provider unavailable/,
  );
  assert.equal(db.queries.length, 0);
});

test("assistant recovers from a failed MCP tool without claiming record access", async () => {
  const db = fakeSupabase(rows, "symptoms");
  let round = 0;
  const answer = await runAssistantWithMcp({
    auth: { userId: ALICE, supabase: db.supabase },
    messages: [{ role: "user", content: "What symptoms did I log?" }],
    complete: async (messages) => {
      round += 1;
      if (round === 1)
        return {
          content: null,
          toolCalls: [
            {
              id: "failed-call",
              type: "function",
              function: { name: "get_symptom_history", arguments: "{}" },
            },
          ],
        };
      assert.match(messages.at(-1).content, /could not be loaded/);
      return { content: "I couldn't load your symptom history. Please retry.", toolCalls: [] };
    },
    observe: quiet,
  });
  assert.deepEqual(answer.accessedTools, []);
  assert.match(answer.coverage.join(" "), /could not be loaded/);
});

test("assistant caps tool rounds and observes caller cancellation", async () => {
  const db = fakeSupabase(rows);
  const abort = new AbortController();
  const events = [];
  let round = 0;
  await assert.rejects(
    runAssistantWithMcp({
      auth: { userId: ALICE, supabase: db.supabase },
      messages: [{ role: "user", content: "Review my log." }],
      signal: abort.signal,
      complete: async (_messages, tools, signal) => {
        assert.equal(signal.aborted, false);
        round += 1;
        if (round === 3) {
          assert.equal(tools.length, 0);
          abort.abort();
          assert.equal(signal.aborted, true);
        }
        return {
          content: null,
          toolCalls: [
            {
              id: `round-${round}`,
              type: "function",
              function: { name: "get_cycle_history", arguments: "{}" },
            },
          ],
        };
      },
      observe: (event) => events.push(event),
    }),
    /cancelled or timed out/,
  );
  assert.equal(round, 3);
  assert.equal(db.queries.length, 1);
  assert.equal(events.find((event) => event.phase === "request_failed").reason, "cancelled");
  assert.equal(events.at(-1).phase, "connection_closed");
});

test("initialization and discovery failures emit safe lifecycle states", async () => {
  for (const stage of ["initialization", "discovery"]) {
    const events = [];
    let providerCalled = false;
    await assert.rejects(
      runAssistantWithMcp({
        auth: { userId: ALICE, supabase: fakeSupabase(rows).supabase },
        messages: [{ role: "user", content: "Private question text" }],
        complete: async () => {
          providerCalled = true;
          throw new Error("should not be called");
        },
        connect: async (_auth, _signal, onStage) => {
          if (stage === "discovery") onStage?.("server_initialized");
          throw new McpConnectionError(stage);
        },
        observe: (event) => events.push(event),
      }),
      /Health tools could not/,
    );
    assert.equal(providerCalled, false);
    assert.equal(events.find((event) => event.phase === "request_failed").reason, stage);
    assert.doesNotMatch(JSON.stringify(events), /Private question text/);
  }
});

test("tool timeout is recovered, reported without internal error text, and connection closes", async () => {
  const events = [];
  let closed = 0;
  let round = 0;
  const timeout = Object.assign(new Error("private SDK timeout details"), {
    code: "REQUEST_TIMEOUT",
  });
  const result = await runAssistantWithMcp({
    auth: { userId: ALICE, supabase: fakeSupabase(rows).supabase },
    messages: [{ role: "user", content: "What did I log?" }],
    connect: async (_auth, _signal, onStage) => {
      onStage?.("server_initialized");
      onStage?.("tools_discovered", 1);
      return {
        tools: [
          {
            name: "get_cycle_history",
            description: "Cycle history",
            inputSchema: { type: "object" },
          },
        ],
        client: {
          callTool: async () => {
            throw timeout;
          },
        },
        close: async () => {
          closed += 1;
        },
      };
    },
    complete: async (messages) => {
      round += 1;
      if (round === 1)
        return {
          content: null,
          toolCalls: [
            {
              id: "timeout-call",
              type: "function",
              function: { name: "get_cycle_history", arguments: "{}" },
            },
          ],
        };
      assert.doesNotMatch(messages.at(-1).content, /private SDK/);
      return { content: "I could not check your history. Please retry.", toolCalls: [] };
    },
    observe: (event) => events.push(event),
    toolTimeoutMs: 25,
  });
  assert.equal(closed, 1);
  assert.equal(result.usedMcpContext, false);
  assert.equal(events.find((event) => event.phase === "tool_execution_failed").reason, "timeout");
  assert.doesNotMatch(JSON.stringify(events), /private SDK timeout details/);
});

test("MCP protocol call times out against a delayed database response", async () => {
  const db = fakeSupabase(rows);
  const originalFrom = db.supabase.from;
  db.supabase.from = (table) => {
    const builder = originalFrom(table);
    const originalThen = builder.then;
    builder.then = (resolve, reject) => {
      setTimeout(() => originalThen(resolve, reject), 80);
    };
    return builder;
  };
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    await assert.rejects(
      session.client.callTool(
        { name: "get_cycle_history", arguments: { days: 1 } },
        { timeout: 15 },
      ),
      (error) => error.code === "REQUEST_TIMEOUT",
    );
  } finally {
    await session.close();
  }
});

test("caller cancellation stops an in-flight MCP lookup and closes the connection", async () => {
  const db = fakeSupabase(rows);
  const controller = new AbortController();
  let abortScheduled = false;
  const originalFrom = db.supabase.from;
  db.supabase.from = (table) => {
    const builder = originalFrom(table);
    const originalThen = builder.then;
    builder.then = (resolve, reject) => {
      if (!abortScheduled) {
        abortScheduled = true;
        setTimeout(() => controller.abort(), 20);
      }
      setTimeout(() => originalThen(resolve, reject), 80);
    };
    return builder;
  };
  const events = [];
  await assert.rejects(
    runAssistantWithMcp({
      auth: { userId: ALICE, supabase: db.supabase },
      messages: [{ role: "user", content: "Review my cycle." }],
      signal: controller.signal,
      complete: async () => ({
        content: null,
        toolCalls: [
          {
            id: "cancelled-call",
            type: "function",
            function: { name: "get_cycle_history", arguments: "{}" },
          },
        ],
      }),
      observe: (event) => events.push(event),
    }),
    /cancelled or timed out/,
  );
  assert.equal(events.find((event) => event.phase === "request_failed").reason, "cancelled");
  assert.equal(events.at(-1).phase, "connection_closed");
});

test("assistant enforces the two-round tool limit", async () => {
  const db = fakeSupabase(rows);
  let round = 0;
  const events = [];
  await assert.rejects(
    runAssistantWithMcp({
      auth: { userId: ALICE, supabase: db.supabase },
      messages: [{ role: "user", content: "Review my cycle." }],
      complete: async (_messages, tools) => {
        round += 1;
        if (round === 3) assert.equal(tools.length, 0);
        return {
          content: null,
          toolCalls: [
            {
              id: `call-${round}`,
              type: "function",
              function: { name: "get_cycle_history", arguments: "{}" },
            },
          ],
        };
      },
      observe: (event) => events.push(event),
    }),
    /too many health record lookups/,
  );
  assert.equal(round, 3);
  assert.equal(events.find((event) => event.phase === "request_failed").reason, "call_limit");
});

test("duplicate model tool calls reuse one MCP execution", async () => {
  const db = fakeSupabase(rows);
  const events = [];
  let round = 0;
  const result = await runAssistantWithMcp({
    auth: { userId: ALICE, supabase: db.supabase },
    messages: [{ role: "user", content: "Review my cycle." }],
    complete: async () => {
      round += 1;
      if (round === 1)
        return {
          content: null,
          toolCalls: [
            {
              id: "first",
              type: "function",
              function: { name: "get_cycle_history", arguments: "{}" },
            },
            {
              id: "second",
              type: "function",
              function: { name: "get_cycle_history", arguments: '{"days":90}' },
            },
          ],
        };
      return { content: "A context-aware answer.", toolCalls: [] };
    },
    observe: (event) => events.push(event),
  });
  assert.equal(db.queries.filter((query) => query.table === "cycles").length, 1);
  assert.equal(result.toolCallCount, 1);
  assert.deepEqual(result.accessedTools, ["get_cycle_history"]);
  assert.equal(events.filter((event) => event.phase === "tool_execution_skipped").length, 1);
});

test("only transient database failures retry; authorization failures do not", async () => {
  for (const [status, expectedQueries, expectedError] of [
    [503, 2, false],
    [401, 1, true],
  ]) {
    const db = fakeSupabase(rows, { table: "cycles", status, remaining: 1 });
    const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
    try {
      const result = await session.client.callTool({
        name: "get_cycle_history",
        arguments: { days: 1 },
      });
      assert.equal(Boolean(result.isError), expectedError);
      assert.equal(db.queries.length, expectedQueries);
    } finally {
      await session.close();
    }
  }
});

test("empty successful lookup informs the answer without claiming personal records", async () => {
  const db = fakeSupabase();
  let round = 0;
  const result = await runAssistantWithMcp({
    auth: { userId: ALICE, supabase: db.supabase },
    messages: [{ role: "user", content: "What did I log?" }],
    complete: async () => {
      round += 1;
      return round === 1
        ? {
            content: null,
            toolCalls: [
              {
                id: "empty",
                type: "function",
                function: { name: "get_mood_history", arguments: "{}" },
              },
            ],
          }
        : { content: "No moods were logged in this range.", toolCalls: [] };
    },
    observe: quiet,
  });
  assert.equal(result.usedMcpContext, true);
  assert.equal(result.personalRecordsAccessed, false);
  assert.deepEqual(result.accessedTools, ["get_mood_history"]);
});

test("tool results omit notes and journal content unless explicitly requested", async () => {
  const db = fakeSupabase(rows);
  const session = await connectHealthMcp({ userId: ALICE, supabase: db.supabase });
  try {
    const symptoms = readResult(
      await session.client.callTool({ name: "get_symptom_history", arguments: {} }),
    );
    const moods = readResult(
      await session.client.callTool({ name: "get_mood_history", arguments: {} }),
    );
    assert.equal("notes" in symptoms.records[0], false);
    assert.equal("journal" in moods.records[0], false);
    assert.equal(symptoms.records[0].fictionalDemo, true);
  } finally {
    await session.close();
  }
});
