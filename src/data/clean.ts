import type { Correction, CorrectionSource, Removal } from "./corrections.ts";
import type { Place } from "./place.ts";

/** One changed field, shown in the human review checklist. */
export type ReviewRow = {
  placeId: string;
  placeName: string;
  field: string;
  from: unknown;
  to: unknown;
  reason: string;
  source: CorrectionSource | "rule";
  status: "applied" | "pending";
};

export type CleanResult = {
  places: Place[];
  review: ReviewRow[];
};

/**
 * Produces the clean dataset from the raw one: first dataset-wide rules,
 * then per-Place corrections. Pure: never mutates its inputs.
 * Throws on corrections that are invalid, duplicated or stale, so a bad
 * corrections list fails loudly instead of silently doing nothing.
 */
export const cleanPlaces = (
  raw: Place[],
  corrections: Correction[],
  removals: Removal[] = [],
): CleanResult => {
  validateRemovals(raw, corrections, removals);
  const review: ReviewRow[] = [];
  const removedIds = new Set<string>();

  for (const removal of removals) {
    const place = raw.find((p) => p.id === removal.placeId)!;
    const apply = removal.source !== "ai-draft" || removal.approved === true;
    if (apply) removedIds.add(place.id);

    review.push({
      placeId: place.id,
      placeName: place.name,
      field: "(place)",
      from: "included",
      to: "removed",
      reason: removal.reason,
      source: removal.source,
      status: apply ? "applied" : "pending",
    });
  }

  // Removed places are dropped before any rule runs, so they produce no other review rows.
  const places = structuredClone(raw.filter((p) => !removedIds.has(p.id)));

  for (const place of places) {
    const row = normalizeTags(place);
    if (row) review.push(row);
  }

  validate(places, corrections);
  const byId = new Map(places.map((p) => [p.id, p]));

  for (const correction of corrections) {
    const place = byId.get(correction.placeId)!;
    const apply =
      correction.source !== "ai-draft" || correction.approved === true;

    review.push({
      placeId: place.id,
      placeName: place.name,
      field: correction.field,
      from: place[correction.field],
      to: correction.value,
      reason: correction.reason,
      source: correction.source,
      status: apply ? "applied" : "pending",
    });

    if (apply) {
      // The Correction type guarantees value matches the field's type.
      Object.assign(place, { [correction.field]: correction.value });
    }
  }

  review.sort(
    (a, b) =>
      a.placeId.localeCompare(b.placeId) || a.field.localeCompare(b.field),
  );
  return { places, review };
};

/** `local_favorite` → `local-favorite`, lowercase, de-duplicated. Mutates the (cloned) place. */
const normalizeTags = (place: Place): ReviewRow | null => {
  const normalized = [
    ...new Set(
      place.tags.map((t) => t.trim().toLowerCase().replaceAll("_", "-")),
    ),
  ];
  if (JSON.stringify(normalized) === JSON.stringify(place.tags)) return null;

  const row: ReviewRow = {
    placeId: place.id,
    placeName: place.name,
    field: "tags",
    from: place.tags,
    to: normalized,
    reason: "Normalized tag spelling to lowercase-hyphenated form.",
    source: "rule",
    status: "applied",
  };
  place.tags = normalized;
  return row;
};

const validateRemovals = (
  raw: Place[],
  corrections: Correction[],
  removals: Removal[],
): void => {
  const ids = new Set(raw.map((p) => p.id));
  const corrected = new Set(corrections.map((c) => c.placeId));
  const seen = new Set<string>();

  for (const r of removals) {
    if (!ids.has(r.placeId)) {
      throw new Error(`Removal targets unknown place id "${r.placeId}".`);
    }
    if (seen.has(r.placeId)) {
      throw new Error(`Duplicate removals for ${r.placeId}.`);
    }
    seen.add(r.placeId);
    if (corrected.has(r.placeId)) {
      throw new Error(
        `${r.placeId} is both removed and corrected. Delete its corrections.`,
      );
    }
  }
};

const validate = (places: Place[], corrections: Correction[]): void => {
  const byId = new Map(places.map((p) => [p.id, p]));
  const seen = new Set<string>();

  for (const c of corrections) {
    const place = byId.get(c.placeId);
    if (!place) {
      throw new Error(`Correction targets unknown place id "${c.placeId}".`);
    }

    const key = `${c.placeId}.${c.field}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate corrections for ${c.placeId} field "${c.field}".`,
      );
    }
    seen.add(key);

    if (JSON.stringify(place[c.field]) === JSON.stringify(c.value)) {
      throw new Error(
        `Stale correction: ${c.placeId} field "${c.field}" already equals the corrected value. Remove it.`,
      );
    }
  }
};
