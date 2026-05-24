import { describe, expect, it } from "vitest";
import { validateIcalFeedUrl } from "./ical";

describe("validateIcalFeedUrl", () => {
  it("accepts public HTTPS calendar URLs", () => {
    expect(validateIcalFeedUrl("https://www.airbnb.com/calendar/ical/example.ics"))
      .toBe("https://www.airbnb.com/calendar/ical/example.ics");
  });

  it.each([
    "http://www.airbnb.com/calendar.ics",
    "https://localhost/calendar.ics",
    "https://calendar.internal/calendar.ics",
    "https://127.0.0.1/calendar.ics",
    "https://[::1]/calendar.ics",
    "https://calendar/calendar.ics",
    "https://user:pass@example.com/calendar.ics",
  ])("rejects unsafe feed URL %s", (url) => {
    expect(() => validateIcalFeedUrl(url)).toThrow();
  });
});
