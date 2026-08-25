import { PageHead } from "../components/PageHead.js";

export function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <PageHead
        title="Page Not Found"
        description="The page you were looking for does not exist."
      />
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <p>
        <a href="/" className="button primary">
          Go Home
        </a>
      </p>
    </div>
  );
}
