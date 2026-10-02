"use client";

import { ArrowUpRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { formatCents } from "@/lib/format";
import type { OrderMenu } from "@/lib/queries";
import { cn } from "@/lib/utils";

const MAX_TABS = 12;
const COLLAPSED = 10;

/** Dishes mirrored from the restaurant's online-ordering stores. */
export function OrderMenus({ menus }: { menus: OrderMenu[] }) {
  const t = useTranslations("restaurant");
  const format = useFormatter();
  const [storeIdx, setStoreIdx] = useState(0);
  const [catIdx, setCatIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const store = menus[Math.min(storeIdx, menus.length - 1)];
  // Some stores make every set meal its own category; chips only help when
  // there are a few categories, otherwise show one list.
  const tabbed = store.categories.length <= MAX_TABS;
  const all = tabbed
    ? store.categories[Math.min(catIdx, store.categories.length - 1)].items
    : store.categories.flatMap((c) => c.items);
  const items = tabbed || expanded ? all : all.slice(0, COLLAPSED);

  return (
    <div className="rounded-2xl border p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-bold">{t("orderMenu")}</h3>
        <a
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-0.5 text-[14px] font-medium text-brand hover:underline"
        >
          {t("orderOnline")}
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>

      {menus.length > 1 && (
        <ChipRow
          labels={menus.map((m) => m.name)}
          active={storeIdx}
          onSelect={(i) => {
            setStoreIdx(i);
            setCatIdx(0);
            setExpanded(false);
          }}
          strong
        />
      )}
      {tabbed && (
        <ChipRow
          labels={store.categories.map((c) => c.name)}
          active={catIdx}
          onSelect={setCatIdx}
        />
      )}

      <ul className="mt-2 divide-y">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-3 py-2.5",
              !item.available && "text-muted-foreground",
            )}
          >
            {item.imageUrl ? (
              // biome-ignore lint/performance/noImgElement: remote platform CDN
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className={cn(
                  "size-12 shrink-0 rounded-lg bg-muted object-cover",
                  !item.available && "opacity-50",
                )}
              />
            ) : (
              <div className="size-12 shrink-0 rounded-lg bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug">
                {item.name}
              </p>
              {item.altName && (
                <p className="truncate text-[12px] text-muted-foreground">
                  {item.altName}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">
                {formatCents(item.price)}
              </p>
              {!item.available && (
                <p className="text-[12px]">{t("unavailable")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {items.length < all.length && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[14px] font-medium text-muted-foreground hover:text-foreground"
        >
          {t("showAllDishes", { count: all.length })}
        </button>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        {t("orderMenuSynced", {
          time: format.relativeTime(new Date(store.syncedAt)),
        })}
      </p>
    </div>
  );
}

function ChipRow({
  labels,
  active,
  onSelect,
  strong,
}: {
  labels: string[];
  active: number;
  onSelect: (i: number) => void;
  strong?: boolean;
}) {
  return (
    <div className="scrollbar-none -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:-mx-5 md:px-5">
      {labels.map((label, i) => (
        <button
          // biome-ignore lint/suspicious/noArrayIndexKey: labels can repeat
          key={i}
          type="button"
          aria-pressed={i === active}
          onClick={() => onSelect(i)}
          className={cn(
            "h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors",
            i === active
              ? strong
                ? "border-brand bg-brand text-brand-foreground"
                : "border-foreground bg-foreground text-background"
              : "hover:border-foreground/30",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
