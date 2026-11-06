// Smoke test: the whole app renders (no browser needed), and the colour tokens
// from src/utils/colors.ts reach the page as CSS variables on :root.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../App.tsx";
import { cssVariables } from "../../../utils/colors.ts";

describe("<App>", () => {
  const html = renderToStaticMarkup(<App />);

  it("starts on onboarding when no Trip is saved", () => {
    expect(html).toContain("3 Days in Italy");
    expect(html).toContain("Plan my trip");
  });

  it("puts every colour token on :root as a CSS variable", () => {
    Object.entries(cssVariables()).forEach(([name, value]) => {
      expect(html).toContain(`${name}:${value}`);
    });
  });
});
