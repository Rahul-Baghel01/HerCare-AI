import test from "node:test";
import assert from "node:assert/strict";
import {
  summaryRange,
  describeCoverage,
  fictionalDataNotice,
  SUMMARY_LIMIT,
} from "../src/lib/summary.ts";
import { average, analyseCycles } from "../src/lib/stats.ts";
import { createSupabaseFetch } from "../src/integrations/supabase/fetch.ts";

test("summary includes 90 local calendar dates across year boundaries", () => {
  assert.deepEqual(summaryRange(new Date(2026, 0, 1, 0, 15)), {
    rangeStart: "2025-10-04",
    rangeEnd: "2026-01-01",
  });
  assert.deepEqual(summaryRange(new Date(2026, 9, 2)), {
    rangeStart: "2026-07-05",
    rangeEnd: "2026-10-02",
  });
});
test("coverage reports actual dates, missing categories and truncation", () => {
  const result = describeCoverage(
    [
      { label: "Moods", dates: ["2026-09-01", "2026-10-01"] },
      { label: "Symptoms", dates: [] },
    ],
    summaryRange(new Date(2026, 9, 2)),
  ).join(" ");
  assert.match(result, /Records used: 2/);
  assert.match(result, /2026-09-01 to 2026-10-01/);
  assert.match(result, /No records for: Symptoms/);
  assert.match(
    describeCoverage(
      [{ label: "Moods", dates: Array(SUMMARY_LIMIT).fill("2026-10-01") }],
      summaryRange(),
    ).join(" "),
    /limit reached/,
  );
});
test("missing measurements remain unknown and cycle intervals sort correctly", () => {
  assert.equal(average([null, undefined]), null);
  assert.equal(average([null, 4, undefined, 2]), 3);
  assert.equal(
    analyseCycles([{ start_date: "2026-09-29" }, { start_date: "2026-09-01" }]).averageLength,
    28,
  );
});
test("fictional data is identified only through an explicit note", () => {
  assert.equal(fictionalDataNotice([null, "Felt good"]), null);
  assert.match(fictionalDataNotice(["Fictional demo QA record - test"]), /not actual health/);
});
test("Supabase transport preserves authorization and caller cancellation", async () => {
  const original = globalThis.fetch;
  const abort = new AbortController();
  abort.abort();
  let captured;
  globalThis.fetch = async (_input, init) => {
    captured = init;
    return new Response("{}");
  };
  try {
    await createSupabaseFetch("sb_publishable_test")("https://example.test", {
      headers: { Authorization: "Bearer user-session" },
      signal: abort.signal,
    });
    assert.equal(captured.headers.get("Authorization"), "Bearer user-session");
    assert.equal(captured.headers.get("apikey"), "sb_publishable_test");
    assert.equal(captured.signal.aborted, true);
    await createSupabaseFetch("sb_publishable_test")("https://example.test", {
      headers: { Authorization: "Bearer sb_publishable_test" },
    });
    assert.equal(captured.headers.has("Authorization"), false);
  } finally {
    globalThis.fetch = original;
  }
});

test("assistant handles missing configuration, provider failure and empty answers", async () => {
  const { readFile } = await import("node:fs/promises");
  const { transpileModule, ModuleKind } = await import("typescript");
  const source = (
    await readFile(new URL("../src/lib/ai-gateway.server.ts", import.meta.url), "utf8")
  ).replace('import { serverLog } from "./logger.server";', "const serverLog = () => {};");
  const compiled = transpileModule(source, {
    compilerOptions: { module: ModuleKind.ESNext },
  }).outputText;
  const { chatCompletion, requestCompletion } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
  const env = { ...process.env };
  const fetch = globalThis.fetch;
  try {
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(chatCompletion([]), /not configured/);
    process.env.OPENAI_API_KEY = "fictional-unit-test-key";
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_BASE_URL;
    globalThis.fetch = async () => new Response("unavailable", { status: 400 });
    await assert.rejects(chatCompletion([]), /could not answer/);
    globalThis.fetch = async () => Response.json({ choices: [] });
    await assert.rejects(chatCompletion([]), /empty answer/);
    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: "  Educational test response  " } }] });
    assert.equal(await chatCompletion([]), "Educational test response");
    let submitted;
    globalThis.fetch = async (_url, init) => {
      submitted = JSON.parse(init.body);
      return Response.json({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "test-call",
                  type: "function",
                  function: { name: "get_mood_history", arguments: "{}" },
                },
              ],
            },
          },
        ],
      });
    };
    const response = await requestCompletion(
      [{ role: "user", content: "What mood did I log?" }],
      [
        {
          type: "function",
          function: { name: "get_mood_history", parameters: { type: "object" } },
        },
      ],
    );
    assert.equal(submitted.tool_choice, "auto");
    assert.equal(submitted.tools[0].function.name, "get_mood_history");
    assert.equal(response.toolCalls[0].function.name, "get_mood_history");
    assert.equal(response.content, null);
  } finally {
    globalThis.fetch = fetch;
    for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_BASE_URL"]) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
  }
});

test("tracking validation rejects impossible dates, non-finite numbers and malformed dose times", async () => {
  const { validLogDate, validNumber, validDoseTimes } = await import("../src/lib/validation.ts");
  assert.equal(validLogDate("2026-02-30", "2026-10-02"), false);
  assert.equal(validLogDate("2026-10-03", "2026-10-02"), false);
  assert.equal(validLogDate("2024-02-29", "2026-10-02"), true);
  assert.equal(validLogDate("", "2026-10-02"), false);
  assert.equal(validNumber("", 20, 400), true);
  assert.equal(validNumber("", 0, 24, false), false);
  assert.equal(validNumber("Infinity", 0, 24), false);
  assert.equal(validNumber("30", 0, 24), false);
  assert.equal(validNumber("7.5", 0, 24, false), true);
  assert.equal(validNumber("2.5", 1, 30, false, true), false);
  assert.equal(validDoseTimes("08:00, 20:30"), true);
  assert.equal(validDoseTimes("25:00"), false);
  assert.equal(validDoseTimes("08:00,"), false);
  assert.equal(validDoseTimes(""), false);
});
