# Shared Trips live in the URL as readable query params

A Shared Trip is carried entirely by its link, for example `/share?v=1&start=2026-11-10&transport=car&day1=rome:1m,5,12l,30d&…`. Nothing is stored on a server. The app is static hosting with no backend (see ADR 0001), and a Trip is small enough to fit in a URL. We chose readable params over compressed JSON because there's so little data: deflate barely shrinks a few dozen short numbers, and base64 then makes them about a third longer. Plain params come out shorter, people can read and debug them, and they decode instantly instead of asynchronously.

## Considered Options

- **Short-link backend** (Firestore plus an id): short links, but it needs a server, write rules and abuse handling. Rejected.
- **Compressed JSON in the URL** (deflate plus base64url): longer than readable params for this data, impossible to read, and slower to decode. Rejected.

## Consequences

- A link is a snapshot. Later edits to the original Trip don't reach it, so the traveler shares again.
- The link only carries what the Trip Overview needs: Start Date, Transport Mode, Interests (optional), and for each day its Base City, Stops (Place number plus must-see/added/lunch/dinner flags) and any Day Window that isn't the default. Pace, Budget, meal toggles and Trip Area aren't included.
- Links outlive the code. The `v` param is versioned, and every version ever released must keep decoding. Place numbers must never be reused for a different Place. A link to a Place that has been removed drops that Stop and shows a notice.
- Anyone can edit a link by hand, so it's validated strictly (unlike the localStorage save, which only this app writes). An invalid link shows a "can't be opened" screen.
- Query params reach the server, so they show up in hosting logs and link-preview fetches. A Trip holds nothing sensitive, so this is acceptable.
