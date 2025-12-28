import { useLocation } from "@funstack/router";
import type { CSSProperties, ReactNode } from "react";

/**
 * Example: Active Link Styling with useLocation
 *
 * A navigation link component that highlights when the current route matches.
 * Uses useLocation() to detect the current path and apply active styles.
 */

type Props = {
  href: string;
  children: ReactNode;
  /** Match strategy: 'exact' or 'prefix' */
  match?: "exact" | "prefix";
};

const baseStyle: CSSProperties = {
  padding: "0.5rem 1rem",
  textDecoration: "none",
  borderRadius: "4px",
  transition: "background-color 0.2s",
};

const inactiveStyle: CSSProperties = {
  ...baseStyle,
  color: "#333",
  backgroundColor: "transparent",
};

const activeStyle: CSSProperties = {
  ...baseStyle,
  color: "white",
  backgroundColor: "#007bff",
};

export function NavLink({ href, children, match = "exact" }: Props) {
  const location = useLocation();

  const isActive =
    match === "exact"
      ? location.pathname === href
      : location.pathname.startsWith(href);

  return (
    <a href={href} style={isActive ? activeStyle : inactiveStyle}>
      {children}
    </a>
  );
}
