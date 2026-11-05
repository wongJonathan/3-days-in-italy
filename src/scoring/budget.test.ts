import { describe, expect, it } from "vitest";
import { BUDGET_GROUP_ORDER, budgetGroup } from "./budget.ts";

describe("budgetGroup", () => {
  it("is within budget at the same price level", () => {
    expect(budgetGroup("€€", "€€")).toBe("within");
  });

  it("is a little under one level below, and a little over one level above", () => {
    expect(budgetGroup("€", "€€")).toBe("a-little-under");
    expect(budgetGroup("€€€", "€€")).toBe("a-little-over");
  });

  it("puts anything two or more levels away in other", () => {
    expect(budgetGroup("€", "€€€")).toBe("other");
    expect(budgetGroup("€€€€", "€€")).toBe("other");
  });

  it("treats every price as within budget when no Budget is set", () => {
    for (const price of ["€", "€€", "€€€", "€€€€"] as const) {
      expect(budgetGroup(price, null)).toBe("within");
    }
  });

  it("works at the ends of the scale", () => {
    expect(budgetGroup("€", "€")).toBe("within");
    expect(budgetGroup("€€", "€")).toBe("a-little-over");
    expect(budgetGroup("€€€", "€€€€")).toBe("a-little-under");
  });
});

describe("BUDGET_GROUP_ORDER", () => {
  it("fills within budget first, then under, then over, then other", () => {
    expect(BUDGET_GROUP_ORDER).toEqual([
      "within",
      "a-little-under",
      "a-little-over",
      "other",
    ]);
  });
});
