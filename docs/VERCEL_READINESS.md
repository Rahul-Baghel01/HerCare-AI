# Vercel readiness - October 3, 2026

The existing React/TanStack Start application uses Vite and the Nitro Vite plugin. No new adapter, dependency, application change, or `vercel.json` is needed. The [README](../README.md#deploy-to-vercel) contains the complete deployment and Supabase setup instructions.

## Scope

This pass rewrites the README, clarifies the existing environment template, and excludes generated Vercel output and downloaded health reports from source-control/formatting checks. Application code, dependencies, UI, branding, and migrations are preserved. The release audit's clean installation, TypeScript, 37 passing mocked tests, zero-vulnerability audit, and local browser checks are reused.

## Validation

- Production build with process-scoped `NITRO_PRESET=vercel`: passed using the existing adapter; the prior environment value was restored.
- Generated Build Output API v3 routing: filesystem assets followed by the `__server` catch-all. Function runtime is `nodejs24.x` with streaming support.
- Local loopback handler: all 17 page routes returned HTML with both favicon references; all 85 generated client assets and nine public files returned byte-identical contents. Manifest icon paths resolved.
- Affected ESLint check: passed. README/environment review confirms actual required/optional settings and safe placeholders. Local Markdown links and secret/exclusion checks passed; final formatting and diff checks passed.
- Configured private values were absent from all reviewed generated Vercel output files. `.env`, generated output, dependencies, downloaded health reports, and local QA/submission artifacts are ignored; `.env.example` remains eligible for source control.
- Prior clean install, TypeScript, 37 mocked tests, zero-vulnerability audit, and browser results were reused because application code and dependencies did not change in this pass.

The loopback server used inert runtime settings and blocked external server fetches. Local adapter packaging cannot prove a deployed Vercel runtime or live integrations. Generated Windows output is verification evidence only; Vercel should build from repository source.

## Clean initial Git publication

The owner authorized a clean initial `main` in `Rahul-Baghel01/HerCare-AI`, preserving the existing local history. The exact target URL is `https://github.com/Rahul-Baghel01/HerCare-AI.git`; a read-only Git check confirmed that the target had no existing branches or tags before preparation.

- Original local `main` and HEAD remain `73479a921abf0ab967d8da88f869b50a6baac137`.
- Verified backup reference: `refs/heads/backup/pre-hercare-initial-release-20261003T065627Z`.
- The clean release is prepared in an independent local checkout, with one root commit using `chore: finalize HerCare AI for Vercel deployment`.
- Original local history, working files, index, and `origin` are preserved. No force-push or remote history replacement is permitted.
- Only current source, public assets, migrations, maintained tests/synthetic fixtures, documentation, configuration, and `.env.example` are included. Environment files, dependencies, generated builds, health exports, QA captures, and submission archives are excluded.
- The old local history contains a tracked `.env` with public Supabase settings only; that history is not part of this independent release. Reviewed credential scans found no private credentials in the publishable source. The staged index and final commit receive another pre-push scan.

Earlier publication was stopped because the original `origin` pointed to the unavailable `aura-well-co` repository. The owner subsequently approved this independent source-only release to the empty `HerCare-AI` target. Publication confirmation and the exact release commit/file manifest are provided after remote verification; this document does not certify a Vercel deployment.

## Live release prerequisites

Live Supabase/Gemini, deployed two-user RLS, email/recovery/Google OAuth, private avatar policies, cloud account deletion, and real rate limiting remain pending by the owner's choice to use local/mocked workflows. The historical avatar SELECT policy permits bucket-wide reads; private bucket configuration alone is insufficient. No deployment, remote migration, production-data change, or live integration claim is made.
