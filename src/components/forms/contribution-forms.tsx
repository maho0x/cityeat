"use client";

import { Plus, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createMenu,
  createReport,
  createSubmission,
  saveReview,
} from "@/actions/content";
import type { Period } from "@/db/schema";
import { formatMinutes, parseTime, type WeeklyPeriod } from "@/lib/hours";
import { cn } from "@/lib/utils";
import {
  Field,
  PrimaryButton,
  Segmented,
  TextArea,
  TextInput,
  Toggle,
} from "./fields";
import { ImagePicker } from "./image-picker";
import { useActionError } from "./use-action-error";

type Done = () => void;

/* ───────── Review ───────── */

export type ReviewDraft = {
  rating: number;
  content: string;
  images: string[];
  anonymous: boolean;
};

export function ReviewForm({
  restaurantId,
  initial,
  onDone,
}: {
  restaurantId: number;
  initial?: ReviewDraft;
  onDone: Done;
}) {
  const t = useTranslations("review");
  const onError = useActionError();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState(initial?.content ?? "");
  const [images, setImages] = useState(initial?.images ?? []);
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveReview({
            restaurantId,
            rating,
            content,
            images,
            anonymous,
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("saved"));
          onDone();
        });
      }}
    >
      <div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover only previews the rating; buttons handle input */}
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} – ${t(`ratings.${n}` as "ratings.1")}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1 transition-transform active:scale-90"
            >
              <Star
                className={cn(
                  "size-9 transition-colors",
                  n <= shown
                    ? "fill-brand text-brand"
                    : "text-muted-foreground/40",
                )}
                strokeWidth={1.5}
              />
            </button>
          ))}
          <span className="ml-2 text-[15px] font-semibold">
            {shown ? t(`ratings.${shown}` as "ratings.1") : ""}
          </span>
        </div>
      </div>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("contentPlaceholder")}
        maxLength={2000}
        aria-label={t("title")}
      />
      <ImagePicker
        value={images}
        onChange={setImages}
        onBusyChange={setUploading}
      />
      <Toggle
        checked={anonymous}
        onChange={setAnonymous}
        label={t("anonymous")}
        hint={t("anonymousHint")}
      />
      <PrimaryButton pending={pending} disabled={rating === 0 || uploading}>
        {initial ? t("update") : t("submit")}
      </PrimaryButton>
    </form>
  );
}

/* ───────── Menu ───────── */

export function MenuForm({
  restaurantId,
  onDone,
}: {
  restaurantId: number;
  onDone: Done;
}) {
  const t = useTranslations("menuForm");
  const onError = useActionError();
  const [images, setImages] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createMenu({ restaurantId, images, note });
          if (!res.ok) return onError(res.error);
          toast.success(t("done"));
          onDone();
        });
      }}
    >
      <ImagePicker
        value={images}
        onChange={setImages}
        onBusyChange={setUploading}
      />
      <Field label={t("note")}>
        {(id) => (
          <TextInput
            id={id}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={300}
          />
        )}
      </Field>
      <PrimaryButton
        pending={pending}
        disabled={images.length === 0 || uploading}
      >
        {t("submit")}
      </PrimaryButton>
    </form>
  );
}

/* ───────── Hours ───────── */

type DraftPeriod = { opens: string; closes: string };

function toDraft(p: Period): DraftPeriod {
  return { opens: formatMinutes(p.opens), closes: formatMinutes(p.closes) };
}

/** "HH:MM" pairs to minutes; a close at or before opening means past midnight. */
function fromDraft(list: DraftPeriod[]): Period[] | null {
  const out: Period[] = [];
  for (const p of list) {
    const opens = parseTime(p.opens);
    let closes = parseTime(p.closes);
    if (opens === null || closes === null) return null;
    if (closes <= opens) closes += 1440;
    out.push({ opens, closes });
  }
  return out;
}

