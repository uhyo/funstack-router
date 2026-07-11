import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Router } from "../Router/index.js";
import { route, type LoaderArgs } from "../route.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import { clearLoaderCache } from "../core/loaderCache.js";

// Integration tests for the interplay between <Router> rendering and the
// intercept handler during form submissions. The browser commits the entry
// (currententrychange) BEFORE the intercept handler runs the action, so the
// Router must not execute loaders (or render the new page) until the action
// has completed and loaders have re-executed with its result.
describe("action revalidation through <Router>", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
    clearLoaderCache();
  });

  afterEach(() => {
    cleanupNavigationMock();
    vi.restoreAllMocks();
  });

  function setup(action: () => unknown) {
    const loaderArgs: unknown[] = [];
    const loader = vi.fn(({ actionResult }: LoaderArgs<Record<string, never>, unknown>) => {
      loaderArgs.push(actionResult);
      return `loaded(actionResult=${String(actionResult)})`;
    });
    const routes = [
      route({ path: "/", component: () => <div data-testid="out">home</div> }),
      route({
        path: "/form",
        action,
        loader,
        component: ({ data }: { data: string }) => <div data-testid="out">{data}</div>,
      }),
    ];
    render(<Router routes={routes} />);

    // Simulate a POST form submission the way a browser sequences it:
    // navigate event (intercept registered) → commit/currententrychange →
    // intercept handler → navigatesuccess.
    const formData = new FormData();
    formData.set("x", "1");
    const { event, proceed } = mockNavigation.__simulateNavigationWithEvent(
      "http://localhost/form",
      { formData },
    );
    const interceptMock = event.intercept as ReturnType<typeof vi.fn>;
    expect(interceptMock).toHaveBeenCalledTimes(1);
    const handler = interceptMock.mock.calls[0][0].handler as () => Promise<void>;
    const fireNavigateSuccess = () => {
      mockNavigation
        .__getListeners("navigatesuccess")
        ?.forEach((listener) => listener(new Event("navigatesuccess")));
    };
    return { loader, loaderArgs, proceed, handler, fireNavigateSuccess };
  }

  it("renders post-action loader data after a slow action, executing the loader once", async () => {
    let resolveAction!: (value: string) => void;
    const action = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { loader, loaderArgs, proceed, handler, fireNavigateSuccess } = setup(action);

    // Commit the entry while the action is still pending: the old page must
    // stay up and the loader must not run yet.
    await act(async () => {
      proceed();
    });
    expect(screen.getByTestId("out")).toHaveTextContent("home");
    expect(loader).not.toHaveBeenCalled();

    const handlerDone = handler();
    expect(loader).not.toHaveBeenCalled();

    await act(async () => {
      resolveAction("OK");
      await handlerDone;
    });
    await act(async () => {
      fireNavigateSuccess();
    });

    expect(screen.getByTestId("out")).toHaveTextContent("loaded(actionResult=OK)");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loaderArgs).toEqual(["OK"]);
  });

  it("renders post-action loader data for an immediately-resolving action", async () => {
    const action = vi.fn(async () => "OK");
    const { loader, loaderArgs, proceed, handler, fireNavigateSuccess } = setup(action);

    await act(async () => {
      proceed();
      await handler();
    });
    await act(async () => {
      fireNavigateSuccess();
    });

    expect(screen.getByTestId("out")).toHaveTextContent("loaded(actionResult=OK)");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loaderArgs).toEqual(["OK"]);
  });

  it("does not leave the UI hanging when the action throws", async () => {
    const action = vi.fn(async () => {
      throw new Error("action failed");
    });
    const { proceed, handler, fireNavigateSuccess } = setup(action);

    await act(async () => {
      proceed();
    });
    await act(async () => {
      await expect(handler()).rejects.toThrow("action failed");
    });
    // In a real browser, navigateerror (not navigatesuccess) would fire here;
    // the point is that the pending deferred was released and the router
    // rendered the committed entry instead of waiting forever.
    await act(async () => {
      fireNavigateSuccess();
    });

    // The entry committed, the action failed before loaders ran, so the
    // loader executes at render time without an action result.
    expect(screen.getByTestId("out")).toHaveTextContent("loaded(actionResult=undefined)");
  });
});
