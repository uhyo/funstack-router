import type { ReactNode } from "react";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Task Manager - FUNSTACK Router RSC Example</title>
        <meta
          name="description"
          content="RSC example app demonstrating two-phase route definitions"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
