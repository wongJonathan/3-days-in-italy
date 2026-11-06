import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { MapFocus, MapModel } from "../editor/map-model.ts";
import { COLORS } from "./tokens.ts";

/**
 * Background tiles: OpenStreetMap's own tiles. Free, no key or account; the
 * credit line is required. OSM asks for light use only, which suits this app.
 * These tiles are the app's only network requests. (CARTO's quieter style is
 * an option for later: see FUTURE.md.)
 */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** A numbered pin matching the Stop card's badge. HTML, so no image files are needed. */
const pinIcon = (number: number, hasWarning: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="map-pin${hasWarning ? " map-pin--warning" : ""}">${number}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [14, 0],
  });

/** Moves the view when the day's focus changes (Leaflet only reads `center` once, on creation). */
const FocusView = ({ focus }: { focus: MapFocus }) => {
  const map = useMap();
  // A new `focus` object arrives on every render, so the effect depends on its
  // text instead: it re-runs only when the focus really changes.
  const key = JSON.stringify(focus);
  useEffect(() => {
    const target = JSON.parse(key) as MapFocus;
    if (target.kind === "fit") {
      map.fitBounds(target.bounds, { padding: [32, 32] });
    } else {
      map.setView(target.center, target.zoom);
    }
  }, [map, key]);
  return null;
};

/**
 * Leaflet measures its box once. On narrow screens the map can start inside a
 * hidden tab (0 × 0), so it redraws whenever its box changes size, e.g. when
 * the Map tab is shown or the window is resized.
 */
const ResizeWatcher = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

type Props = { model: MapModel; label: string };

/** The open day on a map: numbered pins and dashed straight lines (design doc §3.2). */
const DayMap = ({ model, label }: Props) => (
  <div className="map" role="region" aria-label={label}>
    <MapContainer
      center={[42.5, 12.5]}
      zoom={6}
      scrollWheelZoom={false}
      className="map__canvas"
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      {model.path.length > 1 && (
        // Dashed: an estimate between two points, not a route (design doc §3.2).
        <Polyline
          positions={model.path}
          pathOptions={{ color: COLORS.accent, weight: 3, dashArray: "6 8" }}
        />
      )}
      {model.markers.map((m) => (
        <Marker
          key={m.placeId}
          position={m.position}
          icon={pinIcon(m.number, m.hasWarning)}
          title={`${m.number}. ${m.name}`}
          alt={`${m.number}. ${m.name}`}
        >
          <Tooltip>
            {m.number}. {m.name}
          </Tooltip>
        </Marker>
      ))}
      <FocusView focus={model.focus} />
      <ResizeWatcher />
    </MapContainer>
  </div>
);

// Default export so React.lazy can load it (and Leaflet) as a separate file.
export default DayMap;
