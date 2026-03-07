import { use, type FC } from "react";

export const PendingOutlet: FC<{
  promise: Promise<unknown>;
}> = ({ promise }) => {
  use(promise);
  return null;
};
