"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  addDays,
  formatMinutes,
  type HoursInput,
  hkClock,
  scheduleFor,
} from "@/lib/hours";
import { cn } from "@/lib/utils";

/** The actual schedule for the next 7 days, including holidays and overrides. */
export function HoursList({ input, now }: { input: HoursInput; now: Date }) {
  const t = useTranslations("restaurant");
  const tw = useTranslations("weekday");
  const format = useFormatter();
  const today = hkClock(now).date;

  return (
    <ol className="text-[14px]">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i);
        const day = scheduleFor(date, input);
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const isToday = i === 0;
        return (
          <li
            key={date}
            className={cn(
              "flex items-baseline justify-between gap-3 border-b border-dashed py-2 last:border-0",
              isToday && "font-semibold",
            )}
          >
            <span className="flex items-baseline gap-2">
              <span className={cn(isToday && "text-brand")}>
                {isToday ? t("today") : tw(String(weekday) as "0")}
              </span>
              <span className="text-[12px] font-normal text-muted-foreground tabular-nums">
                {format.dateTime(new Date(`${date}T00:00:00+08:00`), {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
              {(day.holiday || day.override) && (
                <span className="rounded bg-soon-soft px-1.5 text-[11px] font-medium text-soon">
                  {day.override
                    ? day.override.note || t("overrideNote")
                    : tw("7")}
                </span>
              )}
            </span>
            <span
              className={cn(
                "text-right tabular-nums",
                day.periods.length === 0 && "text-muted-foreground",
              )}
            >
              {day.periods.length === 0
                ? t("closed")
                : day.periods.map((p) => (
                    <span key={p.opens} className="block">
                      {formatMinutes(p.opens)}–{formatMinutes(p.closes)}
                    </span>
                  ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
