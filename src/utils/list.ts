/** Adds `item` if it's missing, removes it if it's there. Returns a new list. */
export const toggle = <T>(items: T[], item: T): T[] =>
  items.includes(item) ? items.filter((i) => i !== item) : [...items, item];
