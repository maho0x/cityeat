"use client";

import { useTranslations } from "next-intl";
import { formatMinutes, hkClock, type Status } from "@/lib/hours";
import { cn } from "@/lib/utils";

export function statusTone(status: Status) {
  switch (status.state) {
    case "open":
      return "open";
    case "closing_soon":
    case "opening_soon":
      return "soon";
    default:
      return "closed";
  }
}

export function StatusDot({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "relative inline-flex size-2.5 shrink-0 rounded-full",
        tone === "open" && "bg-open",
        tone === "soon" && "bg-soon",
        tone === "closed" && "bg-muted-foreground/40",
        className,
      )}
    >
      {tone === "open" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-open opacity-40 motion-reduce:hidden" />
      )}
    </span>
  );
}

/** Short label + the time that matters most for this state. */
export function useStatusText() {
  const t = useTranslations("status");
  const tw = useTranslations("weekday");
  return (status: Status, now: Date) => {
    switch (status.state) {
      case "open":
        return {
          label: t("openUntil"),
          time: formatMinutes(status.closesAt),
          detail: t("until", { time: formatMinutes(status.closesAt) }),
        };
      case "closing_soon": {
        const min = (status.closesAt - hkClock(now).minutes + 1440) % 1440;
        return {
          label: t("closingSoon"),
          time: formatMinutes(status.closesAt),
          detail: t("closesIn", { min }),
        };
      }
      case "opening_soon":
        return {
          label: t("openingSoon"),
          time: formatMinutes(status.opensAt),
          detail: t("opensAt", { time: formatMinutes(status.opensAt) }),
        };
      case "closed": {
        const label = status.allDay ? t("closedToday") : t("closed");
        if (!status.next) return { label, time: null, detail: t("noUpcoming") };
        const time = formatMinutes(status.next.opens);
        const { dayOffset, date } = status.next;
        const detail =
          dayOffset === 0
            ? t("opensAt", { time })
            : dayOffset === 1
              ? t("opensTomorrow", { time })
              : t("opensOn", {
                  day: tw(
                    String(new Date(`${date}T00:00:00Z`).getUTCDay()) as "0",
                  ),
                  time,
                });
        return { label, time: null, detail };
      }
    }
  };
}
