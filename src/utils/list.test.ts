import { describe, expect, it } from "vitest";
import { toggle } from "./list.ts";

describe("toggle", () => {
  it("adds an item that isn't in the list, at the end", () => {
    expect(toggle(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("removes an item that is in the list", () => {
    expect(toggle(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("never changes the list it was given", () => {
    const items = ["a"];
    toggle(items, "b");
    toggle(items, "a");
    expect(items).toEqual(["a"]);
  });
});
