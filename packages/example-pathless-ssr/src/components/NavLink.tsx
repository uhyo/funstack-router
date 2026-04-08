"use client";

import { useLocation } from "@funstack/router";
import { useState, useEffect, type ReactNode } from "react";

type NavLinkProps = {
  href: string;
  className: string;
  activeClassName: string;
  exact?: boolean;
  children: ReactNode;
};

/**
 * NavLink with active styling that works with pathless SSR.
 *
 * During SSR (without the `ssr` prop), `useLocation` is not available because
 * the URL is null. We defer active-class logic to a child component that only
 * mounts after hydration, so `useLocation` is never called during SSR.
 */
export function NavLink(props: NavLinkProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  if (isClient) {
    return <ActiveNavLink {...props} />;
  }

  // During SSR or initial hydration render: plain link without active styling
  return (
    <a href={props.href} className={props.className}>
      {props.children}
    </a>
  );
}

function ActiveNavLink({
  href,
  className,
  activeClassName,
  exact,
  children,
}: NavLinkProps) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === href
    : location.pathname === href || location.pathname.startsWith(href);

  return (
    <a
      href={href}
      className={className + (isActive ? " " + activeClassName : "")}
    >
      {children}
    </a>
  );
}
