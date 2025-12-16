import { CodeBlock } from "../components/CodeBlock";

export function GettingStartedPage() {
  return (
    <div className="page docs-page">
      <h1>Getting Started</h1>

      <section>
        <h2>Installation</h2>
        <p>Install the package using your preferred package manager:</p>
        <CodeBlock language="bash">{`npm install @funstack/router
# or
pnpm add @funstack/router
# or
yarn add @funstack/router`}</CodeBlock>
      </section>

      <section>
        <h2>Browser Support</h2>
        <p>
          FUNSTACK Router uses the{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API"
            target="_blank"
            rel="noopener noreferrer"
          >
            Navigation API
          </a>{" "}
          which is supported in Chrome 102+, Edge 102+, Firefox 147+, Safari
          26.2+, and Opera 88+.
        </p>
      </section>

      <section>
        <h2>Basic Setup</h2>
        <p>
          Create your routes using the <code>route</code> helper function and
          render them with the <code>Router</code> component:
        </p>
        <CodeBlock language="tsx">{`import { Router, route, Outlet } from "@funstack/router";

// Define your page components
function Home() {
  return <h1>Welcome Home</h1>;
}

function About() {
  return <h1>About Us</h1>;
}

function Layout() {
  return (
    <div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <Outlet />
    </div>
  );
}

// Define your routes
const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      route({ path: "/", component: Home }),
      route({ path: "/about", component: About }),
    ],
  }),
];

// Render the router
function App() {
  return <Router routes={routes} />;
}`}</CodeBlock>
      </section>

      <section>
        <h2>Route Parameters</h2>
        <p>
          Define dynamic segments in your paths using the <code>:param</code>{" "}
          syntax. Route components receive parameters via the{" "}
          <code>params</code> prop, which is fully typed based on the path
          pattern:
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

function UserProfile({ params }: { params: { userId: string } }) {
  return <h1>User: {params.userId}</h1>;
}

const routes = [
  route({
    path: "/users/:userId",
    component: UserProfile,
  }),
];`}</CodeBlock>
        <p>
          Alternatively, you can use the <code>useParams</code> hook to access
          parameters:
        </p>
        <CodeBlock language="tsx">{`import { useParams } from "@funstack/router";

function UserProfile() {
  const params = useParams<{ userId: string }>();
  return <h1>User: {params.userId}</h1>;
}`}</CodeBlock>
      </section>

      <section>
        <h2>Programmatic Navigation</h2>
        <p>
          Use the <code>useNavigate</code> hook for programmatic navigation:
        </p>
        <CodeBlock language="tsx">{`import { useNavigate } from "@funstack/router";

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/about");
  };

  return <button onClick={handleClick}>Go to About</button>;
}`}</CodeBlock>
      </section>

      <section>
        <h2>Data Loading</h2>
        <p>
          Use the <code>loader</code> option to fetch data before rendering a
          route. The component receives both <code>data</code> (from the loader)
          and <code>params</code> (from the URL) as props:
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

interface User {
  id: string;
  name: string;
}

function UserProfilePage({
  data,
  params,
}: {
  data: Promise<User>;
  params: { userId: string };
}) {
  const user = use(data);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile user={user} params={params} />
    </Suspense>
  );
}

function UserProfile({
  user,
  params,
}: {
  user: User;
  params: { userId: string };
}) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>User ID: {params.userId}</p>
    </div>
  );
}

const userRoute = route({
  path: "/users/:userId",
  component: UserProfilePage,
  loader: async ({ params }): Promise<User> => {
    const response = await fetch(\`/api/users/\${params.userId}\`);
    return response.json();
  },
});`}</CodeBlock>
      </section>
    </div>
  );
}
