// The traveler's device can be in any time zone. Node re-reads process.env.TZ when it
// changes, so each case below runs as if the device were somewhere else. This catches a
// future change that slips in local-time code like getDay() or toLocaleDateString().
// Lives in scripts/ because it needs Node's `process`, which the browser tsconfig in src/ lacks.
import { afterEach, describe, expect, it } from "vitest";
import { todayInRome, weekdayOf } from "../src/utils/hours/calendar.ts";

describe("calendar helpers are independent of the device time zone", () => {
  const zones = [
    "UTC",
    "America/Los_Angeles",
    "Asia/Tokyo",
    "Pacific/Kiritimati",
    "Pacific/Pago_Pago",
  ];
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(zones)(
    "gives Rome’s date and the right weekday when the device is in %s",
    (zone) => {
      process.env.TZ = zone;
      // 01:30 on 15 July in Rome. Locally it is still 14 July in Los Angeles and Pago Pago.
      expect(todayInRome(new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
      expect(weekdayOf("2026-07-15")).toBe(3); // Wednesday
    },
  );
});
