# Generate one Trip Day at a time

The generator builds a Trip Day only when the traveler reaches it. Days already planned are passed in as input, so it avoids duplicate Places and starts near where the previous day ended. We chose this over planning all three days at once, which was the UX review's recommendation (an engine that plans the whole trip so it can avoid zig-zag routes and duplicates, while showing one day at a time), because it shows less information at a time and is simpler to build and explain for an MVP.

## Consequences

- A day's city is picked greedily, using its Day Area if one is pinned, otherwise the Trip Area city closest to the previous day. A poor sequence of cities (Rome → Venice → Rome) can't be fixed by looking ahead.
- A Must-See might not fit on the remaining days. When that happens it gets a Warning; it is never silently dropped.
- If this becomes a problem, the upgrade is a whole-trip planner that treats edited or finalized days as fixed. The per-day scoring and scheduling code stays the same.
