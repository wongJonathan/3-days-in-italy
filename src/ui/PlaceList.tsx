import { useState } from "react";
import type { CleanPlace } from "../data/place.ts";
import {
  emptyGroupText,
  formatDuration,
  groupTitle,
  hoursLabel,
  reasonLabel,
} from "../editor/copy.ts";
import {
  buildPlaceList,
  DEFAULT_FILTERS,
  type ListFilters,
  type ListRow,
  type ListScope,
} from "../editor/place-list.ts";
import { baseCityOf } from "../preferences/base-cities.ts";
import { INTERESTS, interestLabel } from "../preferences/interests.ts";
import { chipsFor } from "../scoring/score.ts";
import type { Trip, TripAction } from "../trip/trip.ts";
import { formatDate } from "./format.ts";

type Props = {
  trip: Trip;
  places: CleanPlace[];
  dispatch: (action: TripAction) => void;
};

const MAX_CHIPS = 3;

/** The search box id, so "Add places →" on an empty day can focus it. */
export const PLACE_SEARCH_ID = "place-search";

const toggle = <T,>(items: T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

/** The Place list for the open day: filters, budget groups, Add and Must-See (design doc §3.7). */
export const PlaceList = ({ trip, places, dispatch }: Props) => {
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [announcement, setAnnouncement] = useState("");
  const update = (changes: Partial<ListFilters>) =>
    setFilters((f) => ({ ...f, ...changes }));

  const dayIndex = trip.openDay;
  const day = trip.days[dayIndex];
  const list = buildPlaceList(trip, dayIndex, places, filters);
  // Same order as the list logic: a pinned Day Area wins.
  const dayCity = day.dayArea ?? day.plan?.baseCity;
  const total =
    list.groups.reduce((sum, g) => sum + g.rows.length, 0) +
    list.outside.length;
  // No Budget: one "All places" group, whose heading sits outside the scroll.
  const singleGroup = list.groups.length === 1 ? list.groups[0] : null;

  const add = (place: CleanPlace) => {
    dispatch({ type: "addPlace", day: dayIndex, placeId: place.id });
    setAnnouncement(`Added ${place.name} to Day ${dayIndex + 1}.`);
  };

  const row = (r: ListRow) => {
    const { place } = r;
    const isMustSee = trip.prefs.mustSees.includes(place.id);
    const chips = chipsFor(
      r.points === null
        ? { kind: "excluded", reason: "low-rating" }
        : { kind: "scored", points: r.points, reasons: r.reasons },
    );
    const city = baseCityOf(place);
    return (
      <li
        key={place.id}
        className={`place-row${r.availability.kind === "closed" ? " place-row--closed" : ""}`}
      >
        <div className="place-row__main">
          <span className="place-row__name">{place.name}</span>
          <span className="place-row__meta">
            {[
              place.type.replaceAll("_", " "),
              `★ ${place.rating}`,
              place.price_range,
              place.duration_minutes
                ? formatDuration(place.duration_minutes)
                : null,
              place.city !== city ? `${place.city} (near ${city})` : place.city,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="place-row__meta">
            {hoursLabel(place, r.availability)}
          </span>
          {chips.length > 0 && (
            <span className="place-row__meta">
              why: {chips.slice(0, MAX_CHIPS).map(reasonLabel).join(" · ")}
            </span>
          )}
          <span className="place-row__flags">
            {r.onOtherDays.map((i) => (
              <span key={i} className="tag tag--warning">
                Already planned for Day {i + 1} ({formatDate(trip.days[i].date)}
                )
              </span>
            ))}
            {r.points === null && (
              <span className="tag tag--quiet">Rated under 4.0</span>
            )}
          </span>
        </div>
        <div className="place-row__actions">
          <button
            type="button"
            className={`button button--small${isMustSee ? " button--on" : ""}`}
            aria-pressed={isMustSee}
            aria-label={`Must-See: ${place.name}`}
            title={
              isMustSee ? "Must-See (always included)" : "Make it a Must-See"
            }
            onClick={() =>
              dispatch({ type: "toggleMustSee", placeId: place.id })
            }
          >
            ★
          </button>
          <button
            type="button"
            className="button button--small"
            disabled={!day.plan}
            aria-label={`Add ${place.name} to Day ${dayIndex + 1}`}
            onClick={() => add(place)}
          >
            + Add
          </button>
        </div>
      </li>
    );
  };

  const scopeOptions: { value: ListScope; label: string }[] = [
    { value: "day", label: dayCity ? `${dayCity} (this day)` : "This day" },
    ...(trip.prefs.tripArea.length > 0
      ? [
          {
            value: "trip" as const,
            label: `My Where: ${trip.prefs.tripArea.join(", ")}`,
          },
        ]
      : []),
    { value: "all", label: "All of Italy" },
  ];

  return (
    <section className="place-list" aria-labelledby="place-list-title">
      <h2 id="place-list-title" className="place-list__title">
        Add places
      </h2>

      <div className="place-list__filters">
        <label className="control control--wide">
          <span className="control__label">Search all places</span>
          <input
            id={PLACE_SEARCH_ID}
            type="search"
            value={filters.query}
            placeholder="Name or city…"
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <label className="control">
          <span className="control__label">Area</span>
          <select
            value={filters.scope}
            onChange={(e) => update({ scope: e.target.value as ListScope })}
          >
            {scopeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="chip">
          <input
            type="checkbox"
            checked={filters.openOnly}
            onChange={() => update({ openOnly: !filters.openOnly })}
          />
          Open {formatDate(day.date)}
        </label>
      </div>

      <div className="chips place-list__interests">
        {INTERESTS.map((interest) => (
          <label key={interest} className="chip">
            <input
              type="checkbox"
              checked={filters.interests.includes(interest)}
              onChange={() =>
                update({ interests: toggle(filters.interests, interest) })
              }
            />
            {interestLabel(interest)}
          </label>
        ))}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>

      {singleGroup && total > 0 && (
        <h3 className="group__title place-list__heading">
          {groupTitle(singleGroup.group, trip.prefs.budget)}{" "}
          <span className="group__count">{singleGroup.rows.length}</span>
        </h3>
      )}

      {/* Only the results scroll; search and filters stay in view above them. */}
      <div className="place-list__results">
        {total === 0 ? (
          <div className="empty">
            <p>No places match.</p>
            <div className="day__buttons">
              {filters.query && (
                <button
                  type="button"
                  className="button"
                  onClick={() => update({ query: "" })}
                >
                  Clear search
                </button>
              )}
              {filters.openOnly && (
                <button
                  type="button"
                  className="button"
                  onClick={() => update({ openOnly: false })}
                >
                  Show closed
                </button>
              )}
              {filters.interests.length > 0 && (
                <button
                  type="button"
                  className="button"
                  onClick={() => update({ interests: [] })}
                >
                  Any interest
                </button>
              )}
              {filters.scope !== "all" && (
                <button
                  type="button"
                  className="button"
                  onClick={() => update({ scope: "all" })}
                >
                  All of Italy
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {list.groups.map(({ group, rows }) => {
              const title = groupTitle(group, trip.prefs.budget);
              const content =
                rows.length > 0 ? (
                  <ul className="place-rows">{rows.map(row)}</ul>
                ) : (
                  <p className="field__hint">
                    {emptyGroupText(group, trip.prefs.budget)}
                  </p>
                );
              if (singleGroup) return <div key={group}>{content}</div>;
              // "Other prices" starts collapsed, but is never hidden (design doc §3.7).
              return group === "other" ? (
                <details key={group} className="group">
                  <summary className="group__title">
                    {title} <span className="group__count">{rows.length}</span>
                  </summary>
                  {content}
                </details>
              ) : (
                <section key={group} className="group">
                  <h3 className="group__title">
                    {title} <span className="group__count">{rows.length}</span>
                  </h3>
                  {content}
                </section>
              );
            })}
            {list.outside.length > 0 && (
              <section className="group">
                <h3 className="group__title">
                  Outside your area{" "}
                  <span className="group__count">{list.outside.length}</span>
                </h3>
                <ul className="place-rows">{list.outside.map(row)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
};
