import react from "@vitejs/plugin-react";
import funstackStatic from "@funstack/static";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    funstackStatic({
      root: "./src/Root.tsx",
      app: "./src/App.tsx",
      ssr: true,
    }),
    react(),
  ],
  base: "/funstack-router/",
});
