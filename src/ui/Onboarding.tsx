import { useMemo, useState } from "react";
import type { CleanPlace } from "../data/place.ts";
import type { IsoDate } from "../hours/calendar.ts";
import {
  cityCounts,
  headsUps,
  headsUpText,
  isPastDate,
  tripDates,
  tuneSummary,
} from "../onboarding/onboarding.ts";
import { BASE_CITY_NAMES, type BaseCity } from "../preferences/base-cities.ts";
import {
  INTERESTS,
  interestLabel,
  type Interest,
} from "../preferences/interests.ts";
import {
  DEFAULT_PREFERENCES,
  type Pace,
  type Preferences,
} from "../preferences/preferences.ts";
import type { PriceLevel } from "../scoring/budget.ts";
import type { TransportMode } from "../travel/travel-time.ts";
import type { NewTrip } from "../trip/trip.ts";
import { formatDate } from "./format.ts";

type Props = {
  places: CleanPlace[];
  /** Today's date in Rome; Start Dates before it are blocked. */
  today: IsoDate;
  onStart: (trip: NewTrip) => void;
};

const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: "relaxed", label: "Relaxed", hint: "3 sights a day" },
  { value: "balanced", label: "Balanced", hint: "4 sights a day" },
  { value: "packed", label: "Packed", hint: "6 sights a day" },
];

const BUDGETS: { value: PriceLevel | null; label: string }[] = [
  { value: null, label: "Any" },
  { value: "€", label: "€" },
  { value: "€€", label: "€€" },
  { value: "€€€", label: "€€€" },
  { value: "€€€€", label: "€€€€" },
];

const MODES: { value: TransportMode; label: string }[] = [
  { value: "public-transport", label: "Public transport" },
  { value: "rental-car", label: "Rental car" },
];

/** Adds `item` if missing, removes it if present. */
const toggle = <T,>(items: T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];

/**
 * The one-screen onboarding from the design doc (§4.2): Start Date with
 * heads-ups, an optional "Where", and a collapsed "Tune it". Only the date is
 * required; everything else has a default.
 */
