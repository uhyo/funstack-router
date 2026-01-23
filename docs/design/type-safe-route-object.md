# `route()` helper enhancement design

The router provides a `route()` helper to support type-safe route definitions.

Currently, its return type is `OpaqueRouteDefinition` which does not carry any type information about the route (what is the available params? what is the type of state? etc).

I'd like to enhance the return type to be a generic type that carries this information.

## Detailed Design

### Phase 1

Currently, `OpaqueRouteDefinition` does not have any generic parameters.

A new type `TypefulOpaqueRouteDefinition` will be created that has three generic parameters: `Params`, `State`, and `Data`.

```ts
export interface TypefulOpaqueRouteDefinition<Params, State, Data> {
  [routeDefinitionSymbol]: {
    // Note: this field does not need to exist at runtime, it's only for type information
    // That's why it's in a symbol property
    params: Params;
    state: State;
    data: Data;
  };
  path: string;
  children?: RouteDefinition[];
}
```

Furthermore, each route definition can have an optional `id` property that uniquely identifies the route:

```ts
const routes = [
  route({ id: "home", ... }),
  route({ id: "about", ... }),
];
```

Then the `route` helper will be updated to return `TypefulOpaqueRouteDefinition` with appropriate generic parameters inferred from the route definition, **only if the `id` property is provided**.

The `id` property limitation is so that we can make the complex type inference opt-in.

If the `id` property is not provided, the return type will remain `OpaqueRouteDefinition`.

```ts
const routes = [
  route({ id: "home", ... }), // TypefulOpaqueRouteDefinition
  route({  ... }), // OpaqueRouteDefinition
];
```

### Phase 2

The typeful route definition objects can then be used in various router hooks and utilities to provide type-safe access to route parameters, state, and data.

A new `useRouteParams` hook will be created that takes a `TypefulOpaqueRouteDefinition` as an argument and returns the typed route parameters.

```ts
const userProfileRoute = route({
  id: "userProfile",
  path: "/users/:userId",
  // ...
});

const routes = [
  userProfileRoute,
  // ...
];

// userProfileRoute usage:
const { userId } = useRouteParams(userProfileRoute); // /users/:userId
```

Also `useRouteState` and `useRouteData` should be created similarly.

For runtime safety, these hooks will check if the current route's `id` matches the provided route definition's `id`. If they don't match, an error will be thrown.
