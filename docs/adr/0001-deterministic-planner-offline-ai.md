# Deterministic planner; AI used offline only (for now)

The itinerary is built and checked by deterministic code: scoring, opening hours, durations and travel-time estimates. The product makes no live LLM calls. AI is used only offline, in build-time scripts that draft data (seasonal-rule corrections, one-line Place hooks). Every draft is reviewed by hand and committed as static JSON. We chose this because LLMs are unreliable at the hard constraints this problem is made of (hours, overlaps, geography), and because a public demo with a live, paid model behind it risks surprise bills. The cost of running this design is $0.

## Considered Options

- **LLM generates the itinerary.** Rejected. Its output can't be checked against opening hours without a deterministic validator, and once that validator exists it might as well do the planning.
- **Live "describe your trip" box** (a small model turns free text into the preference schema, through a Cloud Function with spend caps, App Check and rate limits). Deferred, not rejected: it's the first post-MVP AI feature. The preference schema is designed so this feature can plug in without changing the planner.
