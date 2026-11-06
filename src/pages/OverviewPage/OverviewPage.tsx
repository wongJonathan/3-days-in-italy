import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useInBrowser } from "../../utils/browser.ts";
import type { CleanPlace } from "../../utils/data/place.ts";
import { countLabel } from "../../utils/editor/copy.ts";
import { dayMapModel } from "../../utils/editor/map-model.ts";
import {
  dayHeading,
  pickActive,
  readingLine,
  scrollTargetFor,
} from "../../utils/overview/overview.ts";
import { formatDate } from "../../utils/format.ts";
import { scheduleTrip, type Trip } from "../../stores/trip.ts";
import { Connector } from "../../components/DayView/Connector.tsx";
import { StopCard } from "../../components/DayView/StopCard.tsx";

/** Loaded as a separate file, like in the editor. */
const DayMap = lazy(() => import("../../components/DayMap/DayMap.tsx"));

/** Must match the narrow-screen breakpoint in index.css. */
const NARROW = "(max-width: 1023px)";

/** The day being read, and its highlighted Stop (-1 for a day with none). */
type Position = { day: number; stop: number };

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Where the reading line will be on screen at any scroll position (see
 * readingLine). Narrow screens: the list area starts under the map, which
 * scrolls up with the top bar and then pins to the top. The top bar is never
 * sticky, so its page position says where the map starts.
 */
const lineAt = (map: HTMLElement | null) => {
  const bar = map?.previousElementSibling;
  const narrow = map && bar && window.matchMedia(NARROW).matches;
  const mapHeight = narrow ? map.offsetHeight : 0;
  const mapBottom = narrow
    ? bar.getBoundingClientRect().bottom + window.scrollY + mapHeight
    : 0;
  return (scroll: number) =>
    readingLine({
      areaTop: narrow ? Math.max(mapHeight, mapBottom - scroll) : 0,
      viewportHeight: window.innerHeight,
      scrollY: scroll,
    });
};

const topsOf = (elements: Element[]) =>
  elements.map((e) => e.getBoundingClientRect().top);

/** Measures which day and Stop sit at the reading line. */
const measure = (list: HTMLElement, map: HTMLElement | null): Position => {
  const line = lineAt(map)(window.scrollY);
  const root = document.documentElement;
  // A couple of pixels' slack: zoomed pages can stop just short of the end.
  const atEnd = window.innerHeight + window.scrollY >= root.scrollHeight - 2;
  const days = [...list.querySelectorAll("[data-overview-day]")];
  const day = Math.max(0, pickActive(topsOf(days), line, atEnd));
  const cards = days[day]
    ? [...days[day].querySelectorAll("[data-overview-stop]")]
    : [];
  return { day, stop: pickActive(topsOf(cards), line, atEnd) };
};

/**
 * Follows the page scroll and reports the day and Stop at the reading line.
 * Measures at most once a frame, and only re-renders when the answer changes.
 */
const useReadingPosition = () => {
  const listRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ day: 0, stop: 0 });

  useEffect(() => {
    // The pending animation frame, if any (0 = none), so scrolling measures
    // at most once a frame.
    const pending = { frame: 0 };
    const update = () => {
      pending.frame = 0;
      if (!listRef.current) return;
      const next = measure(listRef.current, mapRef.current);
      setPosition((current) =>
        current.day === next.day && current.stop === next.stop ? current : next,
      );
    };
    const schedule = () => {
      if (!pending.frame) pending.frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(pending.frame);
    };
  }, []);

  /** Scrolls the page so this day's Stop card reaches the reading line. */
  const scrollToStop = useCallback((day: number, placeId: string) => {
    const card = listRef.current?.querySelector(
      `[data-overview-day="${day}"] [data-overview-stop="${CSS.escape(placeId)}"]`,
    );
    if (!card) return;
    window.scrollTo({
      top: scrollTargetFor({
        itemTop: card.getBoundingClientRect().top + window.scrollY,
        lineAt: lineAt(mapRef.current),
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      }),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  return { listRef, mapRef, position, scrollToStop };
};

type Props = {
  /** Every day is finalized (App only shows this page then). */
  trip: Trip;
  places: CleanPlace[];
  /** "Edit this trip": back to the editor, on this day. */
  onEdit: (day: number) => void;
  /** "Plan a new trip" (App confirms before deleting). */
  onNewTrip: () => void;
  /** App-wide banners (storage, removed Stops). */
  notices?: ReactNode;
};

export const OverviewPage = ({
  trip,
  places,
  onEdit,
  onNewTrip,
  notices,
}: Props) => {
  const placesById = useMemo(
    () => new Map(places.map((p) => [p.id, p])),
    [places],
  );
  const schedules = scheduleTrip(trip, placesById);
  const inBrowser = useInBrowser();
  const { listRef, mapRef, position, scrollToStop } = useReadingPosition();

  const current = position.day;
  const activeId =
    trip.days[current].plan?.stops[position.stop]?.placeId ?? null;
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;

  const mapPlaceholder = (
    <div className="map map--placeholder">Loading map…</div>
  );

  return (
    <div className="overview">
      {/* Scrolls away: after it, only the map and the day header stay pinned. */}
      <header className="overview__bar">
        {notices}
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Typography component="h1" variant="h5">
              Your trip
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(first)} – {formatDate(last)}
            </Typography>
          </div>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => onEdit(current)}>
              Edit this trip
            </Button>
            <Button variant="text" onClick={onNewTrip}>
              Plan a new trip
            </Button>
          </Stack>
        </Stack>
      </header>

      <div className="overview__map" ref={mapRef}>
        {inBrowser ? (
          <Suspense fallback={mapPlaceholder}>
            <DayMap
              model={dayMapModel(trip, current, schedules[current], placesById)}
              label={`Map of Day ${current + 1}`}
              activeId={activeId}
              onPinClick={(placeId) => scrollToStop(current, placeId)}
            />
          </Suspense>
        ) : (
          mapPlaceholder
        )}
      </div>

      <div className="overview__list" ref={listRef}>
        {trip.days.map((day, i) => {
          const plan = day.plan;
          const schedule = schedules[i];
          const stops = plan && schedule ? schedule.stops : [];
          const titleId = `overview-day-${i}`;
          return (
            <section
              key={day.date}
              className="overview-day"
              data-overview-day={i}
              aria-labelledby={titleId}
            >
              {/* Sticky, inside its own section: the next day's header pushes it up. */}
              <Typography
                id={titleId}
                component="h2"
                variant="h6"
                className="overview-day__header"
              >
                {dayHeading(i, day.date, plan?.baseCity ?? day.dayArea)}
                <span className="overview-day__count">
                  {" · "}
                  {countLabel(stops.length, "Stop")}
                </span>
              </Typography>

              {stops.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  Nothing planned
                </Typography>
              ) : (
                <Box
                  component="ol"
                  sx={{ listStyle: "none", m: 0, mt: 1, p: 0 }}
                >
                  {stops.map((scheduled, j) => (
                    <li
                      key={scheduled.placeId}
                      data-overview-stop={scheduled.placeId}
                    >
                      <Connector stop={scheduled} date={day.date} />
                      <StopCard
                        readOnly
                        number={j + 1}
                        place={placesById.get(scheduled.placeId)!}
                        planned={plan!.stops[j]}
                        scheduled={scheduled}
                        date={day.date}
                        prefs={trip.prefs}
                        selected={i === current && j === position.stop}
                        // Like a pin click: scroll it to the reading line,
                        // and the scroll tracking highlights it.
                        onSelect={() => scrollToStop(i, scheduled.placeId)}
                      />
                    </li>
                  ))}
                </Box>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
