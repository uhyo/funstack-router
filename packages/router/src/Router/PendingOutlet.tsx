import { type ReactNode, use } from "react";

export type PendingOutletProps = {
  promise: Promise<void>;
};

export function PendingOutlet({ promise }: PendingOutletProps): ReactNode {
  use(promise);
  return null;
}
