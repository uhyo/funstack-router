"use client";

export function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <p>
        <a href="/funstack-router/" className="button primary">
          Go Home
        </a>
      </p>
    </div>
  );
}
