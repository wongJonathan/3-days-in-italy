import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type {
  LatLng,
  MapFocus,
  MapModel,
} from "../../utils/editor/map-model.ts";
import { COLORS } from "../../utils/colors.ts";

/**
 * Background tiles: OpenStreetMap's own tiles. Free, no key or account; the
 * credit line is required. OSM asks for light use only, which suits this app.
 * These tiles are the app's only network requests. (CARTO's quieter style is
 * an option for later: see FUTURE.md.)
 */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Every pin made so far, by number, warning and highlight. react-leaflet
 * rebuilds a marker's DOM whenever its `icon` prop is a new object, so each
 * pin is created once and reused on every render. There are only a few (one
 * per Stop number, with or without a Warning or highlight), so the cache
 * stays tiny.
 */
const pins = new Map<string, L.DivIcon>();

/** A numbered pin matching the Stop card's badge. HTML, so no image files are needed. */
const pinIcon = (
  number: number,
  hasWarning: boolean,
  active: boolean,
): L.DivIcon => {
  const key = `${number}-${hasWarning}-${active}`;
  let pin = pins.get(key);
  if (!pin) {
    // The highlighted pin is bigger; the anchors keep it centred on its spot.
    const size = active ? 36 : 28;
    const classes = ["map-pin", active && "map-pin--active"].filter(Boolean);
    pin = L.divIcon({
      className: "",
      html: `<span class="${classes.join(" ")}">${number}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [size / 2, 0],
    });
    pins.set(key, pin);
  }
  return pin;
};

/**
 * Moves the view. When the day's focus changes, it fits the day (Leaflet only
 * reads `center` once, on creation). Otherwise, when a highlighted pin is
 * given (Trip Overview), it pans only if that pin has left the view, so
 * scrolling through a day doesn't make the map jump at every Stop.
 * One effect does both: a separate pan could interrupt the fit's animation.
 */
const FocusView = ({
  focus,
  active,
}: {
  focus: MapFocus;
  active: LatLng | null;
}) => {
  const map = useMap();
  // A new `focus` object arrives on every render, so the effect depends on its
  // text instead: it re-runs only when the focus really changes.
  const key = JSON.stringify(focus);
  const fitted = useRef<string | null>(null);
  const lat = active?.[0];
  const lng = active?.[1];
  useEffect(() => {
    if (fitted.current !== key) {
      fitted.current = key;
      const target = JSON.parse(key) as MapFocus;
      if (target.kind === "fit") {
        map.fitBounds(target.bounds, { padding: [32, 32] });
      } else {
        map.setView(target.center, target.zoom);
      }
      return;
    }
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
  }, [map, key, lat, lng]);
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

type Props = {
  model: MapModel;
  label: string;
  /** The highlighted Stop (Trip Overview): a bigger pin, kept in view. */
  activeId?: string | null;
  /** Called with the Stop's Place id when its pin is clicked. */
  onPinClick?: (placeId: string) => void;
};

/** The open day on a map: numbered pins and dashed straight lines (design doc §3.2). */
const DayMap = ({ model, label, activeId = null, onPinClick }: Props) => (
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
          icon={pinIcon(m.number, m.hasWarning, m.placeId === activeId)}
          zIndexOffset={m.placeId === activeId ? 1000 : 0}
          eventHandlers={
            onPinClick ? { click: () => onPinClick(m.placeId) } : undefined
          }
          title={`${m.number}. ${m.name}`}
          alt={`${m.number}. ${m.name}`}
        >
          <Tooltip>
            {m.number}. {m.name}
          </Tooltip>
        </Marker>
      ))}
      <FocusView
        focus={model.focus}
        active={
          model.markers.find((m) => m.placeId === activeId)?.position ?? null
        }
      />
      <ResizeWatcher />
    </MapContainer>
  </div>
);

// Default export so React.lazy can load it (and Leaflet) as a separate file.
export default DayMap;
