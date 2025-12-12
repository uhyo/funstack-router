import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  forwardRef,
  useCallback,
} from "react";
import { useNavigate } from "./hooks/useNavigate.js";

export type LinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  /** The destination URL */
  to: string;
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** State to associate with the navigation */
  state?: unknown;
  children?: ReactNode;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, onClick, children, ...rest },
  ref,
) {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      // Call user's onClick handler if provided
      onClick?.(event);

      // Don't handle if default was prevented
      if (event.defaultPrevented) return;

      // Only need custom handling when state or replace is specified
      // Otherwise, let the Navigation API intercept the native navigation
      if (state !== undefined || replace) {
        // Don't handle modified clicks (new tab, etc.)
        if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
          return;
        }

        // Don't handle right clicks
        if (event.button !== 0) return;

        // Prevent default and navigate via Navigation API
        event.preventDefault();
        navigate(to, { replace, state });
      }
    },
    [navigate, to, replace, state, onClick],
  );

  return (
    <a ref={ref} href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});
