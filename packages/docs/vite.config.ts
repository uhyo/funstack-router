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
});
