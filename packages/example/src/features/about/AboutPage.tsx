export function AboutPage() {
  return (
    <div>
      <h1>About</h1>
      <p>
        FUNSTACK Router is a modern React router built on the Navigation API.
      </p>
      <button onClick={() => navigation.navigate("/")}>
        Go Home (programmatic)
      </button>
    </div>
  );
}
