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
      </head>
      <body>{children}</body>
    </html>
  );
}
