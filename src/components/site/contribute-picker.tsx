"use client";

import { Camera, Clock, PenLine, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Item = { slug: string; name: string; altName: string; location: string };

/** Pick a restaurant, then an action; deep-links into the restaurant page. */
export function ContributePicker({ restaurants }: { restaurants: Item[] }) {
  const t = useTranslations("contribute");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const list = restaurants.filter(
    (r) =>
      !q || `${r.name} ${r.altName} ${r.location}`.toLowerCase().includes(q),
  );

  const actions = [
    { key: "menu", label: t("actionMenu"), icon: Camera },
    { key: "hours", label: t("actionHours"), icon: Clock },
    { key: "review", label: t("actionReview"), icon: Star },
    { key: "fix", label: t("actionFix"), icon: PenLine },
  ];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[30px] leading-tight font-black tracking-tight md:text-[40px]">
        {t("title")}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{t("subtitle")}</p>

      <Link
        href="/contribute/new"
        className="mt-8 flex items-center gap-4 rounded-2xl bg-brand-soft p-4 transition-opacity hover:opacity-90"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
          <Plus className="size-5" />
        </span>
        <span>
          <span className="block font-bold">{t("newRestaurant")}</span>
          <span className="block text-[13px] text-foreground/70">
            {t("newRestaurantHint")}
          </span>
        </span>
      </Link>

      <h2 className="mt-10 mb-3 text-[15px] font-bold">
        {t("pickRestaurant")}
      </h2>
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
      <ul className="mt-3 divide-y">
        {list.map((r) => {
          const open = selected === r.slug;
          return (
            <li key={r.slug}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setSelected(open ? null : r.slug)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
              >
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-semibold",
                      open && "text-brand",
                    )}
                  >
                    {r.name}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {r.location}
                  </span>
                </span>
              </button>
              {open && (
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {actions.map(({ key, label, icon: Icon }) => (
                    <Link
                      key={key}
                      href={`/r/${r.slug}?action=${key}`}
                      className="flex h-12 items-center gap-2 rounded-xl border bg-card px-3 text-[14px] font-medium hover:border-foreground/30"
                    >
                      <Icon className="size-4 text-brand" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
