# Vercel readiness - October 3, 2026

The existing React/TanStack Start application uses Vite and the Nitro Vite plugin. No new adapter or `vercel.json` is needed. The subsequent TanStack security patch below updates existing dependencies and one type-only Router annotation. The [README](../README.md#deploy-to-vercel) contains the complete deployment and Supabase setup instructions.

## Scope

The initial readiness pass rewrote the README, clarified the existing environment template, and excluded generated Vercel output and downloaded health reports from source-control/formatting checks. That pass preserved application code and dependencies; the subsequent security patch below preserves UI, branding, features, and migrations. The release audit's clean installation, TypeScript, 37 passing mocked tests, zero-vulnerability audit, and local browser checks are reused.

## Initial readiness validation

- Production build with process-scoped `NITRO_PRESET=vercel`: passed using the existing adapter; the prior environment value was restored.
- Generated Build Output API v3 routing: filesystem assets followed by the `__server` catch-all. Function runtime is `nodejs24.x` with streaming support.
- Local loopback handler: all 17 page routes returned HTML with both favicon references; all 85 generated client assets and nine public files returned byte-identical contents. Manifest icon paths resolved.
- Affected ESLint check: passed. README/environment review confirms actual required/optional settings and safe placeholders. Local Markdown links and secret/exclusion checks passed; final formatting and diff checks passed.
- Configured private values were absent from all reviewed generated Vercel output files. `.env`, generated output, dependencies, downloaded health reports, and local QA/submission artifacts are ignored; `.env.example` remains eligible for source control.
- Prior clean install, TypeScript, 37 mocked tests, zero-vulnerability audit, and browser results were reused because application code and dependencies did not change in this pass.

The loopback server used inert runtime settings and blocked external server fetches. Local adapter packaging cannot prove a deployed Vercel runtime or live integrations. Generated Windows output is verification evidence only; Vercel should build from repository source.

## Initial Git publication

The owner authorized a clean initial `main` in `Rahul-Baghel01/HerCare-AI`, preserving the existing local history. The exact target URL is `https://github.com/Rahul-Baghel01/HerCare-AI.git`; a read-only Git check confirmed that the target had no existing branches or tags before preparation.

- Original local `main` and HEAD remain `73479a921abf0ab967d8da88f869b50a6baac137`.
- Verified backup reference: `refs/heads/backup/pre-hercare-initial-release-20261003T065627Z`.
- The clean initial release was published from an independent local checkout as root commit `d2ab868db111a52f83c3f31fff452a2e18bca580`, using `chore: finalize HerCare AI for Vercel deployment`. This security patch is prepared as a follow-up on that published `main`.
- Original local history, working files, index, and `origin` are preserved. No force-push or remote history replacement is permitted.
- Only current source, public assets, migrations, maintained tests/synthetic fixtures, documentation, configuration, and `.env.example` are included. Environment files, dependencies, generated builds, health exports, QA captures, and submission archives are excluded.
- The old local history contains a tracked `.env` with public Supabase settings only; that history is not part of this independent release. Reviewed credential scans found no private credentials in the publishable source. The staged index and final commit receive another pre-push scan.

Earlier publication was stopped because the original `origin` pointed to the unavailable `aura-well-co` repository. The owner subsequently approved this independent source-only release to the empty `HerCare-AI` target. Publication confirmation and the exact release commit/file manifest are provided after remote verification; this document does not certify a Vercel deployment.

## TanStack Start security patch - October 3, 2026

The first Vercel deployment was blocked because the published lockfile resolved an affected TanStack Start release. This patch addresses **CVE-2026-102989 / GHSA-qx66-fv34-fjm8**, an unauthenticated reflected-XSS issue in server-function response handling. See the [official TanStack advisory](https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8) and [security announcement](https://tanstack.com/blog/tanstack-start-security-update-cve-2026-102989).

The direct dependencies are pinned to `@tanstack/react-start@1.168.60` and its declared Router companion, `@tanstack/react-router@1.170.41`. Start's exact transitive dependencies naturally select `@tanstack/start-server-core@1.169.39` and the matching client/server/plugin family. There are no package overrides, extra direct dependencies, security bypass settings, application redesigns, or schema changes. The patched Router widens route errors to `unknown`; the root error component now uses its exported `ErrorComponentProps` type. This type-only compatibility adjustment preserves all rendered UI and runtime behavior. TanStack Query is unchanged. npm updated required compiler/serialization/store transitive dependencies as part of this compatible graph.

| Resolved package                  | Before     | After      |
| --------------------------------- | ---------- | ---------- |
| `@tanstack/react-start`           | `1.168.34` | `1.168.60` |
| `@tanstack/start-server-core`     | `1.169.17` | `1.169.39` |
| `@tanstack/react-router`          | `1.170.18` | `1.170.41` |
| `@tanstack/history`               | `1.162.0`  | `1.162.4`  |
| `@tanstack/react-start-client`    | `1.168.16` | `1.168.39` |
| `@tanstack/react-start-rsc`       | `0.1.33`   | `0.1.59`   |
| `@tanstack/react-start-server`    | `1.167.22` | `1.167.46` |
| `@tanstack/react-store`           | `0.9.3`    | `0.11.2`   |
| `@tanstack/router-core`           | `1.171.15` | `1.171.34` |
| `@tanstack/router-generator`      | `1.167.21` | `1.167.40` |
| `@tanstack/router-plugin`         | `1.168.23` | `1.168.42` |
| `@tanstack/router-utils`          | `1.162.2`  | `1.162.3`  |
| `@tanstack/start-client-core`     | `1.170.14` | `1.170.34` |
| `@tanstack/start-fn-stubs`        | `1.162.0`  | `1.162.0`  |
| `@tanstack/start-plugin-core`     | `1.171.25` | `1.171.49` |
| `@tanstack/start-storage-context` | `1.167.17` | `1.167.36` |
| `@tanstack/store`                 | `0.9.3`    | `0.11.2`   |
| `@tanstack/virtual-file-routes`   | `1.162.0`  | `1.162.0`  |

### Patch validation

| Check                      | Result                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci`             | Passed: 532 installed, 537 audited                                                                                                                                                |
| `npm run typecheck`        | Passed after the type-only Router compatibility correction                                                                                                                        |
| `npm run lint`             | Passed                                                                                                                                                                            |
| `npm test`                 | All 37 existing tests passed; no failures or skips                                                                                                                                |
| `npm run build`            | Normal Node production build passed                                                                                                                                               |
| Vercel production build    | Passed with process-scoped `NITRO_PRESET=vercel`; existing preset value restored                                                                                                  |
| `npm audit`                | Zero vulnerabilities in all severity categories                                                                                                                                   |
| Resolved versions          | Patched, coherent, deduplicated Start family; no vulnerable server-core copy                                                                                                      |
| Local production RPC       | Synthetic authenticated general reply and actual internal MCP reply passed; missing authentication rejected; foreign origin returned 403                                          |
| Malformed transport inputs | Two harmless forged response-field variants neither reflected their HTML marker nor returned HTML; this is focused local coverage, not a claim to exhaustively test XSS           |
| Vercel output              | Node 24 runtime and filesystem/server catch-all routing retained; nine public files byte-identical; 92 client assets generated; all 17 page routes served with favicon references |

All runtime checks used loopback synthetic services with external server fetches blocked. No live cloud data or provider requests were made. Configured private values and excluded artifacts were checked again before staging/committing this security patch.

The existing Nitro/Vite configuration and Vercel settings remain in place. A new patched build must be redeployed; updating dependencies alone does not repair an existing deployment. Vercel deployment success remains unconfirmed until the platform completes its build and runtime checks. Live integrations and the separate avatar-privacy prerequisite below remain pending.

## npm lockfile synchronization - October 3, 2026

Vercel rejected commit `da4095912946112b4cc82fa4d95eb2e6ce2fc181` during `npm ci` because the lockfile omitted `@emnapi/core@1.11.3` and `@emnapi/runtime@1.11.3`. A fresh manifest-only copy reproduced both missing-entry errors with npm `11.21.0`. The installed npm `11.6.1` accepted the incomplete lockfile, so its earlier passing installation did not detect this inconsistency. The Vercel log supplied for this repair does not identify its npm version.

The lockfile was synchronized by npm in a fresh directory without `node_modules`, retaining the existing lockfile to preserve dependency versions:

```powershell
npx --yes --package=npm@11.21.0 npm install --package-lock-only --ignore-scripts --include=optional
```

No entries were written manually. npm added the missing root `@emnapi/core` and `@emnapi/runtime` entries at `1.11.3`, plus the bundled `1.11.1` entries beneath `@tailwindcss/oxide-wasm32-wasi`. Every pre-existing resolved package version remains unchanged. The security patch still resolves `@tanstack/react-start@1.168.60`, `@tanstack/start-server-core@1.169.39`, and `@tanstack/react-router@1.170.41`.

### Lockfile repair validation

- Fresh `npm ci` with npm `11.21.0`: passed with normal install flags and lifecycle handling; 490 packages installed and zero vulnerabilities reported.
- Fresh `npm ci` with the repository's installed npm `11.6.1`: passed; 535 packages installed and zero vulnerabilities reported.
- TypeScript and lint: passed.
- All 37 existing tests: passed, with no failures or skips.
- Normal Node production build and Vercel production build: passed using the existing Nitro/Vite configuration. The Vercel output retains Build Output API v3 routing and its Node 24 server function.
- `npm audit`: zero vulnerabilities across all severity categories.
- Linux x64/glibc dependency resolution: passed with npm `11.21.0` using `npm ci --os=linux --cpu=x64 --libc=glibc --dry-run --ignore-scripts`. This is a resolution check; native Linux installation could not run because the local WSL VM timed out.
- Manifest, application source, branding assets, migrations, environment files, and deployment configuration: unchanged. The lockfile and this release document are the only changes in this repair.

Builds used inert process-scoped public settings in the isolated validation directory; no environment files or deployed settings were changed and no live integration tests were run. The Vercel install command remains `npm ci`. The synchronized lockfile is ready for a new Vercel build, but deployment success remains unconfirmed until Vercel completes that deployment.

## Live release prerequisites

Live Supabase/Gemini, deployed two-user RLS, email/recovery/Google OAuth, private avatar policies, cloud account deletion, and real rate limiting remain pending by the owner's choice to use local/mocked workflows. The historical avatar SELECT policy permits bucket-wide reads; private bucket configuration alone is insufficient. No deployment, remote migration, production-data change, or live integration claim is made.
