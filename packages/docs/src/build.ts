/// <reference types="node" />
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildEntryFunction } from "@funstack/static/server";
import { collectSitePaths } from "./entries.js";
import { SITE_URL } from "./pageMeta.js";

function generateSitemap(): string {
  const pagePaths = collectSitePaths().filter((p) => p !== "/*");
  const urls = pagePaths
    .map((p) => `  <url><loc>${new URL(p, SITE_URL).href}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export default (async ({ build, outDir }) => {
  await Promise.all([build(), writeFile(path.join(outDir, "sitemap.xml"), generateSitemap())]);
}) satisfies BuildEntryFunction;
