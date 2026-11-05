import type { PriceLevel } from "../scoring/budget.ts";
import type { TransportMode } from "../travel/travel-time.ts";
import type { BaseCity } from "./base-cities.ts";
import type { Interest } from "./interests.ts";

/** How full each Trip Day is. */
export type Pace = "relaxed" | "balanced" | "packed";

/** Sights per day for each Pace. Meal Stops come on top. */
export const SIGHTS_PER_PACE: Record<Pace, number> = {
  relaxed: 3,
  balanced: 4,
  packed: 6,
};

/** Everything the traveler can tell us before generating. Every part is optional. */
export type Preferences = {
  interests: Interest[];
  pace: Pace;
  /** Target price level; null means no Budget. */
  budget: PriceLevel | null;
  mode: TransportMode;
  lunch: boolean;
  dinner: boolean;
  /** Place ids that are always included. */
  mustSees: string[];
  /** Base cities for the whole Trip; empty means "choose for me". */
  tripArea: BaseCity[];
};

/** What a Start Date alone gets: no Interests, balanced, no meals, choose the city for me. */
export const DEFAULT_PREFERENCES: Preferences = {
  interests: [],
  pace: "balanced",
  budget: null,
  mode: "public-transport",
  lunch: false,
  dinner: false,
  mustSees: [],
  tripArea: [],
};
