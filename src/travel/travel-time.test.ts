import { describe, expect, it } from "vitest";
import {
  distanceKm,
  minutesForDistance,
  travelTime,
  type TravelPoint,
} from "./travel-time.ts";

const PT = "public-transport" as const;
const CAR = "rental-car" as const;

describe("distanceKm (great-circle distance)", () => {
  it("is 0 between a point and itself", () => {
    expect(
      distanceKm(
        { latitude: 41.9, longitude: 12.5 },
        { latitude: 41.9, longitude: 12.5 },
      ),
    ).toBe(0);
  });

  it("is about 111.19 km per degree of latitude", () => {
    expect(
      distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }),
    ).toBeCloseTo(111.19, 1);
  });

  it("measures Rome to Florence as roughly 230 km", () => {
    const rome = { latitude: 41.9028, longitude: 12.4964 };
    const florence = { latitude: 43.7696, longitude: 11.2558 };
    expect(distanceKm(rome, florence)).toBeGreaterThan(225);
    expect(distanceKm(rome, florence)).toBeLessThan(235);
  });

  it("is the same in both directions", () => {
    const a = { latitude: 45.46, longitude: 9.19 };
    const b = { latitude: 45.44, longitude: 12.33 };
    expect(distanceKm(a, b)).toBe(distanceKm(b, a));
  });
});

describe("minutesForDistance", () => {
  describe("walk band (under 1.5 km): 5 km/h, +30% for streets", () => {
    it("takes 0 minutes for no distance", () => {
      expect(minutesForDistance(0, PT)).toEqual({ minutes: 0, band: "walk" });
    });

    it("walks 0.5 km in 8 minutes (7.8, rounded up)", () => {
      expect(minutesForDistance(0.5, PT)).toEqual({ minutes: 8, band: "walk" });
    });

    it("walks with a rental car too (you don't drive 500 m in a city)", () => {
      expect(minutesForDistance(0.5, CAR)).toEqual(minutesForDistance(0.5, PT));
    });
  });

  describe("in-city band (1.5 to 8 km): 10 min to reach a stop and wait, then 15 km/h, +30%", () => {
    it("starts exactly at 1.5 km", () => {
      expect(minutesForDistance(1.5, PT)).toEqual({
        minutes: 18,
        band: "in-city",
      }); // 10 + 7.8
    });

    it("takes 29 minutes for 3.6 km", () => {
      expect(minutesForDistance(3.6, PT)).toEqual({
        minutes: 29,
        band: "in-city",
      }); // 10 + 18.72
    });

    it("ignores the rental car (local transit inside a city)", () => {
      expect(minutesForDistance(3.6, CAR)).toEqual(minutesForDistance(3.6, PT));
    });
  });

  describe("regional band (8 to 60 km)", () => {
    it("public transport: 30 min overhead, then 40 km/h", () => {
      expect(minutesForDistance(22, PT)).toEqual({
        minutes: 63,
        band: "regional",
      }); // 30 + 33
    });

    it("rental car: 15 min to park, then 60 km/h, +30% for roads", () => {
      expect(minutesForDistance(22, CAR)).toEqual({
        minutes: 44,
        band: "regional",
      }); // 15 + 28.6
    });

    it("starts exactly at 8 km", () => {
      expect(minutesForDistance(8, PT).band).toBe("regional");
    });
  });

  describe("intercity band (60 km and over)", () => {
    it("public transport: 45 min station overhead, then 120 km/h by train", () => {
      expect(minutesForDistance(230, PT)).toEqual({
        minutes: 160,
        band: "intercity",
      }); // 45 + 115
    });

    it("rental car: 15 min to park, then 90 km/h, +25% for roads", () => {
      expect(minutesForDistance(230, CAR)).toEqual({
        minutes: 207,
        band: "intercity",
      }); // 15 + 191.67
    });

    it("starts exactly at 60 km", () => {
      expect(minutesForDistance(60, PT).band).toBe("intercity");
    });
  });

  it("always returns whole minutes, rounded up", () => {
    [0.1, 1.49, 2.7, 13.3, 77.7].forEach((km) => {
      const { minutes } = minutesForDistance(km, PT);
      expect(Number.isInteger(minutes)).toBe(true);
    });
  });

  it("rejects a negative or non-numeric distance", () => {
    expect(() => minutesForDistance(-1, PT)).toThrow();
    expect(() => minutesForDistance(Number.NaN, PT)).toThrow();
  });
});

describe("travelTime", () => {
  // Real dataset coordinates.
  const pantheon: TravelPoint = {
    latitude: 41.8986,
    longitude: 12.4769,
    city: "Rome",
  };
  const trevi: TravelPoint = {
    latitude: 41.9009,
    longitude: 12.4833,
    city: "Rome",
  };

  describe("car-free cities (Venice, Burano)", () => {
    const rialto: TravelPoint = {
      latitude: 45.438,
      longitude: 12.3359,
      city: "Venice",
    };
    const burano: TravelPoint = {
      latitude: 45.4853,
      longitude: 12.4166,
      city: "Burano",
    };
    const padua: TravelPoint = {
      latitude: 45.3994,
      longitude: 11.8807,
      city: "Padua",
    };

    it("uses Public Transport times in Rental Car mode when both Stops are car-free", () => {
      expect(travelTime(rialto, burano, CAR)).toEqual(
        travelTime(rialto, burano, PT),
      );
    });

    it("reports the mode actually used, so labels can say 'water bus', not 'drive'", () => {
      expect(travelTime(rialto, burano, CAR).mode).toBe("public-transport");
    });

    it("uses Public Transport times when only one end is car-free (you can't drive to the door)", () => {
      expect(travelTime(padua, rialto, CAR)).toEqual(
        travelTime(padua, rialto, PT),
      );
      expect(travelTime(rialto, padua, CAR)).toEqual(
        travelTime(rialto, padua, PT),
      );
    });

    it("still lets the car win elsewhere", () => {
      const chianti: TravelPoint = {
        latitude: 43.5833,
        longitude: 11.3167,
        city: "Florence",
      };
      const uffizi: TravelPoint = {
        latitude: 43.7678,
        longitude: 11.2553,
        city: "Florence",
      };
      expect(travelTime(uffizi, chianti, CAR).minutes).toBeLessThan(
        travelTime(uffizi, chianti, PT).minutes,
      );
    });
  });

  it("combines distance and band into one estimate", () => {
    const result = travelTime(pantheon, trevi, PT);
    expect(result.band).toBe("walk");
    expect(result.km).toBeCloseTo(distanceKm(pantheon, trevi), 10);
    expect(result.minutes).toBe(minutesForDistance(result.km, PT).minutes);
  });

  it("gives the same time in both directions", () => {
    expect(travelTime(pantheon, trevi, CAR)).toEqual(
      travelTime(trevi, pantheon, CAR),
    );
  });
});
