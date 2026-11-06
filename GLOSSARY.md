# 3 Days in Italy

A planner that helps a traveler build a personalized 3-day itinerary from a fixed dataset of Italian places.

## Language

**Place**:
One entry in `italy.json`: a restaurant, site, museum, vineyard, town, market or experience the traveler could visit. The dataset is the only source of Places.
_Avoid_: Location, POI, spot, attraction

**Traveler**:
The one person a Trip is planned for. The dataset has nothing about groups, families or children.
_Avoid_: User, party, group

**Trip**:
The traveler's plan: a Start Date followed by three consecutive Trip Days.
_Avoid_: Vacation, journey

**Start Date**:
The calendar date of Trip Day 1, chosen by the traveler. It determines which seasonal hours and weekday closures apply.
_Avoid_: Departure date, arrival date

**Trip Day**:
One of the three days of a Trip ("Day 1", "Day 2", "Day 3"). Each one is tied to a real calendar date.
_Avoid_: Leg, segment

**Day Window**:
The hours a Trip Day runs, 09:00–22:30 by default. The traveler can change it for each day.

**Finalized**:
The state of a Trip Day the traveler has signed off. A finalized day is saved in the browser and can be reopened for editing.
_Avoid_: Done, locked, saved

**Trip Overview**:
A read-only view of the whole Trip as a single scroll, day after day, with a map of the Stops for the day being read. It can only be opened once every Trip Day is Finalized.
_Avoid_: Itinerary, summary, trip panel

**Shared Trip**:
A read-only copy of a Finalized Trip, carried entirely inside a link. It's a snapshot: later edits to the original Trip don't change it, and opening it never touches the visitor's own Trip.
_Avoid_: Shared itinerary, public trip, export

**Stop**:
A Place scheduled on a Trip Day, at a position in that day's order and with computed arrival and departure times. The same Place can be a Stop on more than one Trip Day.
_Avoid_: Item, entry, activity

**Warning**:
A notice attached to a Stop when it breaks a rule: the Place is closed or out of season that day (or already closed when the traveler arrives), the visit runs past closing time, the Travel Time from the previous Stop is too long, or the day runs past its Day Window. A Warning never stops the traveler from keeping the Stop.
_Avoid_: Error, conflict, block

**Travel Time**:
The estimated time to get from one Stop to the next, worked out from the straight-line distance between their coordinates.
_Avoid_: Route, directions

## Place data

**Hours Status**:
How confident we are in a Place's opening hours:
- **Known**: taken from the dataset or a cited lookup.
- **Assumed**: inferred from what kind of Place it is (an open square is always accessible; an outdoor activity runs in daylight).
- **Unknown**: we have no basis to say, and the Place is labeled so.

_Avoid_: Verified, open/closed

**Seasonal Rule**:
A structured limit on when a Place can be visited, taken from its free-text seasonal note (e.g. "April–October only", "third weekend of each month"). Notes that are advice only ("summer queues are brutal") are not Seasonal Rules.
_Avoid_: Seasonal hours, seasonal note

## Preferences

**Preferences**:
What the traveler tells us before a Trip is generated: Interests, Pace, Budget, Transport Mode, Lunch/Dinner and Must-Sees. Every part is optional.
_Avoid_: Settings, profile, filters

**Interest**:
Something the traveler cares about, chosen from a curated list of chips. Each chip matches one or more dataset tags (e.g. Scenic matches `scenic`, `views` and `photogenic`). The one exception is **Avoid Crowds**, which is computed from crowd-related tags. The full list is in the spec.
_Avoid_: Category, theme, raw tag

**Budget**:
The traveler's target price level (€ to €€€€). A Place is **within budget** at that level, **a little under** one level below it, and **a little over** one level above it.
_Avoid_: Price cap, spend

**Pace**:
How full each Trip Day is, counted in sights: Relaxed (3), Balanced (4) or Packed (6). Meal Stops come on top.

**Transport Mode**:
How the traveler gets between distant Stops: Public Transport (the default) or Rental Car. Short hops inside a city are always on foot or by local transit.
_Avoid_: Travel mode, vehicle

**Meal Stop**:
A Stop at a restaurant or cafe, placed to cover lunch or dinner. The traveler chooses separately whether generation includes **lunch**, **dinner**, both, or neither.
_Avoid_: Food stop

**Base City**:
One of the five cities a Trip Area is built from: Rome, Florence, Milan, Venice or Bologna. Every other town belongs to its nearest Base City (Siena to Florence, Como to Milan).
_Avoid_: Hub, region

**Trip Area**:
The set of base cities the traveler picks for the whole Trip, with each city's nearby day-trip towns included. If they pick none, the generator chooses.
_Avoid_: Bounds, destinations, region filter

**Day Area**:
A single city the traveler pins to one Trip Day. The generator always respects it.
_Avoid_: Day city, day region

**Food Experience**:
A Place whose point is the food itself (a tasting, a bar crawl, a market). It counts toward the Food and Wine Interests, not toward meals.
_Avoid_: Food tour, meal

**Must-See**:
A Place the traveler has pinned. Generation always includes it.
_Avoid_: Favorite, bookmark
