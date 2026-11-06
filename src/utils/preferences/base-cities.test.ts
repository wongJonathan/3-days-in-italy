import { describe, expect, it } from "vitest";
import { baseCityOf } from "./base-cities.ts";

describe("baseCityOf", () => {
  it("returns a base city's own name, wherever its coordinates are", () => {
    // Chianti Day Trip is labelled Florence but sits 20 km out of town.
    expect(
      baseCityOf({ city: "Florence", latitude: 43.5833, longitude: 11.3167 }),
    ).toBe("Florence");
    expect(
      baseCityOf({ city: "Venice", latitude: 45.438, longitude: 12.3359 }),
    ).toBe("Venice");
  });

  it("assigns a town to its nearest base city", () => {
    expect(
      baseCityOf({ city: "Siena", latitude: 43.3188, longitude: 11.3308 }),
    ).toBe("Florence");
    expect(
      baseCityOf({ city: "Como", latitude: 45.8081, longitude: 9.0852 }),
    ).toBe("Milan");
    expect(
      baseCityOf({ city: "Burano", latitude: 45.4853, longitude: 12.4166 }),
    ).toBe("Venice");
  });

  it("follows a road-distance override: Isola della Scala goes with Venice", () => {
    // Straight-line it is nearer Bologna (90 km vs 105 km), but by road
    // (Google Maps) it is nearer Venice, so an override wins.
    expect(
      baseCityOf({
        city: "Isola della Scala",
        latitude: 45.2731,
        longitude: 11.0094,
      }),
    ).toBe("Venice");
  });
});
