import placesJson from "./italy-clean.json";
import type { CleanPlace } from "./place.ts";

/**
 * The clean dataset, bundled into the app at build time: no fetch, no backend.
 * The JSON is produced and checked by `npm run data:clean` and its tests,
 * so the cast is safe.
 */
export const PLACES = placesJson as CleanPlace[];
