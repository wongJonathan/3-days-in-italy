import { describe, expect, it } from "vitest";
import { COLORS, cssVariables, RADIUS } from "./colors.ts";

describe("cssVariables", () => {
  it("turns each colour into a kebab-case CSS variable", () => {
    const vars = cssVariables();
    expect(vars["--accent"]).toBe(COLORS.accent);
    expect(vars["--surface-alt"]).toBe(COLORS.surfaceAlt);
    expect(vars["--warning-text"]).toBe(COLORS.warningText);
    expect(vars["--on-accent"]).toBe(COLORS.onAccent);
  });

  it("includes every colour, plus the radius in px", () => {
    const vars = cssVariables();
    expect(Object.keys(vars)).toHaveLength(Object.keys(COLORS).length + 1);
    expect(vars["--radius"]).toBe(`${RADIUS}px`);
  });
});
