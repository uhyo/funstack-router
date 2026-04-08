import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recipe Book - FUNSTACK Router Pathless SSR Example</title>
        <meta
          name="description"
          content="Pathless SSR example app demonstrating shell rendering without the ssr prop"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
