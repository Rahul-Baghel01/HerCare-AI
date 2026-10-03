import { startMockServices, installMockProvider } from "../tests/fixtures/mock-services.mjs";

// Overrides .env only inside this process. Never connects to a live database or AI provider.
const mocks = await startMockServices(54321);
Object.assign(process.env, {
  VITE_SUPABASE_URL: mocks.baseUrl,
  SUPABASE_URL: mocks.baseUrl,
  VITE_SUPABASE_PROJECT_ID: "local-mock-qa",
  SUPABASE_PROJECT_ID: "local-mock-qa",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_mock_qa",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_mock_qa",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_local_mock_qa",
  OPENAI_API_KEY: "fictional-local-mock-qa",
  OPENAI_MODEL: "gemini-3.6-flash",
  OPENAI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
});
const restore = installMockProvider(mocks.state);
const { createServer } = await import("vite");
const app = await createServer({ server: { host: "127.0.0.1", port: 8091, strictPort: true } });
await app.listen();
console.log("Local MOCK QA app: http://127.0.0.1:8091 (synthetic services only)");
async function close() {
  await app.close();
  restore();
  await mocks.close();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
