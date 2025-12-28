import { routeState } from "@funstack/router";
import { CounterPage } from "./CounterPage";

type CounterState = {
  count: number;
  lastUpdated: string;
};

export const counterRoute = routeState<CounterState>()({
  path: "counter",
  component: CounterPage,
});
