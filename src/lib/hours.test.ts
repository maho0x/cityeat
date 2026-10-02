import { describe, expect, it } from "vitest";
import { getStatus, type HoursInput, parseTime, scheduleFor } from "./hours";

// 2026-10-05 is a Monday. Times are given in HK (+08:00).
const at = (iso: string) => new Date(`${iso}+08:00`);
const weekdays = (opens: number, closes: number) =>
  [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens, closes }));

const base: HoursInput = {
  weekly: weekdays(8 * 60, 20 * 60),
  overrides: [],
  holidays: new Set(),
};

describe("getStatus", () => {
  it("is open during a period", () => {
    expect(getStatus(base, at("2026-10-05T12:00"))).toMatchObject({
      state: "open",
      closesAt: 1200,
    });
  });

  it("is closing soon within 30 minutes of close", () => {
    expect(getStatus(base, at("2026-10-05T19:40")).state).toBe("closing_soon");
  });

  it("is opening soon within an hour of opening", () => {
    expect(getStatus(base, at("2026-10-05T07:30"))).toMatchObject({
      state: "opening_soon",
      opensAt: 480,
    });
  });

  it("finds the next opening day when closed for the weekend", () => {
    const status = getStatus(base, at("2026-10-03T12:00")); // Saturday
    expect(status).toMatchObject({
      state: "closed",
      allDay: true,
      next: { date: "2026-10-05", dayOffset: 2, opens: 480 },
    });
  });

  it("treats public holidays as closed unless holiday hours exist", () => {
    const input = { ...base, holidays: new Set(["2026-10-05"]) };
    expect(getStatus(input, at("2026-10-05T12:00")).state).toBe("closed");
    const withHoliday = {
      ...input,
      weekly: [...base.weekly, { weekday: 7, opens: 600, closes: 900 }],
    };
    expect(getStatus(withHoliday, at("2026-10-05T12:00")).state).toBe("open");
  });

  it("handles periods past midnight", () => {
    const input: HoursInput = {
      ...base,
      weekly: [{ weekday: 1, opens: 18 * 60, closes: 26 * 60 }],
    };
    expect(getStatus(input, at("2026-10-06T01:00"))).toMatchObject({
      state: "open",
      closesAt: 120,
    });
    expect(getStatus(input, at("2026-10-06T02:30")).state).toBe("closed");
  });

  it("prefers restaurant overrides over campus-wide ones", () => {
    const input: HoursInput = {
      ...base,
      overrides: [
        {
          restaurantId: null,
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          closed: true,
          periods: null,
          note: "Typhoon",
        },
        {
          restaurantId: 1,
          startDate: "2026-10-05",
          endDate: "2026-10-06",
          closed: false,
          periods: [{ opens: 660, closes: 840 }],
          note: "Short hours",
        },
      ],
    };
    expect(getStatus(input, at("2026-10-05T12:00"))).toMatchObject({
      state: "open",
      closesAt: 840,
      note: "Short hours",
    });
    expect(scheduleFor("2026-10-07", input).override).toBeNull();
  });

  it("applies a campus-wide closure", () => {
    const input: HoursInput = {
      ...base,
      overrides: [
        {
          restaurantId: null,
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          closed: true,
          periods: null,
          note: "T8",
        },
      ],
    };
    expect(getStatus(input, at("2026-10-05T12:00"))).toMatchObject({
      state: "closed",
      note: "T8",
      next: { date: "2026-10-06" },
    });
  });
});

describe("parseTime", () => {
  it("parses valid times and rejects bad ones", () => {
    expect(parseTime("08:30")).toBe(510);
    expect(parseTime("24:00")).toBe(1440);
    expect(parseTime("24:30")).toBeNull();
    expect(parseTime("8.30")).toBeNull();
  });
});
