import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NavigationAPIAdapter } from "../core/NavigationAPIAdapter.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { route } from "../route.js";
import { internalRoutes } from "../types.js";
import { clearLoaderCache } from "../core/loaderCache.js";

const routes = internalRoutes([
  { path: "/", component: () => null },
  { path: "/about", component: () => null },
  { path: "/contact", component: () => null },
]);

let mockNav: ReturnType<typeof setupNavigationMock>;
let adapter: NavigationAPIAdapter;

beforeEach(() => {
  mockNav = setupNavigationMock("http://localhost/");
  adapter = new NavigationAPIAdapter();
});

afterEach(() => {
  cleanupNavigationMock();
  clearLoaderCache();
});

describe("WebKit Private Browsing simulation", () => {
  it("getSnapshot returns the destination URL even when currentEntry stays stale", async () => {
    adapter.setupInterception(() => routes);
    const initialEntryId = mockNav.currentEntry.id;

    await mockNav.__simulateInterceptedNavigation("http://localhost/about", {
      privateBrowsing: true,
    });

    expect(mockNav.currentEntry.id).toBe(initialEntryId);
    expect(mockNav.currentEntry.url).toBe("http://localhost/");
    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/about");
  });

  it("subsequent intercepted navigations update the resolved URL", async () => {
    adapter.setupInterception(() => routes);

    await mockNav.__simulateInterceptedNavigation("http://localhost/about", {
      privateBrowsing: true,
    });
    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/about");

    await mockNav.__simulateInterceptedNavigation("http://localhost/contact", {
      privateBrowsing: true,
    });
    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/contact");
  });

  it("notifies subscribers via navigatesuccess when currententrychange does not fire", async () => {
    const seen: string[] = [];
    adapter.subscribe(() => {
      seen.push(adapter.getSnapshot()?.url.href ?? "<null>");
    });
    adapter.setupInterception(() => routes);

    await mockNav.__simulateInterceptedNavigation("http://localhost/about", {
      privateBrowsing: true,
    });

    expect(seen).toEqual(["http://localhost/about"]);
  });
});

describe("#committedDestination scoping", () => {
  it("does not leak across unrelated traversals", async () => {
    adapter.setupInterception(() => routes);

    await mockNav.__simulateInterceptedNavigation("http://localhost/about");
    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/about");

    mockNav.__simulateTraversal(0);

    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/");
  });

  it("does not leak when subsequent non-intercepted navigation changes entry id", async () => {
    adapter.setupInterception(() => routes);

    await mockNav.__simulateInterceptedNavigation("http://localhost/about");
    mockNav.__simulateNavigation("http://localhost/contact");

    expect(adapter.getSnapshot()?.url.href).toBe("http://localhost/contact");
  });
});

describe("dispose cleanup with composite cache keys", () => {
  it("clears entry-scoped loader cache when an entry is disposed", async () => {
    let loaderCalls = 0;
    const routesWithLoader = internalRoutes([
      route({
        path: "/about",
        component: () => null,
        loader: () => {
          loaderCalls += 1;
          return { ok: true };
        },
      }),
    ]);

    adapter.setupInterception(() => routesWithLoader);

    await mockNav.__simulateInterceptedNavigation("http://localhost/about");
    expect(loaderCalls).toBe(1);

    const aboutEntry = mockNav.__getEntry(1);
    aboutEntry.__dispose();

    await mockNav.__simulateInterceptedNavigation("http://localhost/about");
    expect(loaderCalls).toBe(2);
  });
});
