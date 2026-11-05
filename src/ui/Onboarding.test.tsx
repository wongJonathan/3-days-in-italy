// Smoke test: renders the real screen to HTML (no browser needed) and checks
// the key parts are wired up. Behaviour lives in onboarding.ts and is tested there.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PLACES } from "../data/places.ts";
import { Onboarding } from "./Onboarding.tsx";

const render = (today: string) =>
  renderToStaticMarkup(
    <Onboarding places={PLACES} today={today} onStart={() => {}} />,
  );

describe("<Onboarding>", () => {
  // Friday 6 November 2026: the Trip covers Fri 6, Sat 7, Sun 8.
  const html = render("2026-11-06");

  it("starts on today, which cannot be before the min date", () => {
    expect(html).toContain('min="2026-11-06"');
    expect(html).toContain('value="2026-11-06"');
  });

  it("shows the 3 Trip dates and the heads-ups for them", () => {
    expect(html).toContain("Fri 6 Nov · Sat 7 Nov · Sun 8 Nov");
    expect(html).toContain("Sunday:");
    expect(html).toContain("November:");
    expect(html).toContain("out of season.");
  });

  it("lists the 5 Base Cities with open counts and day trips", () => {
    for (const city of ["Rome", "Florence", "Milan", "Venice", "Bologna"]) {
      expect(html).toContain(`>${city}<`);
    }
    expect(html).toContain("30 of 30 open on your dates");
    expect(html).toContain("+ day trips: Siena, Pienza");
  });

  it("summarises the default Preferences", () => {
    expect(html).toContain(
      "Balanced · Any budget · Public transport · No meals",
    );
  });

  it("offers both ways to start, enabled", () => {
    expect(html).toMatch(/<button[^>]*>Plan my trip<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Plan my trip/);
    expect(html).toContain("Start with empty days");
  });
});
