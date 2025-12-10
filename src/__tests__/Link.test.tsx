import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Router } from "../Router.js";
import { Link } from "../Link.js";
import { setupNavigationMock, cleanupNavigationMock } from "./setup.js";
import type { RouteDefinition } from "../types.js";

describe("Link", () => {
  let mockNavigation: ReturnType<typeof setupNavigationMock>;

  beforeEach(() => {
    mockNavigation = setupNavigationMock("http://localhost/");
  });

  afterEach(() => {
    cleanupNavigationMock();
  });

  const routes: RouteDefinition[] = [
    { path: "/", component: () => <div>Home</div> },
    { path: "/about", component: () => <div>About</div> },
  ];

  it("renders an anchor element", () => {
    render(
      <Router routes={routes}>
        <Link to="/about">Go to About</Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/about");
  });

  it("navigates on click", () => {
    render(
      <Router routes={routes}>
        <Link to="/about">Go to About</Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
      history: "push",
      state: undefined,
    });
  });

  it("uses replace when specified", () => {
    render(
      <Router routes={routes}>
        <Link to="/about" replace>
          Go to About
        </Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
      history: "replace",
      state: undefined,
    });
  });

  it("passes state to navigation", () => {
    const state = { from: "home" };

    render(
      <Router routes={routes}>
        <Link to="/about" state={state}>
          Go to About
        </Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("/about", {
      history: "push",
      state,
    });
  });

  it("does not navigate on modified clicks", () => {
    render(
      <Router routes={routes}>
        <Link to="/about">Go to About</Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });

    // Ctrl+click
    fireEvent.click(link, { ctrlKey: true });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    // Meta+click (Cmd on Mac)
    fireEvent.click(link, { metaKey: true });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    // Shift+click
    fireEvent.click(link, { shiftKey: true });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    // Alt+click
    fireEvent.click(link, { altKey: true });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it("does not navigate on right click", () => {
    render(
      <Router routes={routes}>
        <Link to="/about">Go to About</Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link, { button: 2 });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it("calls custom onClick handler", () => {
    const handleClick = vi.fn();

    render(
      <Router routes={routes}>
        <Link to="/about" onClick={handleClick}>
          Go to About
        </Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link);

    expect(handleClick).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalled();
  });

  it("respects preventDefault in custom onClick", () => {
    const handleClick = vi.fn((e: React.MouseEvent) => e.preventDefault());

    render(
      <Router routes={routes}>
        <Link to="/about" onClick={handleClick}>
          Go to About
        </Link>
      </Router>
    );

    const link = screen.getByRole("link", { name: "Go to About" });
    fireEvent.click(link);

    expect(handleClick).toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it("forwards ref to anchor element", () => {
    const ref = { current: null as HTMLAnchorElement | null };

    render(
      <Router routes={routes}>
        <Link to="/about" ref={ref}>
          Go to About
        </Link>
      </Router>
    );

    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
    expect(ref.current?.href).toContain("/about");
  });

  it("passes through additional props", () => {
    render(
      <Router routes={routes}>
        <Link to="/about" className="nav-link" data-testid="about-link">
          Go to About
        </Link>
      </Router>
    );

    const link = screen.getByTestId("about-link");
    expect(link).toHaveClass("nav-link");
  });
});

// Need to import vi for the test
import { vi } from "vitest";