function PeriodsEditor({
  value,
  onChange,
}: {
  value: DraftPeriod[];
  onChange: (v: DraftPeriod[]) => void;
}) {
  const t = useTranslations("hoursForm");
  return (
    <div className="space-y-2">
      {value.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: periods have no identity
        <div key={i} className="flex items-center gap-2">
          <TextInput
            type="time"
            value={p.opens}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  j === i ? { ...x, opens: e.target.value } : x,
                ),
              )
            }
            className="h-10 w-auto flex-1 tabular-nums"
            aria-label={t("from")}
          />
          <span className="text-muted-foreground">–</span>
          <TextInput
            type="time"
            value={p.closes}
            onChange={(e) =>
              onChange(
                value.map((x, j) =>
                  j === i ? { ...x, closes: e.target.value } : x,
                ),
              )
            }
            className="h-10 w-auto flex-1 tabular-nums"
            aria-label={t("to")}
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {value.length < 4 && (
        <button
          type="button"
          onClick={() =>
            onChange([...value, { opens: "08:00", closes: "20:00" }])
          }
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand"
        >
          <Plus className="size-3.5" />
          {t("addPeriod")}
        </button>
      )}
    </div>
  );
}

const DAYS = ["1", "2", "3", "4", "5", "6", "0", "7"] as const;

export function WeeklyEditor({
  value,
  onChange,
}: {
  value: Record<string, DraftPeriod[]>;
  onChange: (v: Record<string, DraftPeriod[]>) => void;
}) {
  const tw = useTranslations("weekday");
  const t = useTranslations("hoursForm");
  return (
    <div className="divide-y rounded-xl border">
      {DAYS.map((d) => (
        <div key={d} className="grid gap-2 p-3 sm:grid-cols-[6rem_1fr]">
          <div className="flex items-center justify-between sm:block">
            <span className="text-[14px] font-semibold">{tw(d)}</span>
            {d !== "1" && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, [d]: [...(value["1"] ?? [])] })
                }
                className="text-[12px] text-muted-foreground hover:text-foreground sm:mt-1 sm:block"
              >
                {t("copyMonday")}
              </button>
            )}
          </div>
          <div>
            {(value[d] ?? []).length === 0 && (
              <p className="mb-1 text-[13px] text-muted-foreground">
                {t("closedDay")}
              </p>
            )}
            <PeriodsEditor
              value={value[d] ?? []}
              onChange={(v) => onChange({ ...value, [d]: v })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function weeklyToDraft(weekly: WeeklyPeriod[]) {
  const out: Record<string, DraftPeriod[]> = {};
  for (const d of DAYS) {
    out[d] = weekly
      .filter((p) => String(p.weekday) === d)
      .sort((a, b) => a.opens - b.opens)
      .map(toDraft);
  }
  return out;
}

export function draftToWeekly(draft: Record<string, DraftPeriod[]>) {
  const out: Record<string, Period[]> = {};
  for (const [d, list] of Object.entries(draft)) {
    const periods = fromDraft(list);
    if (!periods) return null;
    out[d] = periods;
  }
  return out;
}

function today() {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

export function HoursForm({
  restaurantId,
  weekly,
  onDone,
}: {
  restaurantId: number;
  weekly: WeeklyPeriod[];
  onDone: Done;
}) {
  const t = useTranslations("hoursForm");
  const tc = useTranslations("common");
  const onError = useActionError();
  const [kind, setKind] = useState<"temporary" | "permanent">("temporary");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [closed, setClosed] = useState(true);
  const [periods, setPeriods] = useState<DraftPeriod[]>([
    { opens: "08:00", closes: "17:00" },
  ]);
  const [week, setWeek] = useState(() => weeklyToDraft(weekly));
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const payload =
          kind === "temporary"
            ? {
                kind,
                startDate,
                endDate,
                closed,
                periods: closed ? undefined : (fromDraft(periods) ?? undefined),
                note,
              }
            : { kind, weekly: draftToWeekly(week) ?? undefined, note };
        if (
          (kind === "temporary" && !closed && !payload.periods) ||
          (kind === "permanent" && !("weekly" in payload && payload.weekly))
        ) {
          toast.error(tc("invalid"));
          return;
        }
        start(async () => {
          const res = await createSubmission({
            type: "hours_change",
            restaurantId,
            images,
            payload,
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("done"));
          onDone();
        });
      }}
    >
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "temporary", label: t("temporary") },
          { value: "permanent", label: t("permanent") },
        ]}
      />
      <p className="-mt-2 text-[12px] text-muted-foreground">
        {kind === "temporary" ? t("temporaryHint") : t("permanentHint")}
      </p>

      {kind === "temporary" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("from")}>
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label={t("to")}>
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>
          <Toggle
            checked={closed}
            onChange={setClosed}
            label={t("closedAllDay")}
          />
          {!closed && (
            <div>
              <p className="mb-2 text-[13px] font-semibold">
                {t("specialHours")}
              </p>
              <PeriodsEditor value={periods} onChange={setPeriods} />
            </div>
          )}
        </div>
      ) : (
        <WeeklyEditor value={week} onChange={setWeek} />
      )}

      <Field label={t("note")}>
        {(id) => (
          <TextArea
            id={id}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            maxLength={500}
          />
        )}
      </Field>
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold">{t("evidence")}</p>
        <p className="text-[12px] text-muted-foreground">{t("evidenceHint")}</p>
        <ImagePicker
          value={images}
          onChange={setImages}
          max={3}
          onBusyChange={setUploading}
        />
      </div>
      <PrimaryButton pending={pending} disabled={uploading}>
        {t("submit")}
      </PrimaryButton>
    </form>
  );
}

