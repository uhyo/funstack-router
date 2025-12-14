// Navigation API type definitions
// https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API

interface NavigationHistoryEntry {
  readonly url: string | null;
  readonly key: string;
  readonly id: string;
  readonly index: number;
  readonly sameDocument: boolean;
  getState(): unknown;
}

interface NavigationDestination {
  readonly url: string;
  readonly key: string;
  readonly id: string;
  readonly index: number;
  readonly sameDocument: boolean;
  getState(): unknown;
}

interface NavigateEvent extends Event {
  readonly navigationType: "push" | "replace" | "reload" | "traverse";
  readonly destination: NavigationDestination;
  readonly canIntercept: boolean;
  readonly userInitiated: boolean;
  readonly hashChange: boolean;
  readonly signal: AbortSignal;
  readonly formData: FormData | null;
  readonly downloadRequest: string | null;
  readonly info: unknown;
  readonly hasUAVisualTransition: boolean;
  intercept(options?: NavigationInterceptOptions): void;
  scroll(): void;
}

interface NavigationInterceptOptions {
  handler?: () => Promise<void>;
  precommitHandler?: () => Promise<void>;
  focusReset?: "after-transition" | "manual";
  scroll?: "after-transition" | "manual";
}

interface NavigationResult {
  committed: Promise<NavigationHistoryEntry>;
  finished: Promise<NavigationHistoryEntry>;
}

interface NavigationNavigateOptions {
  state?: unknown;
  history?: "auto" | "push" | "replace";
  info?: unknown;
}

interface Navigation extends EventTarget {
  readonly currentEntry: NavigationHistoryEntry | null;
  readonly transition: NavigationTransition | null;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  entries(): NavigationHistoryEntry[];
  navigate(url: string, options?: NavigationNavigateOptions): NavigationResult;
  reload(options?: NavigationReloadOptions): NavigationResult;
  traverseTo(key: string, options?: NavigationOptions): NavigationResult;
  back(options?: NavigationOptions): NavigationResult;
  forward(options?: NavigationOptions): NavigationResult;
  updateCurrentEntry(options: NavigationUpdateCurrentEntryOptions): void;
  addEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
    options?: AddEventListenerOptions,
  ): void;
  addEventListener(
    type: "navigatesuccess" | "navigateerror" | "currententrychange",
    listener: (event: Event) => void,
    options?: AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
    options?: EventListenerOptions,
  ): void;
  removeEventListener(
    type: "navigatesuccess" | "navigateerror" | "currententrychange",
    listener: (event: Event) => void,
    options?: EventListenerOptions,
  ): void;
}

interface NavigationTransition {
  readonly navigationType: "push" | "replace" | "reload" | "traverse";
  readonly from: NavigationHistoryEntry;
  readonly finished: Promise<void>;
}

interface NavigationOptions {
  info?: unknown;
}

interface NavigationReloadOptions extends NavigationOptions {
  state?: unknown;
}

interface NavigationUpdateCurrentEntryOptions {
  state: unknown;
}

declare const navigation: Navigation;

// URLPattern API type definitions
// https://developer.mozilla.org/en-US/docs/Web/API/URLPattern

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

interface URLPatternResult {
  inputs: [URLPatternInit] | [URLPatternInit, string];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

declare class URLPattern {
  constructor(input?: URLPatternInit | string, baseURL?: string);
  constructor(input: URLPatternInit, options?: URLPatternOptions);

  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;

  test(input?: URLPatternInit | string, baseURL?: string): boolean;
  exec(
    input?: URLPatternInit | string,
    baseURL?: string,
  ): URLPatternResult | null;
}

interface URLPatternOptions {
  ignoreCase?: boolean;
}
