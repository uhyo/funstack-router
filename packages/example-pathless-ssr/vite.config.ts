import react from "@vitejs/plugin-react";
import funstackStatic from "@funstack/static";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    funstackStatic({
      entries: "./src/entries.tsx",
      ssr: true,
    }),
    react(),
  ],
  base: "/",
  resolve: {
    // Ensure all react imports resolve to the same instance.
    // Without this, the workspace router package may resolve to a different
    // React version than the one used by this example (React Canary).
    dedupe: ["react", "react-dom"],
  },
});
