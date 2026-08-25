const SITE_NAME = "FUNSTACK Router";

export interface PageHeadProps {
  /** Page-specific title. Omit for the home page, which uses the site-wide title. */
  title?: string;
  description: string;
}

// Renders a page's title and description metadata. React 19 hoists
// title/meta tags rendered anywhere in the tree into <head>, both in
// pre-rendered HTML and on client-side navigation. Colocate this with each
// page component; URL-related tags (canonical, og:url) are rendered per
// route in App.tsx via PageMeta.
export function PageHead({ title, description }: PageHeadProps) {
  const fullTitle =
    title === undefined ? `${SITE_NAME} - Documentation` : `${title} | ${SITE_NAME}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </>
  );
}
