# HerCare AI judges walkthrough

## Preparation

Read [README.md](../README.md) and [RELEASE_AUDIT.md](RELEASE_AUDIT.md). Use Node >=22.12 and npm ci. Start `npm run qa:local`, open http://127.0.0.1:8091 and sign in with **judge@example.test / qa-password-123**. Explain that Supabase/Gemini responses and records are synthetic; the application and official internal MCP protocol are exercised locally. All fixture records reset when the process stops. Do not present this demo as live model or deployed RLS proof.

For a future live demo use a separately approved disposable nonproduction project/account and fictional records after completing the outstanding integration/privacy checks. Never show environment files, tokens or real patient records.

## Seven-minute demo

1. **Authentication (45 seconds):** open /dashboard while signed out to show protection; sign in. Optional: use Create account with a synthetic @example.test email to show signup and an empty personal workspace. Email confirmation is not demonstrated by the default fixture.
2. **Dashboard (45 seconds):** show honest missing-data states. Select Good, energy 4/5 and Fatigue. Add a note beginning "Fictional demo QA" and save. Reload to show session and record persistence within the fixture process.
3. **Health tracking (90 seconds):** visit Mood journal and Symptoms to find the check-in. Save a today-dated cycle, then show the Fertility/PCOS/Pregnancy forms. Open Daily wellness, add water and save sleep. Show that records belong to this synthetic account. Explain that predictions are estimates and medication confirmation is daily.
4. **Assistant + MCP (90 seconds):** ask "What is a menstrual cycle?" to show a general response without a health lookup. Then ask "Summarize my tracked symptoms, mood and energy over the last 90 days." Open **How HerCare AI answered**: show the Tracking summary tool, recorded counts/range, fictional labels and missing categories. The official SDK performs initialization, tools/list and tools/call; provider selection/results are mocked. Four tools are available, but only actually executed tools are attributed to an answer. Reload to show saved conversation.
5. **Analytics (45 seconds):** compare average sleep and symptoms with the entries just saved. Show insufficient cycle history as unknown rather than a made-up average. Explain the descriptive, nonclinical wellness index and matching report range.
6. **Exports (45 seconds):** click Download PDF report and open the PDF; show provenance and medical disclaimer. Settings > Export my data downloads the complete supported-table JSON. Use fictional fixture data only.
7. **Privacy and responsive behavior (40 seconds):** show stored notification/research preferences and their explicit limits, switch theme, and show the mobile menu. Explain authenticated owner filters, RLS assumptions, server-only secrets, read-only MCP tools and metadata-only logs. Avatar privacy and live two-user isolation are pending deployment checks; do not upload real photos. Account deletion requires DELETE; cancel the dialog during the demo.

## Recovery and honest claims

- If a real provider is unavailable, demonstrate the existing error/retry UI and saved history; do not invent an answer.
- The local provider is deterministic and does not establish real Gemini answer quality, medical safety or availability.
- Automated tests exercise all four MCP tools and failure paths. No external MCP endpoint or verified third-party interoperability is claimed.
- Do not delete real accounts, apply migrations, deploy or push as part of this walkthrough.
