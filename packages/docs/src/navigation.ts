export const GITHUB_URL = "https://github.com/uhyo/funstack-router";

export type NavItem = {
  path: string;
  label: string;
  external?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export type NavSection = {
  label: string;
  items: NavEntry[];
};

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export const learnNavItems: NavEntry[] = [
  { path: "/learn/navigation-api", label: "Navigation API" },
  { path: "/learn/nested-routes", label: "Nested Routes" },
  { path: "/learn/type-safety", label: "Type Safety" },
  { path: "/learn/actions", label: "Form Actions" },
  { path: "/learn/loaders", label: "How Loaders Run" },
  { path: "/learn/error-handling", label: "Error Handling" },
  { path: "/learn/transitions", label: "Transitions" },
  {
    label: "SSR",
    items: [
      { path: "/learn/ssr", label: "How SSR Works" },
      {
        path: "/learn/ssr/static-site-generation",
        label: "Static Site Generation",
      },
      { path: "/learn/ssr/with-loaders", label: "SSR with Loaders" },
    ],
  },
  {
    label: "RSC",
    items: [
      { path: "/learn/rsc", label: "React Server Components" },
      { path: "/learn/rsc/route-features", label: "RSC with Route Features" },
    ],
  },
];

export const apiNavItems: NavItem[] = [
  { path: "/api/components", label: "Components" },
  { path: "/api/hooks", label: "Hooks" },
  { path: "/api/utilities", label: "Utilities" },
  { path: "/api/types", label: "Types" },
];

// Site-wide documentation navigation, rendered by the sidebar and the mobile menu.
export const docsNavSections: NavSection[] = [
  {
    label: "Getting Started",
    items: [
      { path: "/getting-started", label: "Getting Started" },
      { path: "/examples", label: "Examples" },
    ],
  },
  {
    label: "Learn",
    items: [{ path: "/learn", label: "Overview" }, ...learnNavItems],
  },
  {
    label: "API Reference",
    items: [{ path: "/api", label: "Overview" }, ...apiNavItems],
  },
  {
    label: "Resources",
    items: [
      { path: "/faq", label: "FAQ" },
      { path: GITHUB_URL, label: "GitHub", external: true },
    ],
  },
];
