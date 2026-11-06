# 3 Days in Italy: Product Spec

## Problem

A Traveler has three days in Italy and a list of 103 candidate Places (`italy.json`). The data is partially structured with errors or missing data:
- A third of the Places have no opening hours, and the rest use a dozen different formats.
- Seasonal rules exist only as free text.
- Some records are wrong: coordinates in the wrong city, duplicates, mismatched tags.

The Traveler wants a realistic plan based on what they want from the trip.

## Goals

1. **Give a realistic plan fast.** A Traveler can quickly get a realistic itinerary based on their Preferences. Realistic means honest about the data: every Place shows how far its hours can be trusted, and every broken rule is shown, never hidden.
2. **Keep the Traveler in control.** Generated plans are a starting point. The Traveler can reorder, add, remove and regenerate, and the app warns but never blocks.
3. **Cost nothing to run.** There is no backend, no paid API and no live model calls, so running costs stay at zero.

## Non-goals (for now)

- **Live AI features.** AI is used offline to draft data, and every draft is reviewed ([ADR 0001](adr/0001-deterministic-planner-offline-ai.md)).
- Accounts, sign-in, syncing across devices, or sharing a Trip.
- Groups or families. A Trip is planned for one Traveler.
- Real routing or train timetables. Travel Time is an estimate and is labeled "est."
- Booking, tickets, prices in euros, or spending totals.

## Core flow

1. **Onboarding (one screen).** The Traveler picks a Start Date (today or later) and, optionally:
   - a **Trip Area** (one or more base cities, each including its nearby day trips)
   - **Preferences**: Interests (see below), Pace, Budget, Transport Mode, Lunch and/or Dinner, and Must-Sees.
2. **Plan a day.** The app generates **one Trip Day at a time** ([ADR 0002](adr/0002-day-by-day-generation.md)), using the days already planned to avoid repeating Places.
3. **Edit.** The Traveler can reorder Stops, add Places from a list (filtered by city, with search across every Place), remove Stops, and regenerate the day. Must-Sees and Stops the Traveler added by hand stay in place when the day is regenerated.
4. **Finalize.** The Traveler signs off the day, and the next one opens. A side panel shows the whole Trip, and clicking a day reopens it. Every change is saved in the browser automatically.

## Interests

Interests are a curated set of dataset tags, shown as chips. Similar tags are merged into one chip:

| Chip | Matches tags |
|---|---|
| Iconic | `iconic` |
| Historic | `historic` |
| Cultural | `cultural` |
| Art | `art` |
| Food | `food` |
| Wine | `wine` |
| Markets | `market` |
| Scenic | `scenic`, `views`, `photogenic` |
| Outdoors | `outdoors`, `active` |
| Romantic | `romantic` |
| Hidden Gem | `hidden-gem` |
| Local Favorite | `local-favorite` (the clean data normalizes `local_favorite`) |
| **Avoid Crowds** (computed) | raises the score of `quiet` and `hidden-gem`, lowers it for `tourist-heavy` |

Some tags aren't shown as chips, either because other parts of the planner already cover them or because they don't describe an interest:
- **Time of day:** `morning`, `evening`. The schedule uses these.
- **Price:** `budget`, `splurge`, `free`. Budget covers these.
- **Crowds:** `quiet`, `tourist-heavy`. These feed into Avoid Crowds.
- **Rare or vague:** `rainy-day`, `relaxing`, `family-friendly`, `lively`, `experience`, `shop`, `modern`, `seasonal`.

## Rules the planner follows

- **Timed schedule.** A Trip Day is an ordered list of Stops. The app computes arrival and departure times from visit durations and Travel Time, within the Day Window (09:00–22:30 by default, adjustable per day).
- **Warnings, never blocks.** A Stop gets a Warning when:
  - its Place is closed that day,
  - its Place is out of season,
  - the visit would run past closing time,
  - Travel Time from the previous Stop is long (or longer than the visit itself), or
  - the day runs past its Day Window.