export const Onboarding = ({ places, today, onStart }: Props) => {
  const [startDate, setStartDate] = useState<IsoDate>(today);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [mustSeeQuery, setMustSeeQuery] = useState("");

  const update = (changes: Partial<Preferences>) =>
    setPrefs((p) => ({ ...p, ...changes }));

  const isPast = isPastDate(startDate, today);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !isPast;

  // Recomputed only when the date changes (they scan every Place × 3 dates).
  const notes = useMemo(
    () => (validDate ? headsUps(places, startDate) : []),
    [places, startDate, validDate],
  );
  const counts = useMemo(
    () => (validDate ? cityCounts(places, startDate) : null),
    [places, startDate, validDate],
  );

  const byName = useMemo(
    () => [...places].sort((a, b) => a.name.localeCompare(b.name)),
    [places],
  );
  const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? id;

  const addMustSee = (name: string) => {
    const match = places.find((p) => p.name === name);
    if (!match) return;
    if (!prefs.mustSees.includes(match.id)) {
      update({ mustSees: [...prefs.mustSees, match.id] });
    }
    setMustSeeQuery("");
  };

  const start = (startEmpty: boolean) => {
    if (validDate) onStart({ startDate, prefs, startEmpty });
  };

  return (
    <main className="onboarding">
      <h1>3 Days in Italy</h1>
      <p className="lede">
        Plan three days from 100 hand-picked places. Only the date is needed.
      </p>

      <section className="field" aria-labelledby="when-label">
        <label id="when-label" htmlFor="start-date" className="field__label">
          When does your trip start?
        </label>
        <input
          id="start-date"
          type="date"
          min={today}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-describedby="date-notes"
        />
        <div id="date-notes" aria-live="polite">
          {isPast && (
            <p className="field__error">
              That date has passed. Pick today or later.
            </p>
          )}
          {validDate && (
            <>
              <p className="dates">
                {tripDates(startDate).map(formatDate).join(" · ")}
              </p>
              {notes.length > 0 && (
                <ul className="notes">
                  {notes.map((note) => (
                    <li key={`${note.kind}-${note.date}`}>
                      {headsUpText(note)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      <fieldset className="field">
        <legend className="field__label">
          Where?{" "}
          <span className="field__hint">
            Optional: leave empty and we'll choose
          </span>
        </legend>
        <ul className="cities">
          {BASE_CITY_NAMES.map((city: BaseCity) => (
            <li key={city}>
              <label className="city">
                <input
                  type="checkbox"
                  checked={prefs.tripArea.includes(city)}
                  onChange={() =>
                    update({ tripArea: toggle(prefs.tripArea, city) })
                  }
                />
                <span className="city__name">{city}</span>
                {counts && (
                  <span className="city__count">
                    {counts[city].open} of {counts[city].total} open on your
                    dates
                  </span>
                )}
                {counts && counts[city].towns.length > 0 && (
                  <span className="city__towns">
                    + day trips: {counts[city].towns.join(", ")}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <details className="tune">
        <summary>
          <span className="field__label">Tune it</span>{" "}
          <span className="field__hint">Optional</span>
          <span className="tune__summary">{tuneSummary(prefs)}</span>
        </summary>

        <fieldset className="field">
          <legend className="field__label">Interests</legend>
          <div className="chips">
            {INTERESTS.map((interest: Interest) => (
              <label
                key={interest}
                className={`chip${interest === "avoid-crowds" ? " chip--divided" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={prefs.interests.includes(interest)}
                  onChange={() =>
                    update({ interests: toggle(prefs.interests, interest) })
                  }
                />
                {interestLabel(interest)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Pace</legend>
          <div className="chips">
            {PACES.map(({ value, label, hint }) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="pace"
                  checked={prefs.pace === value}
                  onChange={() => update({ pace: value })}
                />
                {label} <span className="chip__hint">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">
            Budget <span className="field__hint">A target, not a limit</span>
          </legend>
          <div className="chips">
            {BUDGETS.map(({ value, label }) => (
              <label key={label} className="chip">
                <input
                  type="radio"
                  name="budget"
                  checked={prefs.budget === value}
                  onChange={() => update({ budget: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Getting between cities</legend>
          <div className="chips">
            {MODES.map(({ value, label }) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="mode"
                  checked={prefs.mode === value}
                  onChange={() => update({ mode: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Meals</legend>
          <div className="chips">
            <label className="chip">
              <input
                type="checkbox"
                checked={prefs.lunch}
                onChange={() => update({ lunch: !prefs.lunch })}
              />
              Lunch
            </label>
            <label className="chip">
              <input
                type="checkbox"
                checked={prefs.dinner}
                onChange={() => update({ dinner: !prefs.dinner })}
              />
              Dinner
            </label>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="must-see" className="field__label">
            Must-Sees <span className="field__hint">Always included</span>
          </label>
          <input
            id="must-see"
            list="place-names"
            placeholder="Type a place…"
            value={mustSeeQuery}
            onChange={(e) => {
              setMustSeeQuery(e.target.value);
              addMustSee(e.target.value);
            }}
          />
          <datalist id="place-names">
            {byName.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          {prefs.mustSees.length > 0 && (
            <ul className="chips" aria-label="Chosen Must-Sees">
              {prefs.mustSees.map((id) => (
                <li key={id} className="chip chip--selected">
                  {placeName(id)}
                  <button
                    type="button"
                    className="chip__remove"
                    aria-label={`Remove ${placeName(id)}`}
                    onClick={() =>
                      update({ mustSees: toggle(prefs.mustSees, id) })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!validDate}
          onClick={() => start(false)}
        >
          Plan my trip
        </button>
        <button
          type="button"
          className="button button--link"
          disabled={!validDate}
          onClick={() => start(true)}
        >
          Start with empty days →
        </button>
      </div>
    </main>
  );
};
