"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Toggle } from "@/components/forms/fields";
import { useStatuses } from "@/components/restaurant/browser";
import { useViewer } from "@/components/site/viewer-context";
import { useNow } from "@/hooks/use-now";
import { formatPrice } from "@/lib/format";
import { isOpen, type Status } from "@/lib/hours";
import type { AreaOption, RestaurantSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Wheel } from "./wheel";

type Filters = {
  openOnly: boolean;
  favOnly: boolean;
  areas: string[];
  query: string;
};

function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

export function Roulette({
  restaurants,
  areas,
  holidays,
  serverNow,
  initial,
}: {
  restaurants: RestaurantSummary[];
  areas: AreaOption[];
  holidays: string[];
  serverNow: number;
  initial: Filters;
}) {
  const t = useTranslations("spin");
  const viewer = useViewer();
  const now = useNow(serverNow);
  const statuses = useStatuses(restaurants, holidays, now);
  const reduceMotion = useReducedMotion();

  const [filters, setFilters] = useState(initial);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [showPool, setShowPool] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const rotation = useMotionValue(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const candidates = useMemo(() => {
    const q = filters.query.toLowerCase();
    return restaurants.filter((r) => {
      if (filters.openOnly && !isOpen(statuses.get(r.id) as Status))
        return false;
      if (filters.favOnly && !r.favorite) return false;
      if (filters.areas.length && !filters.areas.includes(r.areaSlug))
        return false;
      if (
        q &&
        ![r.name, r.altName, r.location, ...r.tags]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [restaurants, statuses, filters]);

  const pool = candidates.filter((r) => !excluded.has(r.id));
  const winnerRestaurant = winner === null ? null : pool[winner];

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setWinner(null);
  };

  function spin() {
    if (spinning || pool.length < 2) return;
    const n = pool.length;
    const seg = 360 / n;
    const index = randomIndex(n);
    // Land somewhere inside the segment, not exactly on its centre.
    const offset = seg * (0.15 + Math.random() * 0.7);
    const target = index * seg + offset;
    const current = rotation.get();
    const base = current - (current % 360);
    const end = base + 360 * (reduceMotion ? 1 : 6) + (360 - target);

    setWinner(null);
    setSpinning(true);
    animate(rotation, end, {
      duration: reduceMotion ? 0.4 : 4.6,
      ease: [0.12, 0.6, 0.08, 1],
      onComplete: () => {
        setSpinning(false);
        setWinner(index);
        navigator.vibrate?.(30);
        requestAnimationFrame(() =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        );
      },
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="text-center">
        <h1 className="text-[30px] leading-tight font-black tracking-tight md:text-[40px]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {t("subtitle", { count: pool.length })}
        </p>
      </header>

      <div className="mt-8">
        {pool.length >= 2 ? (
          <Wheel
            labels={pool.map((r) => r.name)}
            keys={pool.map((r) => r.id)}
            rotation={rotation}
            highlight={spinning ? null : winner}
          />
        ) : (
          <div className="mx-auto grid aspect-square w-full max-w-[min(88vw,420px)] place-items-center rounded-full border-2 border-dashed p-12 text-center text-[15px] text-muted-foreground">
            {t("tooFew")}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={spin}
          disabled={spinning || pool.length < 2}
          className="h-14 min-w-44 rounded-full bg-brand px-10 text-[18px] font-black text-brand-foreground shadow-[0_8px_24px_-8px] shadow-brand/60 transition-transform active:scale-95 disabled:opacity-50"
        >
          {spinning ? t("spinning") : winner !== null ? t("again") : t("spin")}
        </button>
      </div>

      <div ref={resultRef} aria-live="polite" className="mt-8 scroll-mb-28">
        {winnerRestaurant && !spinning && (
          <div className="animate-in fade-in-0 zoom-in-95 rounded-3xl border-2 border-foreground bg-card p-6 text-center duration-300">
            <p className="text-[13px] font-semibold text-muted-foreground">
              {t("result")}
            </p>
            <p className="mt-1 text-[28px] leading-tight font-black">
              {winnerRestaurant.name}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-[14px] text-muted-foreground">
              <MapPin className="size-3.5" />
              {winnerRestaurant.location || winnerRestaurant.areaName}
              {formatPrice(
                winnerRestaurant.priceMin,
                winnerRestaurant.priceMax,
              ) && (
                <span className="ml-2">
                  {formatPrice(
                    winnerRestaurant.priceMin,
                    winnerRestaurant.priceMax,
                  )}
                </span>
              )}
            </p>
            <Link
              href={`/r/${winnerRestaurant.slug}`}
              className="mt-5 flex h-12 items-center justify-center rounded-full bg-foreground text-[15px] font-bold text-background"
            >
              {t("go")}
            </Link>
          </div>
        )}
      </div>

      <section className="mt-10 rounded-2xl bg-card p-5">
        <h2 className="text-[15px] font-bold">{t("pool")}</h2>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={filters.openOnly}
            onChange={(v) => update({ openOnly: v })}
            label={t("openOnly")}
          />
          {viewer && (
            <Toggle
              checked={filters.favOnly}
              onChange={(v) => update({ favOnly: v })}
              label={t("favoritesOnly")}
            />
          )}
          <div>
            <p className="mb-2 text-[13px] font-semibold">{t("areas")}</p>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => {
                const on = filters.areas.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update({
                        areas: on
                          ? filters.areas.filter((s) => s !== a.slug)
                          : [...filters.areas, a.slug],
                      })
                    }
                    className={cn(
                      "h-8 rounded-full border px-3 text-[13px] font-medium",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "hover:border-foreground/30",
                    )}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
          {filters.query && (
            <p className="text-[13px] text-muted-foreground">
              “{filters.query}”{" "}
              <button
                type="button"
                className="font-medium text-brand"
                onClick={() => update({ query: "" })}
              >
                ✕
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowPool((v) => !v)}
            aria-expanded={showPool}
            className="flex w-full items-center justify-between pt-2 text-[13px] font-semibold"
          >
            {t("exclude")} (
            {t("count", { count: candidates.length - pool.length })})
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showPool && "rotate-180",
              )}
            />
          </button>
          {showPool && (
            <ul className="divide-y text-[14px]">
              {candidates.map((r) => {
                const out = excluded.has(r.id);
                return (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center justify-between py-2.5">
                      <span
                        className={cn(
                          out && "text-muted-foreground line-through",
                        )}
                      >
                        {r.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={!out}
                        onChange={() => {
                          const next = new Set(excluded);
                          if (out) next.delete(r.id);
                          else next.add(r.id);
                          setExcluded(next);
                          setWinner(null);
                        }}
                        className="size-4 accent-[var(--brand)]"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
