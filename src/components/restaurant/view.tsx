"use client";

import { Clock, Heart, MapPin, Phone, Share2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFavorite } from "@/actions/content";
import {
  HoursForm,
  InfoForm,
  MenuForm,
  ReviewForm,
} from "@/components/forms/contribution-forms";
import { Sheet } from "@/components/forms/sheet";
import { useActionError } from "@/components/forms/use-action-error";
import { useRequireSignIn } from "@/components/site/viewer-context";
import { useNow } from "@/hooks/use-now";
import { formatPrice } from "@/lib/format";
import { getStatus, type Override, type WeeklyPeriod } from "@/lib/hours";
import type {
  MenuEntry,
  OrderMenu,
  ReviewEntry,
  ReviewSort,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { HoursList } from "./hours-list";
import { MenuSection } from "./menu-section";
import { ReviewSection } from "./review-section";
import { StatusDot, statusTone, useStatusText } from "./status";

export type RestaurantDetail = {
  id: number;
  slug: string;
  name: string;
  altName: string;
  areaName: string;
  location: string;
  tags: string[];
  priceMin: number | null;
  priceMax: number | null;
  payment: string[];
  phone: string | null;
  unverified: boolean;
  weekly: WeeklyPeriod[];
  overrides: Override[];
};

export type SheetKind = "menu" | "hours" | "review" | "fix";

export function RestaurantView({
  restaurant: r,
  holidays,
  menus,
  orderMenus,
  reviews,
  sort,
  summary,
  isFavorite,
  action,
  serverNow,
}: {
  restaurant: RestaurantDetail;
  holidays: string[];
  menus: MenuEntry[];
  orderMenus: OrderMenu[];
  reviews: ReviewEntry[];
  sort: ReviewSort;
  summary: { average: number | null; distribution: number[]; count: number };
  isFavorite: boolean;
  action: string | null;
  serverNow: number;
}) {
  const t = useTranslations("restaurant");
  const ts = useTranslations("status");
  const tt = useTranslations("tags");
  const tp = useTranslations("payment");
  const th = useTranslations("hoursForm");
  const ti = useTranslations("infoForm");
  const tm = useTranslations("menuForm");
  const router = useRouter();
  const requireSignIn = useRequireSignIn();
  const onError = useActionError();
  const now = useNow(serverNow);

  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const input = useMemo(
    () => ({ weekly: r.weekly, overrides: r.overrides, holidays: holidaySet }),
    [r.weekly, r.overrides, holidaySet],
  );
  const status = getStatus(input, now);
  const text = useStatusText()(status, now);
  const tone = statusTone(status);

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [favorite, setFavorite] = useState(isFavorite);
  const [, startFav] = useTransition();
  const myReview = reviews.find((rv) => rv.mine);

  const open = (kind: SheetKind) => {
    if (!requireSignIn(`/r/${r.slug}?action=${kind}`)) return;
    setSheet(kind);
  };

  // Deep link from the contribute page: /r/slug?action=menu
  // biome-ignore lint/correctness/useExhaustiveDependencies: run only when the action param changes
  useEffect(() => {
    if (action && ["menu", "hours", "review", "fix"].includes(action)) {
      open(action as SheetKind);
      router.replace(`/r/${r.slug}`, { scroll: false });
    }
  }, [action]);

  const close = () => setSheet(null);
  const price = formatPrice(r.priceMin, r.priceMax);

  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: r.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("copied"));
      }
    } catch {}
  }

  const contributePanel = (
    <section className="rounded-2xl bg-card p-5">
      <h2 className="text-[15px] font-bold">{t("contribute")}</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {t("contributeHint")}
      </p>
      <div className="mt-4 grid gap-2">
        {(
          [
            ["hours", t("reportHours")],
            ["menu", t("uploadMenu")],
            ["fix", t("correctInfo")],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => open(kind)}
            className="h-10 rounded-xl border px-4 text-left text-[14px] font-medium hover:border-foreground/30"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <article>
      <header className="pb-6 md:pt-6 md:pb-10">
        <p className="text-[13px] font-medium text-muted-foreground">
          {r.areaName}
        </p>
        <h1 className="mt-1 text-[32px] leading-tight font-black tracking-tight text-balance md:text-[44px]">
          {r.name}
        </h1>
        {r.altName && r.altName !== r.name && (
          <p className="mt-0.5 text-[15px] text-muted-foreground">
            {r.altName}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <StatusDot status={status} className="size-3" />
          <p className="text-[17px]">
            <span
              className={cn(
                "font-bold",
                tone === "open" && "text-open",
                tone === "soon" && "text-soon",
              )}
            >
              {status.state === "open" ? ts("open") : text.label}
            </span>{" "}
            <span className="text-foreground/80">{text.detail}</span>
          </p>
        </div>
        {status.note && (
          <p className="mt-2 inline-block rounded-lg bg-soon-soft px-3 py-1.5 text-[13px] text-soon">
            {t("overrideNote")}：{status.note}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => open("review")}
            className="h-11 rounded-full bg-brand px-5 text-[15px] font-bold text-brand-foreground hover:opacity-90"
          >
            {myReview ? t("editReview") : t("writeReview")}
          </button>
          <button
            type="button"
            onClick={() => open("menu")}
            className="h-11 rounded-full border bg-card px-5 text-[15px] font-medium hover:border-foreground/30"
          >
            {t("uploadMenu")}
          </button>
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={favorite ? t("favorited") : t("favorite")}
            onClick={() => {
              if (!requireSignIn()) return;
              setFavorite((f) => !f);
              startFav(async () => {
                const res = await toggleFavorite({ restaurantId: r.id });
                if (!res.ok) {
                  setFavorite((f) => !f);
                  onError(res.error);
                } else setFavorite(res.data.favorite);
              });
            }}
            className="grid size-11 place-items-center rounded-full border bg-card hover:border-foreground/30"
          >
            <Heart
              className={cn("size-5", favorite && "fill-brand text-brand")}
            />
          </button>
          <button
            type="button"
            aria-label={t("share")}
            onClick={share}
            className="grid size-11 place-items-center rounded-full border bg-card hover:border-foreground/30"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </header>

      {r.unverified && (
        <p className="mb-8 rounded-xl border border-dashed px-4 py-3 text-[13px] text-muted-foreground">
          {t("unverified")}{" "}
          <button
            type="button"
            onClick={() => open("fix")}
            className="font-semibold text-brand hover:underline"
          >
            {t("reportFix")}
          </button>
        </p>
      )}

      {/* Phones show menu and reviews before hours and info; desktop keeps
          hours and info in the sticky right column. */}
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_320px] md:gap-14">
        <div className="min-w-0 space-y-12 md:col-start-1 md:row-start-1">
          <MenuSection
            menus={menus}
            orderMenus={orderMenus}
            onUpload={() => open("menu")}
          />
          <ReviewSection
            reviews={reviews}
            sort={sort}
            summary={summary}
            hasMine={!!myReview}
            onWrite={() => open("review")}
          />
        </div>
        <aside className="space-y-8 md:sticky md:top-20 md:col-start-2 md:row-start-1 md:self-start">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
              <Clock className="size-4" />
              {t("hours")}
            </h2>
            <HoursList input={input} now={now} />
          </section>

          <dl className="space-y-4 text-[14px]">
            <InfoRow icon={MapPin} label={t("location")}>
              {r.location}
            </InfoRow>
            {(price || r.tags.length > 0) && (
              <InfoRow icon={Wallet} label={t("payment")}>
                {price && <span className="font-semibold">{price} </span>}
                {r.payment.length > 0 && (
                  <span className="text-muted-foreground">
                    {r.payment
                      .map((p) => (tp.has(p as "cash") ? tp(p as "cash") : p))
                      .join("、")}
                  </span>
                )}
                {r.tags.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[12px]"
                      >
                        {tt.has(tag as "cafe") ? tt(tag as "cafe") : tag}
                      </span>
                    ))}
                  </span>
                )}
              </InfoRow>
            )}
            {r.phone && (
              <InfoRow icon={Phone} label={t("phone")}>
                <a
                  href={`tel:${r.phone.replace(/\s/g, "")}`}
                  className="hover:underline"
                >
                  {r.phone}
                </a>
              </InfoRow>
            )}
          </dl>

          <div className="hidden md:block">{contributePanel}</div>
        </aside>
        <div className="md:hidden">{contributePanel}</div>
      </div>

      <Sheet
        open={sheet === "review"}
        onOpenChange={(o) => !o && close()}
        title={myReview ? t("editReview") : t("writeReview")}
        description={r.name}
      >
        <ReviewForm
          restaurantId={r.id}
          initial={
            myReview && {
              rating: myReview.rating,
              content: myReview.content,
              images: myReview.images,
              anonymous: myReview.author === null,
            }
          }
          onDone={close}
        />
      </Sheet>
      <Sheet
        open={sheet === "menu"}
        onOpenChange={(o) => !o && close()}
        title={tm("title")}
        description={tm("hint")}
      >
        <MenuForm restaurantId={r.id} onDone={close} />
      </Sheet>
      <Sheet
        open={sheet === "hours"}
        onOpenChange={(o) => !o && close()}
        title={th("title")}
        description={r.name}
      >
        <HoursForm restaurantId={r.id} weekly={r.weekly} onDone={close} />
      </Sheet>
      <Sheet
        open={sheet === "fix"}
        onOpenChange={(o) => !o && close()}
        title={ti("title")}
        description={r.name}
      >
        <InfoForm restaurantId={r.id} onDone={close} />
      </Sheet>
    </article>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
