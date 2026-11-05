/** How the traveler gets between distant Stops. Short hops are always on foot or local transit. */
export type TransportMode = "public-transport" | "rental-car";

export type TravelBand = "walk" | "in-city" | "regional" | "intercity";

export type Coordinates = { latitude: number; longitude: number };

/** Where a Stop is: its coordinates, plus its city (some cities have no cars). */
export type TravelPoint = Coordinates & { city: string };

/** An estimate, always shown as "est.": straight-line distance, not real routing. */
export type TravelTime = { minutes: number; band: TravelBand; km: number };

/**
 * One way of covering distance:
 * - overhead: fixed minutes (walk to a stop and wait, get through a station, park).
 * - kmh:      average speed while moving.
 * - detour:   real route length ÷ straight-line distance (streets and roads aren't straight).
 */
type Leg = { overhead: number; kmh: number; detour: number };

const WALK: Leg = { overhead: 0, kmh: 5, detour: 1.3 };
const LOCAL_TRANSIT: Leg = { overhead: 10, kmh: 15, detour: 1.3 };

/**
 * Distance bands, shortest first. A band covers distances from the previous band's
 * `upToKm` (inclusive) up to its own `upToKm` (exclusive).
 * Inside a city the Transport Mode doesn't matter: nobody drives 2 km in Rome.
 */
const BANDS: {
  band: TravelBand;
  upToKm: number;
  legs: Record<TransportMode, Leg>;
}[] = [
  {
    band: "walk",
    upToKm: 1.5,
    legs: { "public-transport": WALK, "rental-car": WALK },
  },
  {
    band: "in-city",
    upToKm: 8,
    legs: { "public-transport": LOCAL_TRANSIT, "rental-car": LOCAL_TRANSIT },
  },
  {
    band: "regional",
    upToKm: 60,
    legs: {
      "public-transport": { overhead: 30, kmh: 40, detour: 1 },
      "rental-car": { overhead: 15, kmh: 60, detour: 1.3 },
    },
  },
  {
    band: "intercity",
    upToKm: Infinity,
    legs: {
      "public-transport": { overhead: 45, kmh: 120, detour: 1 },
      "rental-car": { overhead: 15, kmh: 90, detour: 1.25 },
    },
  },
];

const EARTH_RADIUS_KM = 6371;

/** Great-circle ("as the crow flies") distance, using the haversine formula. */
export const distanceKm = (a: Coordinates, b: Coordinates): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/** The core estimate: overhead + time moving, rounded up to a whole minute. */
export const minutesForDistance = (
  km: number,
  mode: TransportMode,
): { minutes: number; band: TravelBand } => {
  if (!(km >= 0)) throw new Error(`Invalid distance: ${km} km.`);
  if (km === 0) return { minutes: 0, band: "walk" };

  const { band, legs } = BANDS.find((b) => km < b.upToKm)!;
  const leg = legs[mode];
  const minutes = leg.overhead + (km * leg.detour * 60) / leg.kmh;
  return { minutes: Math.ceil(minutes), band };
};

/** Cities with no roads for cars. A trip touching one always uses Public Transport times. */
const CAR_FREE_CITIES = new Set(["Venice", "Burano"]);

/** The one function the rest of the app uses for Travel Time. Swap its insides for real routing later. */
export const travelTime = (
  from: TravelPoint,
  to: TravelPoint,
  mode: TransportMode,
): TravelTime => {
  const km = distanceKm(from, to);
  const carFree =
    CAR_FREE_CITIES.has(from.city) || CAR_FREE_CITIES.has(to.city);
  const effectiveMode = carFree ? "public-transport" : mode;
  return { ...minutesForDistance(km, effectiveMode), km };
};
