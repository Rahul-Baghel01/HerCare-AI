# HerCare AI release audit - October 3, 2026

## Status and scope

For the subsequent Vercel preparation, see [deployment readiness](VERCEL_READINESS.md) and the updated [README](../README.md). The earlier source ZIP predates those documentation/configuration changes and is not the final Git/Vercel payload.

Locally validated source release; live integration and deployment approval remain pending. The owner explicitly chose local/mocked workflows. No live Supabase/Gemini test, remote data mutation, migration application, deployment, push or commit was performed. The approved UI, branding, sidebar, styles, typography and animations were preserved. The working tree already contained earlier UI, MCP and favicon work; this audit does not attribute those pre-existing changes to the cleanup.

## Findings and classification

| Classification                   | Finding                                                                                                          | Action                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safe to remove                   | 26 unreachable UI wrappers and their sole unused mobile hook                                                     | Removed after TypeScript import/export graph analysis, all route/test roots and full-repository reference searches; retained every used primitive.                                                       |
| Safe to remove                   | 18 packages referenced only by those wrappers                                                                    | Removed direct dependencies; synchronized lockfile and clean-installed. React DOM, Tailwind, Motion and all framework/runtime packages retained.                                                         |
| Requires modification            | Incomplete npm lockfile broke npm ci                                                                             | Repaired the missing optional dependency entry, then validated a clean install.                                                                                                                          |
| Requires modification            | Server auth accepted JWT claims without checking current account existence                                       | Current Auth getUser verification now rejects revoked/deleted/unverifiable accounts; regression tested. This does not revoke every issued database JWT immediately.                                      |
| Requires modification            | Update/delete helpers relied exclusively on deployed RLS                                                         | Added authenticated-user guards and owner filters; preserved RLS in the request path.                                                                                                                    |
| Requires modification            | Sign-out could leave cached private query results                                                                | Clear query cache immediately on SIGNED_OUT. Browser signup into a second synthetic user showed empty records.                                                                                           |
| Requires modification            | Raw errors/cause/stack could expose sensitive information                                                        | Metadata-only error capture and allowlisted server logging; sensitive-field regression tests.                                                                                                            |
| Requires modification            | Auth deletion could fail while the user owns avatar objects                                                      | Bounded owner-folder cleanup before Auth deletion; fail closed on storage failures, unexpected paths or folders. No live deletion performed.                                                             |
| Requires modification            | Pregnancy completed-week calculation added an extra week                                                         | Corrected floor(days/7), with 40-week due-date regression; averages exclude non-finite measurements.                                                                                                     |
| Requires modification            | MCP connection initialization lacked the shared timeout/signal                                                   | Added bounded initialization and caller cancellation using existing official SDK options.                                                                                                                |
| Requires modification            | Signed-out direct protected-page refresh redirected during hydration                                             | Use the existing router document-redirect option; preserves the auth guard and sign-in UI. Production browser recheck passed with no console errors.                                                     |
| Requires modification            | Sign-in trusted revoked cached sessions and could redirect repeatedly                                            | Verify current Auth getUser before auto-navigation; regression tests and mocked browser recovery passed.                                                                                                 |
| Requires modification            | Setup docs contained placeholders, stale dependency claims and machine paths                                     | Updated README, added this audit/demo, marked earlier reviews historical, replaced absolute paths.                                                                                                       |
| Must preserve                    | All active routes, shared design, branding/assets, health features, MCP modules, tests and historical migrations | Preserved. No framework upgrades, animation additions or live database changes.                                                                                                                          |
| Requires deployment verification | Historical avatars SELECT policy permits public reads and bucket provisioning is external                        | Documented outstanding privacy configuration; do not use a real avatar for the mock judges demo. Verify private bucket/owner-only policies in a dedicated nonproduction environment before live release. |

No TODO/FIXME placeholders or remaining Lovable references were found in active source/public configuration. Remaining console statements report missing environment variable names or allowlisted operational metadata, rather than debug records. No duplicate utility justified removal. Retained older database tables/migrations even where no current UI route uses them.

## Files changed in this cleanup

- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `README.md`
- `docs/FINALE_REVIEW.md`
- `docs/DEMO_VERIFICATION.md`
- `docs/RELEASE_AUDIT.md`
- `docs/JUDGES_DEMO.md`
- `scripts/qa-local.mjs`
- `tests/fixtures/mock-services.mjs`
- `tests/release.test.mjs`
- `src/integrations/supabase/auth-middleware.ts`
- `src/routes/__root.tsx`
- `src/routes/_authenticated/route.tsx`
- `src/routes/auth.tsx`
- `src/lib/data.ts`
- `src/lib/stats.ts`
- `src/lib/logger.server.ts`
- `src/lib/error-capture.ts`
- `src/lib/error-metadata.ts`
- `src/lib/account.functions.ts`
- `src/lib/account-deletion.server.ts`
- `src/lib/health-mcp.server.ts`

## Files removed

- `src/components/ui/accordion.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/tooltip.tsx`
- `src/hooks/use-mobile.tsx`

## Direct dependencies removed

- `@radix-ui/react-accordion`
- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-separator`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `@radix-ui/react-tooltip`
- `embla-carousel-react`
- `input-otp`
- `react-hook-form`
- `react-resizable-panels`

## Verification evidence

| Check                                                     | Result / actual scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean install                                             | Passed: 533 packages installed; 538 audited; clean install succeeded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TypeScript / ESLint / production build / dependency audit | TypeScript and ESLint passed; audit reports zero vulnerabilities. Production build/HTTP results below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Automated tests                                           | 37 passed, zero failures/skips: 7 journey tests, 20 MCP tests, 10 release regressions. External services are mocked.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Auth browser                                              | Invalid password error; successful login; refresh session persistence; signed-out protected redirect; logout; actual signup; new synthetic account has empty tracking and chat history. Email delivery/OAuth/reset completion remain live checks.                                                                                                                                                                                                                                                                                                                       |
| Tracking browser                                          | Created and saw saved cycle, symptom, mood, fertility, PCOS and pregnancy entries; hydration, sleep, nutrition and exercise histories; appointment plus notification; medication schedule and daily taken history. Records were explicitly fictional and memory-only.                                                                                                                                                                                                                                                                                                   |
| Profile/settings browser                                  | Display-name/height update persisted after reload; hydration-notification preference and dark theme persisted; light theme restored; deletion requires DELETE and cancellation works. Actual storage/admin deletion covered by mocked unit tests only.                                                                                                                                                                                                                                                                                                                  |
| Assistant browser                                         | General response with no health lookup; actual internal MCP handshake/discovery and tracking-summary call; matching five-record coverage; empty-account lookup with zero records and no personal-record claim; provider outage preserves question; retry recovery; conversation persists after refresh.                                                                                                                                                                                                                                                                 |
| MCP automated                                             | Actual SDK InMemoryTransport initialize/tools-list/tools-call for all four tools; input/identity rejection; scoped reads and simulated cross-user boundary; database/provider/initialization failures; empty history; timeout, cancellation, cleanup; bounded rounds/calls, duplicate reuse and transient retry. No external interoperability test.                                                                                                                                                                                                                     |
| Analytics/exports                                         | Browser metrics matched synthetic history (sleep 7.5 h, hydration goal 0%, insufficient cycle intervals); clicked PDF and JSON download actions. JSON builder test includes all 19 tables, >1000-row pagination and fail-closed errors. Real jsPDF output has four pages; all four rendered and visually inspected, with no out-of-bounds text and every page footer.                                                                                                                                                                                                   |
| Responsive/browser                                        | All 14 protected pages at 390px without horizontal page overflow; dashboard and analytics at 320px, analytics at 768px and settings at 1440px. Mobile menu opens, navigates and closes. Representative visual inspection preserved the design. Fresh final browser diagnostics had no application errors. A production direct protected refresh reproduced a hydration mismatch; fixed using a document redirect. A revoked cached-session loop was also fixed. Both recovery and valid login/refresh were rechecked; production direct redirect had no console errors. |
| Native date controls                                      | Today-dated saves were verified. Automated browser date fill did not reliably drive React date drafts; backdated/date-draft persistence is not claimed from browser automation. Date validation and pregnancy calculation have direct regression coverage.                                                                                                                                                                                                                                                                                                              |
| Live services                                             | Pending by owner instruction. Mock HTTP fixtures simulate ownership, not real Postgres constraints or deployed RLS.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Security review and remaining release gates

- Public Supabase settings match server project configuration; no privileged VITE variable is configured. `.env` is ignored. Service-role administration and Gemini credentials stay in server modules. Secret scans report only outcomes, never values.
- Health-table migration policies use authenticated ownership checks, including write checks. Deployed policies still need a two-account live test; mocked isolation cannot certify them.
- The avatar policy is a known privacy configuration concern, not a verified private deployment. Bucket creation is not provided by these migrations. Confirm a private avatars bucket and owner-only access before allowing real uploads. [Supabase bucket documentation](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- Account deletion cleans avatars before Auth deletion because Supabase may reject deleting a storage owner. Existing JWTs can remain valid until expiry after user deletion; server actions now additionally check the current Auth user. Review revocation/RLS behavior in staging. [Supabase user-data documentation](https://supabase.com/docs/guides/auth/managing-user-data).
- Assistant tool inputs cannot choose a user ID; queries use the verified user's bearer client rather than service-role credentials. History is bounded, notes/journals require explicit inclusion, outputs are untrusted data, and logs exclude record content. Prompt-injection defenses still need live model/adversarial evaluation.
- Rate-limit SQL is preserved (10 requests/minute per user, atomic locking); the local fixture deliberately returns allow=true and does not establish deployed throttling.
- Final dependency audit result is recorded below; no incompatible major upgrades were used. Recharts 2 emits a deprecation notice, not an npm security advisory; a future major migration is outside this stabilization pass.
- Account deletion is destructive and was tested with stubs only. Verify auth cascades, storage cleanup and failure recovery using disposable nonproduction users before a production release.

Other limits: predictions are estimates; descriptive wellness score is not clinically validated; forms use displayed metric units; medication confirmation is per day; reminder preferences do not schedule automatic delivery; research preference does not transfer data; assistant is non-streaming and historical provenance is not persisted.

## Run and submit

For a fresh checkout:

```powershell
git clone https://github.com/Rahul-Baghel01/HerCare-AI.git
cd HerCare-AI
npm ci
Copy-Item .env.example .env
# Fill .env privately with matching Supabase settings and server-only Gemini/admin keys.
npm run dev
```

Use Node >=22.12 (validated with Node 24). Development: http://localhost:8080. On an existing checkout preserve your configured `.env`.

Isolated demo, no real credentials needed:

```powershell
npm ci
npm run qa:local
```

Open http://127.0.0.1:8091; use judge@example.test / qa-password-123. These credentials and records are synthetic. Ctrl+C stops the app and discards fixture records. Ports 8091 and 54321 must be free.

Final checks and production preview:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm run preview
```

