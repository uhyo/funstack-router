import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/server.ts", "src/bin/skill-installer.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "@funstack/skill-installer"],
});
