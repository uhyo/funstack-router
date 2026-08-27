import type { EntryDefinition } from "@funstack/static/entries";
import type { RouteDefinition } from "@funstack/router";
import { routes } from "./App.js";
import App from "./App.js";

function collectPaths(routeDefs: RouteDefinition[], prefix: string): string[] {
  const paths: string[] = [];
  for (const r of routeDefs) {
    const routePath = r.path;
    if (routePath === undefined) {
      // Pathless route: recurse with same prefix
      if (r.children) {
        paths.push(...collectPaths(r.children, prefix));
      }
    } else if (r.children) {
      // Has path and children: recurse with new prefix
      paths.push(...collectPaths(r.children, prefix + routePath));
    } else {
      // Leaf route: collect the full path
      const fullPath = routePath === "/" ? prefix || "/" : prefix + routePath;
      paths.push(fullPath);
    }
  }
  return paths;
}

// All page paths of the site (including the "/*" 404 path).
// Also used by build.ts to generate sitemap.xml.
export function collectSitePaths(): string[] {
  return collectPaths(routes, "");
}

function toEntry(path: string): { ssrPath: string; outputPath: string } {
  if (path === "/*") {
    return { ssrPath: "/__404__", outputPath: "404.html" };
  }
  if (path === "/") {
    return { ssrPath: "/", outputPath: "index.html" };
  }
  // Remove leading slash for outputPath
  const stripped = path.slice(1);
  return { ssrPath: path, outputPath: `${stripped}.html` };
}

export default function getEntries(): EntryDefinition[] {
  const paths = collectSitePaths();
  return paths.map((path) => {
    const { ssrPath, outputPath } = toEntry(path);
    return {
      path: outputPath,
      root: () => import("./Root.js"),
      app: <App ssrPath={ssrPath} />,
    };
  });
}
