import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>FUNSTACK Router - Documentation</title>
        <meta
          name="description"
          content="Modern React router built on the Navigation API"
        />
        <meta property="og:title" content="FUNSTACK Router" />
        <meta
          property="og:description"
          content="Modern React router built on the Navigation API"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://router.funstack.work/" />
        <meta property="og:site_name" content="FUNSTACK Router" />
        <meta
          property="og:image"
          content="https://router.funstack.work/FUNSTACK_Router_Hero_small.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FUNSTACK Router" />
        <meta
          name="twitter:description"
          content="Modern React router built on the Navigation API"
        />
        <meta
          name="twitter:image"
          content="https://router.funstack.work/FUNSTACK_Router_Hero_small.png"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
