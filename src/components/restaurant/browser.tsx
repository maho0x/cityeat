"use client";

import { Dices, Heart, Search, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { useViewer } from "@/components/site/viewer-context";
import { useNow } from "@/hooks/use-now";
import { formatPrice, formatRating } from "@/lib/format";
import {
  formatMinutes,
  getStatus,
  hkClock,
  isOpen,
  type Status,
} from "@/lib/hours";
import type { AreaOption, RestaurantSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { StatusDot, statusTone, useStatusText } from "./status";

const STATE_ORDER: Record<Status["state"], number> = {
  open: 0,
  closing_soon: 1,
  opening_soon: 2,
  closed: 3,
};

export function useStatuses(
  restaurants: RestaurantSummary[],
  holidays: string[],
  now: Date,
) {
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  return useMemo(
    () =>
      new Map(
        restaurants.map((r) => [
          r.id,
          getStatus(
            { weekly: r.weekly, overrides: r.overrides, holidays: holidaySet },
            now,
          ),
        ]),
      ),
    [restaurants, holidaySet, now],
  );
}

export function RestaurantBrowser({
  restaurants,
  areas,
  holidays,
  serverNow,
}: {
  restaurants: RestaurantSummary[];
  areas: AreaOption[];
  holidays: string[];
  serverNow: number;
}) {
  const t = useTranslations("home");
  const tt = useTranslations("tags");
  const viewer = useViewer();
  const now = useNow(serverNow);
  const statuses = useStatuses(restaurants, holidays, now);

  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const openCount = restaurants.filter((r) =>
    isOpen(statuses.get(r.id) as Status),
  ).length;

  const visible = useMemo(() => {
    const matches = (r: RestaurantSummary) => {
      if (areaFilter && r.areaSlug !== areaFilter) return false;
      if (openOnly && !isOpen(statuses.get(r.id) as Status)) return false;
      if (favOnly && !r.favorite) return false;
      if (!deferredQuery) return true;
      const haystack = [
        r.name,
        r.altName,
        r.areaName,
        r.location,
        ...r.tags,
        ...r.tags.map((tag) =>
          tt.has(tag as "cafe") ? tt(tag as "cafe") : tag,
        ),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredQuery);
    };
    return restaurants
      .filter(matches)
      .sort(
        (a, b) =>
          STATE_ORDER[(statuses.get(a.id) as Status).state] -
          STATE_ORDER[(statuses.get(b.id) as Status).state],
      );
  }, [restaurants, statuses, areaFilter, openOnly, favOnly, deferredQuery, tt]);

  const filtered = !!(areaFilter || openOnly || favOnly || deferredQuery);
  const spinParams = new URLSearchParams();
  if (areaFilter) spinParams.set("area", areaFilter);
  if (openOnly) spinParams.set("open", "1");
  if (favOnly) spinParams.set("fav", "1");
  if (deferredQuery) spinParams.set("q", deferredQuery);

  const clear = () => {
    setQuery("");
    setAreaFilter(null);
    setOpenOnly(false);
    setFavOnly(false);
  };

  const time = formatMinutes(hkClock(now).minutes);

  return (
    <div>
      <section className="pt-2 pb-6 md:pt-8 md:pb-10">
        <h1 className="max-w-[18ch] text-[34px] leading-[1.12] font-black tracking-tight text-balance md:text-[52px]">
          {openCount > 0
            ? t("headlineOpen", { time, count: openCount })
            : t("headlineNone", { time })}
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          {t("headlineSub", { total: restaurants.length })}
        </p>
      </section>

      <div className="sticky top-14 z-30 -mx-4 bg-background/90 px-4 pt-1 pb-3 backdrop-blur-lg">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-11 w-full rounded-full border bg-card pr-4 pl-10 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground/30"
          />
        </label>
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            <span className="size-2 rounded-full bg-open" />
            {t("openNow")}
          </Chip>
          {viewer && (
            <Chip active={favOnly} onClick={() => setFavOnly((v) => !v)}>
              <Heart className="size-3.5" />
              {t("favorites")}
            </Chip>
          )}
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          <Chip
            active={areaFilter === null}
            onClick={() => setAreaFilter(null)}
          >
            {t("allAreas")}
          </Chip>
          {areas.map((a) => (
            <Chip
              key={a.slug}
              active={areaFilter === a.slug}
              onClick={() =>
                setAreaFilter(areaFilter === a.slug ? null : a.slug)
              }
            >
              {a.name}
            </Chip>
          ))}
        </div>
      </div>

      {filtered && visible.length >= 2 && (
        <Link
          href={`/spin?${spinParams}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
        >
          <Dices className="size-4" />
          {t("spinThese", { count: visible.length })}
        </Link>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <button
            type="button"
            onClick={clear}
            className="mt-3 text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
          {visible.map((r) => (
            <RestaurantRow
              key={r.id}
              restaurant={r}
              status={statuses.get(r.id) as Status}
              now={now}
            />
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        {t("missing")}{" "}
        <Link
          href="/contribute/new"
          className="font-medium text-brand hover:underline"
        >
          {t("addRestaurant")}
        </Link>
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}

function RestaurantRow({
  restaurant: r,
  status,
  now,
}: {
  restaurant: RestaurantSummary;
  status: Status;
  now: Date;
}) {
  const t = useTranslations("home");
  const tt = useTranslations("tags");
  const statusText = useStatusText()(status, now);
  const tone = statusTone(status);
  const price = formatPrice(r.priceMin, r.priceMax);
  const rating = formatRating(r.rating);

  return (
    <li className="border-b">
      <Link
        href={`/r/${r.slug}`}
        className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-card"
      >
        {r.cover && (
          // biome-ignore lint/performance/noImgElement: user uploads are already resized WebP
          <img
            src={r.cover}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <h2 className="truncate text-[17px] font-bold">{r.name}</h2>
          </div>
          <p className="mt-0.5 truncate pl-[18px] text-[13px] text-muted-foreground">
            {r.location || r.areaName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[18px] text-[13px]">
            {rating ? (
              <span className="inline-flex items-center gap-0.5 font-semibold">
                <Star className="size-3.5 fill-current text-brand" />
                {rating}
                <span className="font-normal text-muted-foreground">
                  ({r.reviewCount})
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("reviews", { count: 0 })}
              </span>
            )}
            {price && <span className="text-muted-foreground">{price}</span>}
            {r.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-muted-foreground">
                {tt.has(tag as "cafe") ? tt(tag as "cafe") : tag}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-[12px] font-semibold",
              tone === "open" && "text-open",
              tone === "soon" && "text-soon",
              tone === "closed" && "text-muted-foreground",
            )}
          >
            {statusText.label}
          </p>
          {statusText.time ? (
            <p
              className={cn(
                "text-[22px] leading-tight font-bold tabular-nums",
                tone === "closed" && "text-muted-foreground",
              )}
            >
              {statusText.time}
            </p>
          ) : (
            <p className="max-w-[9rem] text-[12px] leading-tight text-muted-foreground">
              {statusText.detail}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
