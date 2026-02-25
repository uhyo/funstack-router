"use client";

import { useLocation } from "@funstack/router";
import type { ReactNode } from "react";

export function NavLink({
  href,
  className,
  activeClassName,
  exact,
  children,
}: {
  href: string;
  className: string;
  activeClassName: string;
  exact?: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const pathname = location?.pathname ?? "/";
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href);

  return (
    <a
      href={href}
      className={className + (isActive ? " " + activeClassName : "")}
    >
      {children}
    </a>
  );
}