- **Hours Status.** Each Place's hours are labeled:
  - **Known**: from the data.
  - **Assumed**: inferred from the kind of Place. Open squares are always accessible, outdoor activities run in daylight, "Evenings" means 18:00–24:00, and "Morning only" means 08:00–12:00.
  - **Unknown**: no basis to say.
- **Scoring.** A deterministic score adds up Interest matches and rating. Places rated under 4.0 are left out unless they are a Must-See. Each Stop shows "why it's here" chips that come straight from its score.
- **Budget.** Budget is a target price level, not a filter. Lists group Places into *within budget*, *a little under*, *a little over*, and a collapsed *other prices*. The generator fills slots in that order.
- **Meals.** If lunch or dinner is chosen, the generator places a restaurant or cafe in that meal window. Food Experiences (tastings, bar crawls, markets) count toward the Food and Wine Interests, not toward meals.

## Data handling

- `italy.json` is never edited. A script combines it with a corrections file (fixes, Seasonal Rules, Assumed hours) to produce `italy-clean.json`, which is the only data the app reads.
- Every correction records the reason for it and its source: *manual*, *assumption* or *AI draft*. Normalizations that apply to every Place, such as tag spelling, are tagged *rule*. The script also writes a review checklist ([docs/data/corrections-review.md](data/corrections-review.md)) with one row per changed field. Rows drafted by AI are left out until a person approves them, which they do by setting `approved: true` in `src/utils/data/corrections.ts`.
- A Place that turns out not to exist is *removed* rather than corrected. It's listed in the same file with a reason, and the review shows it as one row.

## MVP scope

1. Clean-data script and review checklist
2. Hours parser
3. Availability: Seasonal Rules and weekday closures. Assumed daylight is fixed at 08:00–19:00.
4. Travel Time estimate for each Transport Mode
5. Timed schedule with Warnings
6. Scoring, reason chips and budget groups
7. Day-by-day generator
8. UI: onboarding, editor (Trip panel, schedule, Leaflet map, Place list), autosave, Finalize
9. Deploy to Firebase Hosting through GitHub Actions

Steps 1–7 are pure logic, built test-first with Vitest.

## Success criteria

- **No silent rule breaks.** Every Stop that breaks a planner rule carries a matching Warning. A test runs this check on generated days across many Start Dates and Preference combinations.
- **No repeated Places** across Trip Days.
- **Every hours format** in the dataset parses, or is deliberately classed as Assumed or Unknown. A test fails if a new, unhandled format appears.
- **Every seasonal note** is either turned into a Seasonal Rule or marked as advice only. A test fails if one is missed.
- **Hours Status is visible** on every Place in lists and on every Stop.
- **Generation works with no Preferences**: a Start Date alone produces a full Trip Day.
- **No refresh loses work**: reloading the page restores the Trip exactly.
- **Runs for free**: the live site works on Firebase's free plan with no paid or keyed external services. The only network requests are free OpenStreetMap map tiles; everything else, including the data, is bundled into the app.

## After the MVP (priority order)

1. Pin a city to a specific Trip Day (Day Area)
2. Daylight hours computed from the date and location
3. A one-line "why go" hook for each Place, drafted offline with AI and reviewed
4. One-time OpenStreetMap lookup of opening hours for real businesses
5. A ZTL (restricted traffic zone) Warning for car journeys
6. Drag-and-drop, undo, and a layout tuned for mobile
7. Real travel times: an offline walking/driving matrix and a hand-checked train table
8. Planning the whole trip at once, so the generator can avoid zig-zag routes between cities
9. A live "describe your trip" box: a small model turns free text into Preferences, with a hard spend cap and a fallback
10. Sharing a Trip and keeping more than one Trip
11. Three budget variants per day (on budget, lower, higher) for the Traveler to choose from. Variants that come out identical, or don't exist at the edges (no "lower" for €), are hidden.
