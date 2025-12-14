import { useSearchParams } from "@funstack/router";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";

  return (
    <div>
      <h1>Search</h1>
      <p>
        <strong>Query:</strong> {query || "(none)"}
      </p>
      <p>
        <strong>Page:</strong> {page}
      </p>

      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) =>
            setSearchParams((prev) => {
              prev.set("q", e.target.value);
              return prev;
            })
          }
          placeholder="Search..."
          style={{ padding: "0.5rem", marginRight: "0.5rem" }}
        />
        <button
          onClick={() =>
            setSearchParams((prev) => {
              prev.set("page", String(Number(page) + 1));
              return prev;
            })
          }
        >
          Next Page
        </button>
      </div>
    </div>
  );
}
