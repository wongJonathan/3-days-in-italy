import type { CleanPlace } from "../data/place.ts";
import { BASE_CITIES } from "../preferences/base-cities.ts";
import type { ScheduledDay } from "../schedule/schedule.ts";
import type { Trip } from "../trip/trip.ts";

export type LatLng = [latitude: number, longitude: number];

/** A numbered pin; `number` matches the Stop card's badge. */
export type MapMarker = {
  placeId: string;
  number: number;
  name: string;
  position: LatLng;
  /** The Stop has a Warning, so the pin is marked too. */
  hasWarning: boolean;
};

/**
 * What the map should show:
 * - fit:    zoom to these corners (south-west, north-east);
 * - center: no Stops to fit, so centre here at this zoom.
 */
export type MapFocus =
  | { kind: "fit"; bounds: [LatLng, LatLng] }
  | { kind: "center"; center: LatLng; zoom: number };

export type MapModel = {
  markers: MapMarker[];
  /** Straight dashed lines between Stops, in order: an estimate, not a route. */
  path: LatLng[];
  focus: MapFocus;
};

/** Roughly the middle of Italy, for a day with no Stops and no city. */
const ITALY: LatLng = [42.5, 12.5];
const ITALY_ZOOM = 6;
const CITY_ZOOM = 13;
/** One Stop: zoom in on it, rather than "fitting" a single point. */
const SINGLE_STOP_ZOOM = 15;

/** The pins, path and view for the open day's map (design doc §3.2). */
export const dayMapModel = (
  trip: Trip,
  dayIndex: number,
  schedule: ScheduledDay | null,
  placesById: Map<string, CleanPlace>,
): MapModel => {
  const markers: MapMarker[] = (schedule?.stops ?? []).flatMap((stop, i) => {
    const place = placesById.get(stop.placeId);
    return place
      ? [
          {
            placeId: place.id,
            number: i + 1,
            name: place.name,
            position: [place.latitude, place.longitude] as LatLng,
            hasWarning: stop.warnings.length > 0,
          },
        ]
      : [];
  });
  const path = markers.map((m) => m.position);
  return { markers, path, focus: focusFor(trip, dayIndex, path) };
};

const focusFor = (trip: Trip, dayIndex: number, points: LatLng[]): MapFocus => {
  if (points.length === 1) {
    return { kind: "center", center: points[0], zoom: SINGLE_STOP_ZOOM };
  }
  if (points.length > 1) {
    const latitudes = points.map(([lat]) => lat);
    const longitudes = points.map(([, lng]) => lng);
    return {
      kind: "fit",
      bounds: [
        [Math.min(...latitudes), Math.min(...longitudes)],
        [Math.max(...latitudes), Math.max(...longitudes)],
      ],
    };
  }
  // No Stops: the day's city (a pinned Day Area wins, as in the Place list).
  const day = trip.days[dayIndex];
  const city = day.dayArea ?? day.plan?.baseCity;
  if (city) {
    const { latitude, longitude } = BASE_CITIES[city];
    return { kind: "center", center: [latitude, longitude], zoom: CITY_ZOOM };
  }
  return { kind: "center", center: ITALY, zoom: ITALY_ZOOM };
};