/* ───────── Info correction ───────── */

type InfoField = "name" | "location" | "price" | "tags" | "other";

export function InfoForm({
  restaurantId,
  onDone,
}: {
  restaurantId: number;
  onDone: Done;
}) {
  const t = useTranslations("infoForm");
  const onError = useActionError();
  const [field, setField] = useState<InfoField>("location");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createSubmission({
            type: "info_correction",
            restaurantId,
            images,
            payload: { field, value, note },
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("done"));
          onDone();
        });
      }}
    >
      <div className="space-y-2">
        <p className="text-[13px] font-semibold">{t("field")}</p>
        <Segmented
          value={field}
          onChange={setField}
          options={(
            ["name", "location", "price", "tags", "other"] as const
          ).map((f) => ({
            value: f,
            label: t(`fields.${f}`),
          }))}
        />
      </div>
      <Field label={t("value")}>
        {(id) => (
          <TextInput
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={500}
          />
        )}
      </Field>
      <Field label={t("note")}>
        {(id) => (
          <TextArea
            id={id}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        )}
      </Field>
      <ImagePicker
        value={images}
        onChange={setImages}
        max={3}
        onBusyChange={setUploading}
      />
      <PrimaryButton pending={pending} disabled={!value.trim() || uploading}>
        {t("submit")}
      </PrimaryButton>
    </form>
  );
}

/* ───────── Report ───────── */

type Reason = "spam" | "offensive" | "wrong" | "other";

export function ReportForm({
  targetType,
  targetId,
  onDone,
}: {
  targetType: "review" | "reply" | "menu";
  targetId: number;
  onDone: Done;
}) {
  const t = useTranslations("report");
  const onError = useActionError();
  const [reason, setReason] = useState<Reason>("spam");
  const [detail, setDetail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createReport({
            targetType,
            targetId,
            reason: detail ? `${reason}: ${detail}` : reason,
          });
          if (!res.ok) return onError(res.error);
          toast.success(t("done"));
          onDone();
        });
      }}
    >
      <Segmented
        value={reason}
        onChange={setReason}
        options={(["spam", "offensive", "wrong", "other"] as const).map(
          (r) => ({
            value: r,
            label: t(`reasons.${r}`),
          }),
        )}
      />
      <Field label={t("detail")}>
        {(id) => (
          <TextArea
            id={id}
            rows={2}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={400}
          />
        )}
      </Field>
      <PrimaryButton pending={pending}>{t("submit")}</PrimaryButton>
    </form>
  );
}
