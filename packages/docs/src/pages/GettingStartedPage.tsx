import { CodeBlock } from "../components/CodeBlock.js";

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
        <h2>AI Coding Agent Support</h2>
        <p>
          <code>@funstack/router</code> ships with an Agent skill that gives
          your coding assistant (Claude Code, Cursor, GitHub Copilot, etc.)
          knowledge about the router's API and best practices. Run:
        </p>
        <CodeBlock language="bash">{`npx -p @funstack/router funstack-router-skill-installer
# or
pnpm dlx --package @funstack/router funstack-router-skill-installer
# or
yarn dlx -p @funstack/router funstack-router-skill-installer`}</CodeBlock>
        <p>
          The installer will guide you through setting up the skill for your
          preferred AI agent. Alternatively, if you prefer{" "}
          <a href="https://skills.sh/" target="_blank">
            npx skills
          </a>
          , you can install it with:
        </p>
        <CodeBlock language="bash">{`npx skills add uhyo/funstack-router`}</CodeBlock>
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
          26.2+.
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
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile data={data} params={params} />
    </Suspense>
  );
}

function UserProfile({
  data,
  params,
}: {
  data: Promise<User>;
  params: { userId: string };
}) {
  const user = use(data);
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
