import { CodeBlock } from "../components/CodeBlock.js";

export function LearnTypeSafetyPage() {
  return (
    <div className="learn-content">
      <h2>Type Safety</h2>

      <p className="page-intro">
        FUNSTACK Router provides first-class TypeScript support, allowing you to
        access route params, navigation state, and loader data with full type
        safety. This guide covers two approaches: receiving typed data through
        component props (recommended) and accessing it through hooks.
      </p>

      <section>
        <h3>Why Type Safety Matters</h3>
        <p>
          Routing is one of the most common sources of runtime errors in web
          applications. Typos in parameter names, incorrect assumptions about
          data shapes, or forgetting to handle navigation state can lead to
          subtle bugs that are hard to track down.
        </p>
        <p>
          With FUNSTACK Router's type-safe approach, the TypeScript compiler
          catches these errors at build time. You get autocomplete for parameter
          names, type checking for loader data, and confidence that your route
          components receive exactly the data they expect.
        </p>
        <p>There are two ways to access typed route data:</p>
        <ul>
          <li>
            <strong>Props (Recommended)</strong> &mdash; Route components
            receive typed data directly as props. This is the simplest and most
            type-safe approach.
          </li>
          <li>
            <strong>Hooks</strong> &mdash; Use hooks like{" "}
            <code>useRouteParams</code> and <code>useRouteData</code> to access
            data anywhere in the component tree. This requires routes to have an{" "}
            <code>id</code> property.
          </li>
        </ul>
      </section>

      <section>
        <h3>Approach 1: Route Component Props (Recommended)</h3>

        <h4>Accessing Typed Params via Props</h4>
        <p>
          When you define a route with URL parameters, FUNSTACK Router
          automatically infers the parameter types from the path pattern. Your
          component receives these params as a typed <code>params</code> prop.
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

// Route definition with :userId parameter
const userRoute = route({
  path: "/users/:userId",
  component: UserPage,
});

// Component receives typed params automatically
function UserPage({ params }: { params: { userId: string } }) {
  return <h1>User: {params.userId}</h1>;
}`}</CodeBlock>
        <p>
          For explicit type annotations, use the{" "}
          <code>RouteComponentProps</code> type helper with your params type:
        </p>
        <CodeBlock language="tsx">{`import { route, RouteComponentProps } from "@funstack/router";

// Define component with explicit props type
function UserPage({ params }: RouteComponentProps<{ userId: string }>) {
  // params.userId is typed as string
  // params.nonExistent would be a TypeScript error
  return <h1>User: {params.userId}</h1>;
}

// Route definition - TypeScript validates the component props match the path
const userRoute = route({
  path: "/users/:userId",
  component: UserPage,
});`}</CodeBlock>
        <p>
          The <code>route()</code> function validates that your component's
          props match the path pattern. If you annotate <code>params</code> with{" "}
          <code>{`{ userId: string }`}</code> but the path is{" "}
          <code>/users/:id</code>, TypeScript will report an error.
        </p>

        <h4>Routes with Loaders</h4>
        <p>
          When your route has a loader function, the component receives the
          loader's return value as a <code>data</code> prop. The data can be
          wrapped in a Promise, in which case you unwrap it using React's{" "}
          <code>use()</code> hook. Use <code>RouteComponentPropsWithData</code>{" "}
          for routes with loaders.
        </p>
        <CodeBlock language="tsx">{`import { use, Suspense } from "react";
import { route, RouteComponentPropsWithData } from "@funstack/router";

interface User {
  id: string;
  name: string;
  email: string;
}

// Props type: RouteComponentPropsWithData<Params, Data, State?>
type UserPageProps = RouteComponentPropsWithData<
  { userId: string },
  Promise<User>
>;

// Inner component that uses the data
function UserPageContent({ params, data }: UserPageProps) {
  const user = use(data);  // Unwrap the Promise
  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}

// Outer component wraps with Suspense
function UserPage(props: UserPageProps) {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserPageContent {...props} />
    </Suspense>
  );
}

// Route definition
const userRoute = route({
  path: "/users/:userId",
  component: UserPage,
  loader: async ({ params }): Promise<User> => {
    const response = await fetch(\`/api/users/\${params.userId}\`);
    return response.json();
  },
});`}</CodeBlock>
        <p>
          The <code>data</code> prop is typed as{" "}
          <code>Promise&lt;User&gt;</code> based on the loader's return type.
          TypeScript ensures you handle the data shape correctly.
        </p>

        <h4>Routes with Navigation State</h4>
        <p>
          Navigation state lets you store data in a navigation entry that
          doesn't appear in the URL. Navigation state data is persisted across
          page reloads and history traversals (meaning it is available after
          user goes to another page and then uses the back button to returns to
          the current page). Use the <code>routeState</code> helper to define
          typed state for your routes.
        </p>
        <CodeBlock language="tsx">{`import { route, routeState, RouteComponentProps } from "@funstack/router";

// Define the state shape
interface ProductListState {
  page: number;
  sortBy: "name" | "price" | "date";
  filters: string[];
}

// Props type: RouteComponentProps<Params, State>
type ProductListProps = RouteComponentProps<
  Record<string, never>,  // No params for this route
  ProductListState
>;

function ProductListPage({
  state,
  setState,
  setStateSync,
  resetState,
}: ProductListProps) {
  // state is typed as ProductListState | undefined
  const page = state?.page ?? 1;
  const sortBy = state?.sortBy ?? "name";

  const handlePageChange = (newPage: number) => {
    // setState performs a navigation with the new state
    setState({ ...state, page: newPage });
  };

  const handleSortChange = (newSort: "name" | "price" | "date") => {
    // setStateSync updates state synchronously (replaces current entry)
    setStateSync({ ...state, sortBy: newSort });
  };

  const handleReset = () => {
    // resetState clears the navigation state
    resetState();
  };

  return (
    <div>
      <button onClick={() => handlePageChange(page + 1)}>
        Next Page
      </button>
      <button onClick={() => handleSortChange("price")}>
        Sort by Price
      </button>
      <button onClick={handleReset}>Reset Filters</button>
    </div>
  );
}

// Use routeState to create a typed route
const productListRoute = routeState<ProductListState>()(
  route({
    path: "/products",
    component: ProductListPage,
  })
);`}</CodeBlock>
        <p>
          The <code>routeState</code> helper adds four props to your component:
        </p>
        <ul>
          <li>
            <code>state</code> &mdash; The current navigation state (or{" "}
            <code>undefined</code> if not set)
          </li>
          <li>
            <code>setState</code> &mdash; Navigate to the same URL with new
            state (creates a new history entry)
          </li>
          <li>
            <code>setStateSync</code> &mdash; Update state synchronously without
            creating a new history entry
          </li>
          <li>
            <code>resetState</code> &mdash; Clear the navigation state
          </li>
        </ul>

        <h4>Combining Loader and State</h4>
        <p>
          You can use both loaders and navigation state together. The{" "}
          <code>routeState</code> helper works with routes that have loaders.
        </p>
        <CodeBlock language="tsx">{`import { use, Suspense } from "react";
import { route, routeState, RouteComponentPropsWithData } from "@funstack/router";

interface ProductListState {
  sortBy: "name" | "price";
}

interface Product {
  id: string;
  name: string;
  price: number;
}

// Props type: RouteComponentPropsWithData<Params, Data, State>
type Props = RouteComponentPropsWithData<
  Record<string, never>,
  Promise<Product[]>,
  ProductListState
>;

function ProductListContent({ data, state, setStateSync }: Props) {
  const products = use(data);
  const sortBy = state?.sortBy ?? "name";

  const sorted = [...products].sort((a, b) =>
    sortBy === "name"
      ? a.name.localeCompare(b.name)
      : a.price - b.price
  );

  return (
    <div>
      <select
        value={sortBy}
        onChange={(e) =>
          setStateSync({ sortBy: e.target.value as "name" | "price" })
        }
      >
        <option value="name">Sort by Name</option>
        <option value="price">Sort by Price</option>
      </select>
      <ul>
        {sorted.map((product) => (
          <li key={product.id}>
            {product.name} - \${product.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductListPage(props: Props) {
  return (
    <Suspense fallback={<div>Loading products...</div>}>
      <ProductListContent {...props} />
    </Suspense>
  );
}

// Route definition with both loader and state
const productListRoute = routeState<ProductListState>()(
  route({
    path: "/products",
    component: ProductListPage,
    loader: async (): Promise<Product[]> => {
      const response = await fetch("/api/products");
      return response.json();
    },
  })
);`}</CodeBlock>
      </section>

      <section>
        <h3>Approach 2: Hooks</h3>

        <h4>When to Use Hooks</h4>
        <p>
          While props are the recommended approach for most cases, hooks are
          useful when:
        </p>
        <ul>
          <li>
            <strong>Avoiding prop drilling</strong> &mdash; Deeply nested
            components need route data without passing props through every level
          </li>
          <li>
            <strong>Accessing parent route data</strong> &mdash; Child routes
            need to read data loaded by ancestor routes
          </li>
          <li>
            <strong>Using React Server Components</strong> &mdash; Route
            components cannot receive props directly
          </li>
        </ul>
        <p>
          <strong>Important:</strong> To use hooks with full type safety, routes
          must have an <code>id</code> property.
        </p>

        <h4>Setting Up Routes with IDs</h4>
        <p>
          Add an <code>id</code> property to routes you want to access via
          hooks. The ID can be any string, but using a descriptive name helps
          with debugging.
        </p>
        <CodeBlock language="tsx">{`import { route } from "@funstack/router";

const userRoute = route({
  id: "user",
  path: "/users/:userId",
  component: UserLayout,
  loader: async ({ params }) => {
    const response = await fetch(\`/api/users/\${params.userId}\`);
    return response.json();
  },
});

const userPostsRoute = route({
  id: "userPosts",
  path: "/posts",
  component: UserPostsPage,
});

// Use these routes in your route tree
const routes = [
  route({
    path: "/",
    component: Layout,
    children: [
      {
        ...userRoute,
        children: [userPostsRoute],
      },
    ],
  }),
];`}</CodeBlock>

        <h4>useRouteParams</h4>
        <p>
          The <code>useRouteParams</code> hook returns typed params for a
          specific route. It works with the current route or any ancestor route.
        </p>
        <CodeBlock language="tsx">{`import { useRouteParams } from "@funstack/router";

// In a deeply nested component
function UserAvatar() {
  // Pass the route definition to get typed params
  const params = useRouteParams(userRoute);
  // params.userId is typed as string

  return <img src={\`/avatars/\${params.userId}.png\`} alt="User avatar" />;
}`}</CodeBlock>

        <h4>useRouteState</h4>
        <p>
          The <code>useRouteState</code> hook returns the typed navigation state
          for a route. Returns <code>undefined</code> when no state is set.
        </p>
        <CodeBlock language="tsx">{`import { useRouteState } from "@funstack/router";

function FilterIndicator() {
  // Get typed state from the product list route
  const state = useRouteState(productListRoute);
  // state is typed as ProductListState | undefined

  if (!state?.filters?.length) {
    return null;
  }

  return (
    <div className="filter-badge">
      {state.filters.length} filters active
    </div>
  );
}`}</CodeBlock>

        <h4>useRouteData</h4>
        <p>
          The <code>useRouteData</code> hook returns the typed loader data for a
          route. This is particularly useful for accessing parent route data
          from child routes.
        </p>
        <CodeBlock language="tsx">{`import { use } from "react";
import { useRouteData } from "@funstack/router";

// Child route component accessing parent's data
function UserPostsPage() {
  // Access the parent route's loaded user data
  const userData = useRouteData(userRoute);
  const user = use(userData);

  return (
    <div>
      <h2>Posts by {user.name}</h2>
      {/* Render posts... */}
    </div>
  );
}`}</CodeBlock>
        <p>
          This pattern is especially powerful in nested routes where child
          components need access to data loaded by parent routes without prop
          drilling.
        </p>
      </section>

      <section>
        <h3>Route Definition Best Practices</h3>
        <p>
          To maximize developer experience and maintainability while also
          ensuring type safety, follow the below best practices when defining
          your routes:
        </p>
        <CodeBlock language="tsx">{`interface User {
  name: string;
}

// Define params and data
type Params = { userId: string };
type Data = Promise<User>;

// Use RouteComponentProps (or RouteComponentPropsWithData) to type your route component
type UserPageProps = RouteComponentPropsWithData<Params, Data>;

// Define the route
const userRoute = route({
  path: "/users/:userId",
  loader: async ({ params }): Data => {
    const response = await fetch(\`/api/users/\${params.userId}\`);
    return response.json();
  },
  component: UserPage,
});

// Now use it in your component
function UserPage({ params, data }: UserPageProps) {
  const user = use(data);
  return <h1>User: {user.name} (ID: {params.userId})</h1>;
}`}</CodeBlock>
        <p>Key techniques demonstrated here include:</p>
        <ul>
          <li>
            Defining explicit <code>Params</code> and <code>Data</code> types
            &mdash; requires minimal type checking effort while improving
            clarity
          </li>
          <li>
            Using <code>RouteComponentPropsWithData</code> to define component
            props
          </li>
        </ul>
        <p>
          TypeScript will validate that the route definition and component props
          remain in sync as you make changes over time.
        </p>
      </section>

      <section>
        <h3>Key Takeaways</h3>
        <ul>
          <li>
            Use <code>RouteComponentProps&lt;Params, State&gt;</code> or{" "}
            <code>RouteComponentPropsWithData&lt;Params, Data, State&gt;</code>{" "}
            for constructing route component prop types
          </li>
          <li>
            The <code>routeState</code> helper adds typed route state management
            to any route
          </li>
          <li>
            Hooks require routes to have an <code>id</code> property for type
            safety
          </li>
          <li>Use hooks to avoid prop drilling or access parent route data</li>
        </ul>
      </section>
    </div>
  );
}
