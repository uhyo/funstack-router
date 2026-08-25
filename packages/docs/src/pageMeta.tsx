export const SITE_URL = "https://router.funstack.work";

// Renders URL-related metadata for a page, derived from its route path.
// Title and description tags are colocated with each page component via
// PageHead instead.
export function PageMeta({ path }: { path: string }) {
  if (path === "/*") {
    // The 404 page has no canonical URL.
    return null;
  }
  const canonicalUrl = new URL(path, SITE_URL).href;
  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
    </>
  );
}
