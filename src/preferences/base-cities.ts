import { distanceKm, type Coordinates } from "../travel/travel-time.ts";

/** The 5 cities a Trip Area is built from. Every other town belongs to its nearest one. */
export type BaseCity = "Rome" | "Florence" | "Milan" | "Venice" | "Bologna";

/** City-centre coordinates, in a fixed order that also breaks ties. */
export const BASE_CITIES: Record<BaseCity, Coordinates> = {
  Rome: { latitude: 41.9028, longitude: 12.4964 },
  Florence: { latitude: 43.7696, longitude: 11.2558 },
  Milan: { latitude: 45.4642, longitude: 9.19 },
  Venice: { latitude: 45.4408, longitude: 12.3155 },
  Bologna: { latitude: 44.4949, longitude: 11.3426 },
};

export const BASE_CITY_NAMES = Object.keys(BASE_CITIES) as BaseCity[];

/**
 * Towns whose nearest base city by road differs from the straight-line answer.
 * Checked by a person on Google Maps.
 */
const ROAD_OVERRIDES: Record<string, BaseCity> = {
  // Straight-line: Bologna 90 km, Venice 105 km. By road, Venice is closer.
  "Isola della Scala": "Venice",
};

const isBaseCity = (city: string): city is BaseCity => city in BASE_CITIES;

/**
 * The base city a Place belongs to: its own city if that is a base city,
 * then any road override, otherwise the nearest one in a straight line
 * (Siena → Florence, Como → Milan).
 */
export const baseCityOf = (place: Coordinates & { city: string }): BaseCity => {
  if (isBaseCity(place.city)) return place.city;
  const override = ROAD_OVERRIDES[place.city];
  if (override) return override;
  // reduce keeps the first city on a tie, so BASE_CITIES order breaks ties.
  return BASE_CITY_NAMES.reduce((nearest, city) =>
    distanceKm(place, BASE_CITIES[city]) <
    distanceKm(place, BASE_CITIES[nearest])
      ? city
      : nearest,
  );
};
