"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRestaurant } from "@/actions/admin";
import {
  draftToWeekly,
  WeeklyEditor,
  weeklyToDraft,
} from "@/components/forms/contribution-forms";
import {
  Field,
  PrimaryButton,
  Segmented,
  TextInput,
  Toggle,
} from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";
import { formatPrice } from "@/lib/format";
import type { WeeklyPeriod } from "@/lib/hours";
import { cn } from "@/lib/utils";

const PAYMENTS = [
  "cash",
  "credit_card",
  "octopus",
  "alipay_hk",
  "wechat_pay_hk",
  "apple_pay",
  "boc_pay",
  "payme",
  "unionpay",
];

type Initial = {
  id?: number;
  slug: string;
  nameZh: string;
  nameEn: string;
  areaId: number;
  locationZh: string;
  locationEn: string;
  tags: string[];
  priceMin: number | null;
  priceMax: number | null;
  payment: string[];
  phone: string | null;
  unverified: boolean;
  isActive: boolean;
  weekly: WeeklyPeriod[];
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function RestaurantEditor({
  areas,
  initial,
  hint,
  menuPrice,
}: {
  areas: { id: number; name: string }[];
  initial: Initial;
  hint?: string;
  /** Range worked out from synced ordering menus; shown instead of ours. */
  menuPrice?: [number, number];
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tp = useTranslations("payment");
  const router = useRouter();
  const onError = useActionError();
  const [v, setV] = useState({
    ...initial,
    tags: initial.tags.join(", "),
    priceMin: initial.priceMin?.toString() ?? "",
    priceMax: initial.priceMax?.toString() ?? "",
    phone: initial.phone ?? "",
  });
  const [week, setWeek] = useState(() => weeklyToDraft(initial.weekly));
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
    setV((x) => ({ ...x, [k]: value }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const weekly = draftToWeekly(week);
        if (!weekly) return toast.error(tc("invalid"));
        start(async () => {
          const res = await saveRestaurant({
            id: initial.id,
            slug: v.slug || slugify(v.nameEn),
            nameZh: v.nameZh,
            nameEn: v.nameEn,
            areaId: v.areaId,
            locationZh: v.locationZh,
            locationEn: v.locationEn,
            tags: v.tags
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean),
            priceMin: num(v.priceMin),
            priceMax: num(v.priceMax),
            payment: v.payment,
            phone: v.phone.trim() || null,
            unverified: v.unverified,
            isActive: v.isActive,
            weekly,
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("saved"));
          router.push("/admin/restaurants");
        });
      }}
    >
      {hint && (
        <p className="rounded-lg bg-soon-soft px-3 py-2 text-[14px] text-soon">
          {hint}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("nameZh")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.nameZh}
              onChange={(e) => set("nameZh", e.target.value)}
              required
            />
          )}
        </Field>
        <Field label={t("nameEn")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
              required
            />
          )}
        </Field>
        <Field label={t("slug")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.slug}
              placeholder={slugify(v.nameEn)}
              onChange={(e) => set("slug", e.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          )}
        </Field>
        <Field label={t("phone")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          )}
        </Field>
      </div>
      <Segmented
        value={String(v.areaId)}
        onChange={(x) => set("areaId", Number(x))}
        options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("locationZh")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.locationZh}
              onChange={(e) => set("locationZh", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("locationEn")}>
          {(id) => (
            <TextInput
              id={id}
              value={v.locationEn}
              onChange={(e) => set("locationEn", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("priceMin")}>
          {(id) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              value={v.priceMin}
              onChange={(e) => set("priceMin", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("priceMax")}>
          {(id) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              value={v.priceMax}
              onChange={(e) => set("priceMax", e.target.value)}
            />
          )}
        </Field>
        {menuPrice && (
          <p className="text-[12px] text-muted-foreground sm:col-span-2">
            {t("priceFromMenu", { price: formatPrice(...menuPrice) ?? "" })}
          </p>
        )}
      </div>
      <Field
        label={t("tags")}
        hint="fast_food, canteen, western, chinese, dim_sum, cafe, halal, vegetarian, dessert, drinks, japanese, korean, noodles"
      >
        {(id) => (
          <TextInput
            id={id}
            value={v.tags}
            onChange={(e) => set("tags", e.target.value)}
          />
        )}
      </Field>
      <div className="space-y-2">
        <p className="text-[13px] font-semibold">{t("payment")}</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENTS.map((p) => {
            const on = v.payment.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set(
                    "payment",
                    on ? v.payment.filter((x) => x !== p) : [...v.payment, p],
                  )
                }
                className={cn(
                  "h-8 rounded-full border px-3 text-[13px]",
                  on && "border-foreground bg-foreground text-background",
                )}
              >
                {tp(p as "cash")}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-semibold">{t("weeklyHours")}</p>
        <WeeklyEditor value={week} onChange={setWeek} />
      </div>
      <Toggle
        checked={v.unverified}
        onChange={(x) => set("unverified", x)}
        label={t("unverified")}
      />
      <Toggle
        checked={v.isActive}
        onChange={(x) => set("isActive", x)}
        label={t("active")}
      />
      <PrimaryButton pending={pending}>{t("save")}</PrimaryButton>
    </form>
  );
}
