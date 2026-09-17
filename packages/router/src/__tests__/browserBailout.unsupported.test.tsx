import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { Router } from "../Router/index.js";
import { route, type RouteDefinition } from "../route.js";

// Simulate a React build that predates the browser() API (React 19.2 or
// earlier) by removing the export from react-dom, so these tests don't
// depend on which react-dom version is installed in this repo.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, browser: undefined };
});

function makeRoutes(): RouteDefinition[] {
  return [route({ component: () => <div>shell</div> })];
}

describe("pathlessSSROutletDeferral (browser() unsupported)", () => {
  it("throws when opted in on a React build without the browser() API", () => {
    expect(() =>
      renderToString(
        <Router routes={makeRoutes()} features={{ pathlessSSROutletDeferral: true }} />,
      ),
    ).toThrowError(/pathlessSSROutletDeferral.*browser\(\)/s);
  });

  it("does not throw when not opted in", () => {
    const html = renderToString(<Router routes={makeRoutes()} />);
    expect(html).toContain("shell");
  });
});
