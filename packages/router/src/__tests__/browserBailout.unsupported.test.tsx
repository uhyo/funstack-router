import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { Router } from "../Router/index.js";
import { route, type RouteDefinition } from "../route.js";

// These tests run against the real react-dom installed in this repo (19.2),
// which predates the browser() API introduced in React 19.3.

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
