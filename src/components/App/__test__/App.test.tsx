// Smoke test: the whole app renders (no browser needed), and the colour tokens
// from src/utils/colors.ts reach the page as CSS variables on :root.
// Redirects run in an effect, which a static render doesn't run, so the
// redirect rules themselves are tested in utils/routes/routes.test.ts.
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "../App.tsx";
import { cssVariables } from "../../../utils/colors.ts";

const renderAt = (url: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );

const SHARED =
  "/share?v=1&start=2026-11-10&transport=transit&day1=rome:1m,5&day2=&day3=florence:41";

describe("<App>", () => {
  const html = renderAt("/");

  it("starts on onboarding when no Trip is saved", () => {
    expect(html).toContain("Make the most of three days in Italy");
    expect(html).toContain("Create my trip");
  });

  it("puts every colour token on :root as a CSS variable", () => {
    Object.entries(cssVariables()).forEach(([name, value]) => {
      expect(html).toContain(`${name}:${value}`);
    });
  });

  it("opens a Shared Trip from its link, read-only", () => {
    const shared = renderAt(SHARED);
    expect(shared).toContain("Shared trip");
    expect(shared).toContain("Day 1 · Tue 10 Nov · Rome");
    expect(shared).toContain("Colosseum");
    expect(shared).toContain("Plan your own trip");
    expect(shared).not.toContain("Edit this trip");
  });

  it("says when a shared link can't be opened", () => {
    const broken = renderAt("/share?v=1&start=2026-11-10");
    expect(broken).toContain("This trip link can&#x27;t be opened");
    expect(broken).toContain("Plan your own trip");
  });

  it("says when Stops in a shared link no longer exist", () => {
    expect(renderAt(SHARED.replace("5&", "5,999&"))).toContain(
      "1 Stop no longer exists and was removed.",
    );
  });
});
