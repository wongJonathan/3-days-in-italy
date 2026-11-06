import { useSyncExternalStore } from "react";

/** Being in a browser never changes, so there is nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * True in a real browser. The map needs one (Leaflet uses `window`). During
 * server rendering (the Node smoke tests) the third function answers instead,
 * so Leaflet is never loaded there.
 */
export const useInBrowser = (): boolean =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