Production preview: http://localhost:3000. Configure public settings before build and secrets at runtime.

The source archive is `submission/HerCare-AI-CodeBlitz.zip`. Extract it into a new directory; its root contains package.json, README, source, assets, tests, scripts, docs and migrations. Run npm ci and configure a private .env separately. Upload this source archive to the competition portal and follow [JUDGES_DEMO.md](JUDGES_DEMO.md). It excludes .env, .git, node_modules, .output, caches, local QA evidence and downloaded reports. No credentials should be added to the archive. Recreate it if source changes after this review.

## Final validation results

- npm ci: passed, 533 packages installed and 538 audited.
- npm run typecheck: passed, including noUnusedLocals and noUnusedParameters.
- npm run lint: passed again after both final auth fixes.
- npm test: 37/37 passed; zero failed, skipped or cancelled (external services mocked).
- npm run build: passed again after both final auth fixes.
- npm audit: zero vulnerabilities at all reported severities.
- Production HTTP: all 17 routes passed; 75 linked build assets plus eight icon/manifest assets resolved; both manifest icons resolved. Favicon links are present on every route, with no Lovable references.
- Production browser: /auth renders; signed-out direct /dashboard refresh resolves to /auth with no application console errors after the fix.
- Built RPC boundaries: same-origin unauthenticated assistant/account requests return serialized authentication errors (HTTP 200 is the framework RPC envelope, not action success); hostile-origin requests return HTTP 403. No data or provider request was performed.
- Secrets: configured privileged values absent from reviewed submission source and built browser output; no absolute local machine paths in source/docs.
- git diff --check: passed (Git reports only an expected LF/CRLF normalization notice for the earlier manifest change).
- Archive: source-only ZIP prepared and entries verified; excludes environment secrets, dependency/build directories and local QA records.

Readiness: local source/demo checks pass. A production privacy/integration release is conditional on the pending live checks above; this audit does not certify deployed RLS, private avatar storage or real provider behavior.
