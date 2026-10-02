"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reviewSubmission } from "@/actions/admin";
import { inputClass } from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";
import { useLightbox } from "@/components/restaurant/lightbox";
import type {
  HoursChangePayload,
  InfoCorrectionPayload,
  NewRestaurantPayload,
} from "@/db/schema";
import { formatMinutes } from "@/lib/hours";

type Props = {
  id: number;
  type: "new_restaurant" | "hours_change" | "info_correction";
  payload: HoursChangePayload | InfoCorrectionPayload | NewRestaurantPayload;
  images: string[];
  createdAt: Date;
  restaurantName: string | null;
  restaurantSlug: string | null;
  submitter: string;
};

const periods = (list?: { opens: number; closes: number }[]) =>
  list?.length
    ? list
        .map((p) => `${formatMinutes(p.opens)}–${formatMinutes(p.closes)}`)
        .join(", ")
    : "—";

export function SubmissionCard({ submission: s }: { submission: Props }) {
  const t = useTranslations("admin");
  const tm = useTranslations("me");
  const tw = useTranslations("weekday");
  const ti = useTranslations("infoForm");
  const th = useTranslations("hoursForm");
  const format = useFormatter();
  const onError = useActionError();
  const lightbox = useLightbox();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const decide = (approve: boolean) =>
    start(async () => {
      const res = await reviewSubmission({ id: s.id, approve, note });
      if (!res.ok) return onError(res.error);
      toast.success(approve ? t("approve") : t("reject"));
    });

  let body: React.ReactNode;
  if (s.type === "hours_change") {
    const p = s.payload as HoursChangePayload;
    body =
      p.kind === "temporary" ? (
        <p>
          {p.startDate} → {p.endDate}：
          {p.closed ? th("closedAllDay") : periods(p.periods)}
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          {Object.entries(p.weekly ?? {}).map(([d, list]) => (
            <div key={d} className="contents">
              <dt className="text-muted-foreground">{tw(d as "0")}</dt>
              <dd className="tabular-nums">{periods(list)}</dd>
            </div>
          ))}
        </dl>
      );
  } else if (s.type === "info_correction") {
    const p = s.payload as InfoCorrectionPayload;
    body = (
      <p>
        <span className="text-muted-foreground">
          {ti(`fields.${p.field}`)}：
        </span>
        {p.value}
      </p>
    );
  } else {
    const p = s.payload as NewRestaurantPayload;
    body = (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {(["name", "location", "hours", "price"] as const).map((k) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{String(p[k] || "—")}</dd>
          </div>
        ))}
      </dl>
    );
  }
  const userNote = (s.payload as { note?: string }).note;

  return (
    <li className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium">
            {tm(`types.${s.type}`)}
          </span>
          {s.restaurantSlug ? (
            <Link href={`/r/${s.restaurantSlug}`} className="hover:underline">
              {s.restaurantName}
            </Link>
          ) : (
            (s.payload as NewRestaurantPayload).name
          )}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {t("submittedBy", { name: s.submitter })}，
          {format.relativeTime(new Date(s.createdAt))}
        </p>
      </div>
      <div className="mt-3 text-[14px]">{body}</div>
      {userNote && (
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-[14px]">
          “{userNote}”
        </p>
      )}
      {s.images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {s.images.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => lightbox.open(s.images, i)}
            >
              {/* biome-ignore lint/performance/noImgElement: already-optimised uploads */}
              <img
                src={`/uploads/${id}_t.webp`}
                alt=""
                className="size-20 rounded-lg object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        {s.type === "hours_change" ? t("applied") : t("manual")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("reviewNote")}
          className={`${inputClass} h-10 min-w-48 flex-1 py-0`}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(false)}
          className="h-10 rounded-full border px-4 text-[14px] font-medium"
        >
          {t("reject")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(true)}
          className="h-10 rounded-full bg-brand px-5 text-[14px] font-bold text-brand-foreground"
        >
          {t("approve")}
        </button>
        {s.type === "new_restaurant" && (
          <Link
            href={`/admin/restaurants/new?from=${s.id}`}
            className="flex h-10 items-center rounded-full border px-4 text-[14px] font-medium"
          >
            {t("createFrom")}
          </Link>
        )}
      </div>
      {lightbox.element}
    </li>
  );
}
