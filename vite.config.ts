import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    ...(command === "build" ? [nitro()] : []),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  build: {
    // The shared framework/vendor chunk is intentionally cached across all route-level chunks.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
