import { useNavigate } from "@funstack/router";

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>About</h1>
      <p>
        FUNSTACK Router is a modern React router built on the Navigation API.
      </p>
      <button onClick={() => navigate("/")}>Go Home (programmatic)</button>
    </div>
  );
}
