export const SITE_URL = "https://router.funstack.work";

const SITE_NAME = "FUNSTACK Router";

interface PageMetaEntry {
  /** Page-specific title. Omitted for the home page, which uses the site-wide title. */
  title?: string;
  description: string;
}

// Metadata for every page, keyed by the full route path.
// The `/*` entry is the 404 page; it gets no canonical URL.
export const pageMetaMap: Record<string, PageMetaEntry> = {
  "/": {
    description:
      "FUNSTACK Router is a truly modern router for React SPAs, built on the Navigation API and URLPattern instead of the History API, with async React support, type safety, SSR, and RSC.",
  },
  "/getting-started": {
    title: "Getting Started",
    description:
      "Install @funstack/router and build your first routes: define a route tree, render the Router component, and navigate with plain anchor tags.",
  },
  "/learn": {
    title: "Learn",
    description:
      "Practical, use-case-driven guides for @funstack/router: nested routes, type safety, loaders, actions, transitions, SSR, and React Server Components.",
  },
  "/learn/navigation-api": {
    title: "Navigation API",
    description:
      "How FUNSTACK Router builds on the browser's Navigation API instead of the History API, and what that means for interception, transitions, and native anchor navigation.",
  },
  "/learn/nested-routes": {
    title: "Nested Routes",
    description:
      "Compose layouts and child routes in FUNSTACK Router with nested route definitions and the Outlet component.",
  },
  "/learn/type-safety": {
    title: "Type Safety",
    description:
      "How FUNSTACK Router derives TypeScript types for route params from your path patterns, keeping route components type-safe.",
  },
  "/learn/ssr": {
    title: "Server-Side Rendering",
    description:
      "FUNSTACK Router's two-stage SSR model: pathless layout routes render an app shell on the server, while path-based routes and loaders activate after client hydration.",
  },
  "/learn/ssr/static-site-generation": {
    title: "Static Site Generation",
    description:
      "Pre-render FUNSTACK Router pages to static HTML at build time, including per-path rendering with the ssrPath option.",
  },
  "/learn/ssr/with-loaders": {
    title: "SSR with Loaders",
    description:
      "Run loaders during server-side rendering with FUNSTACK Router to produce fully rendered HTML that includes loader data.",
  },
  "/learn/rsc": {
    title: "React Server Components",
    description:
      "Use FUNSTACK Router in React Server Components environments, where route components render on the server and stream to the client.",
  },
  "/learn/rsc/route-features": {
    title: "RSC with Route Features",
    description:
      "Combine React Server Components with FUNSTACK Router features like loaders and route params using the server route definition API.",
  },
  "/learn/actions": {
    title: "Form Actions",
    description:
      "Intercept form submissions with FUNSTACK Router actions: run client-side logic before navigation while keeping progressive enhancement in mind.",
  },
  "/learn/error-handling": {
    title: "Error Handling",
    description:
      "Handle route errors in FUNSTACK Router by placing Error Boundaries around the Outlet in layout routes, keeping shared UI visible when child routes fail.",
  },
  "/learn/transitions": {
    title: "Controlling Transitions",
    description:
      "FUNSTACK Router wraps navigations in React's startTransition. Learn how transitions affect rendering and how to control them.",
  },
  "/learn/loaders": {
    title: "Loaders",
    description:
      "When FUNSTACK Router loaders execute, how their results are cached, and how different types of navigation affect loader behavior.",
  },
  "/api": {
    title: "API Reference",
    description:
      "Complete API reference for @funstack/router: components, hooks, utilities, and TypeScript types.",
  },
  "/api/components": {
    title: "Components API",
    description: "API reference for FUNSTACK Router components, including Router and Outlet.",
  },
  "/api/hooks": {
    title: "Hooks API",
    description:
      "API reference for FUNSTACK Router hooks for accessing route params, navigation state, and programmatic navigation.",
  },
  "/api/utilities": {
    title: "Utilities API",
    description:
      "API reference for FUNSTACK Router utility functions, including route definition helpers.",
  },
  "/api/types": {
    title: "Types API",
    description:
      "API reference for TypeScript types exported by @funstack/router, including route definitions and matched routes.",
  },
  "/examples": {
    title: "Examples",
    description:
      "Code examples for FUNSTACK Router: basic routing, layouts with nested routes, route params, and programmatic navigation.",
  },
  "/faq": {
    title: "FAQ",
    description:
      "Frequently asked questions about FUNSTACK Router, including browser support, comparison with other routers, and migration tips.",
  },
  "/*": {
    title: "Page Not Found",
    description: "The page you were looking for does not exist.",
  },
};

// Renders per-page metadata tags. React 19 hoists title/meta/link tags
// rendered anywhere in the tree into <head>, both in pre-rendered HTML and
// on client-side navigation.
export function PageMeta({ path }: { path: string }) {
  const meta = pageMetaMap[path];
  if (meta === undefined) {
    throw new Error(`No page metadata defined for path: ${path}`);
  }
  const fullTitle =
    meta.title === undefined ? `${SITE_NAME} - Documentation` : `${meta.title} | ${SITE_NAME}`;
  const canonicalUrl = path === "/*" ? undefined : new URL(path, SITE_URL).href;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={meta.description} />
      {canonicalUrl !== undefined && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={meta.description} />
      {canonicalUrl !== undefined && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={meta.description} />
    </>
  );
}
