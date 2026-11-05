/** The Interest chips from the spec. `avoid-crowds` is computed, not a tag match. */
export type Interest =
  | "iconic"
  | "historic"
  | "cultural"
  | "art"
  | "food"
  | "wine"
  | "markets"
  | "scenic"
  | "outdoors"
  | "romantic"
  | "hidden-gem"
  | "local-favorite"
  | "avoid-crowds";

/** Each tag-matching chip, its label, and the dataset tags it matches. */
export const INTEREST_TAGS: Record<
  Exclude<Interest, "avoid-crowds">,
  { label: string; tags: string[] }
> = {
  iconic: { label: "Iconic", tags: ["iconic"] },
  historic: { label: "Historic", tags: ["historic"] },
  cultural: { label: "Cultural", tags: ["cultural"] },
  art: { label: "Art", tags: ["art"] },
  food: { label: "Food", tags: ["food"] },
  wine: { label: "Wine", tags: ["wine"] },
  markets: { label: "Markets", tags: ["market"] },
  scenic: { label: "Scenic", tags: ["scenic", "views", "photogenic"] },
  outdoors: { label: "Outdoors", tags: ["outdoors", "active"] },
  romantic: { label: "Romantic", tags: ["romantic"] },
  "hidden-gem": { label: "Hidden Gem", tags: ["hidden-gem"] },
  "local-favorite": { label: "Local Favorite", tags: ["local-favorite"] },
};

/** Every chip in display order. Avoid Crowds is last: it changes how the others score. */
export const INTERESTS: Interest[] = [
  ...(Object.keys(INTEREST_TAGS) as Exclude<Interest, "avoid-crowds">[]),
  "avoid-crowds",
];

/** The chip's label, e.g. "Hidden Gem" or "Avoid Crowds". */
export const interestLabel = (interest: Interest): string =>
  interest === "avoid-crowds" ? "Avoid Crowds" : INTEREST_TAGS[interest].label;
