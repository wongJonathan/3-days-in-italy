// Regenerates the clean dataset and its review checklist.
// Usage: npm run data:clean
// All logic lives in src/data (tested); this file only reads and writes.
import { readFileSync, writeFileSync } from "node:fs";
import { cleanPlaces } from "../src/data/clean.ts";
import { corrections, removals } from "../src/data/corrections.ts";
import type { Place } from "../src/data/place.ts";
import { renderReview } from "../src/data/review.ts";

const root = new URL("../", import.meta.url);

const raw = JSON.parse(
  readFileSync(new URL("italy.json", root), "utf8"),
) as Place[];
const { places, review } = cleanPlaces(raw, corrections, removals);

writeFileSync(
  new URL("src/data/italy-clean.json", root),
  JSON.stringify(places, null, 2) + "\n",
);
writeFileSync(
  new URL("docs/data/corrections-review.md", root),
  renderReview(review),
);

const pending = review.filter((r) => r.status === "pending").length;
console.log(
  `Cleaned ${places.length} places: ${review.length - pending} changes applied, ${pending} pending approval.`,
);
