import type { Place } from "../data/place.ts";

export type PriceLevel = Place["price_range"];

export type BudgetGroup =
  "within" | "a-little-under" | "a-little-over" | "other";

/** The order lists show the groups in, and the order the generator fills slots from. */
export const BUDGET_GROUP_ORDER: BudgetGroup[] = [
  "within",
  "a-little-under",
  "a-little-over",
  "other",
];

/**
 * Where a price sits relative to the traveler's Budget. Budget is a target,
 * not a filter, so nothing is ever excluded here. No Budget: everything is within.
 */
export const budgetGroup = (
  price: PriceLevel,
  budget: PriceLevel | null,
): BudgetGroup => {
  if (budget === null) return "within";
  // "€€€" → 3: the price level is the number of € signs.
  const difference = price.length - budget.length;
  if (difference === 0) return "within";
  if (difference === -1) return "a-little-under";
  if (difference === 1) return "a-little-over";
  return "other";
};
