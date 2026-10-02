import type { Period } from "@/db/schema";

/** Weekday index used for public holidays in `opening_hours.weekday`. */
export const HOLIDAY = 7;
const CLOSING_SOON_MIN = 30;
const OPENING_SOON_MIN = 60;

export type WeeklyPeriod = Period & { weekday: number };
export type Override = {
  restaurantId: number | null;
  startDate: string;
  endDate: string;
  closed: boolean;
  periods: Period[] | null;
  note: string;
};

export type HoursInput = {
  weekly: WeeklyPeriod[];
  /** Overrides relevant to this restaurant, including campus-wide ones. */
  overrides: Override[];
  /** Public holiday dates as YYYY-MM-DD. */
  holidays: ReadonlySet<string>;
};

export type DaySchedule = {
  date: string;
  periods: Period[];
  holiday: boolean;
  override: Override | null;
};

export type Status =
  | { state: "open"; closesAt: number; note: string | null }
  | { state: "closing_soon"; closesAt: number; note: string | null }
  | { state: "opening_soon"; opensAt: number; note: string | null }
  | {
      state: "closed";
      /** Next opening, if any within a week. */
      next: { date: string; dayOffset: number; opens: number } | null;
      /** True when there are no periods at all today. */
      allDay: boolean;
      note: string | null;
    };

/* Hong Kong has no DST, so a fixed +08:00 offset is exact. */
const HK_OFFSET_MS = 8 * 60 * 60 * 1000;

export function hkClock(now: Date) {
  const hk = new Date(now.getTime() + HK_OFFSET_MS);
  return {
    date: hk.toISOString().slice(0, 10),
    weekday: hk.getUTCDay(),
    minutes: hk.getUTCHours() * 60 + hk.getUTCMinutes(),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function byOpens(a: Period, b: Period) {
  return a.opens - b.opens;
}

/** Resolve the effective periods for a calendar date (HK time). */
export function scheduleFor(date: string, input: HoursInput): DaySchedule {
  const holiday = input.holidays.has(date);
  const matching = input.overrides.filter(
    (o) => o.startDate <= date && date <= o.endDate,
  );
  // A restaurant-specific override beats a campus-wide one.
  const override =
    matching.find((o) => o.restaurantId !== null) ??
    matching.find((o) => o.restaurantId === null) ??
    null;

  if (override) {
    const periods = override.closed ? [] : [...(override.periods ?? [])];
    return { date, periods: periods.sort(byOpens), holiday, override };
  }

  const weekday = holiday ? HOLIDAY : weekdayOf(date);
  const periods = input.weekly
    .filter((p) => p.weekday === weekday)
    .map(({ opens, closes }) => ({ opens, closes }))
    .sort(byOpens);
  return { date, periods, holiday, override: null };
}

export function getStatus(input: HoursInput, now: Date): Status {
  const { date, minutes } = hkClock(now);
  const today = scheduleFor(date, input);
  const note = today.override?.note || null;

  // A period from yesterday that runs past midnight.
  const yesterday = scheduleFor(addDays(date, -1), input);
  const carry = yesterday.periods.find(
    (p) => p.closes > 1440 && minutes < p.closes - 1440,
  );
  const current =
    carry ??
    today.periods.find((p) => p.opens <= minutes && minutes < p.closes);

  if (current) {
    const closesAt = carry ? current.closes - 1440 : current.closes;
    const state =
      closesAt - minutes <= CLOSING_SOON_MIN ? "closing_soon" : "open";
    return { state, closesAt, note };
  }

  const later = today.periods.find((p) => p.opens > minutes);
  if (later && later.opens - minutes <= OPENING_SOON_MIN) {
    return { state: "opening_soon", opensAt: later.opens, note };
  }

  let next: { date: string; dayOffset: number; opens: number } | null = later
    ? { date, dayOffset: 0, opens: later.opens }
    : null;
  for (let offset = 1; !next && offset <= 7; offset++) {
    const day = scheduleFor(addDays(date, offset), input);
    if (day.periods.length > 0) {
      next = { date: day.date, dayOffset: offset, opens: day.periods[0].opens };
    }
  }
  return {
    state: "closed",
    next,
    allDay: today.periods.length === 0,
    note,
  };
}

export function isOpen(status: Status) {
  return status.state === "open" || status.state === "closing_soon";
}

export function formatMinutes(m: number): string {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}

export function parseTime(s: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}
