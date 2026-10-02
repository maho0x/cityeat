"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createOverride, deleteOverride } from "@/actions/admin";
import {
  Field,
  inputClass,
  PrimaryButton,
  TextInput,
  Toggle,
} from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";
import type { Period } from "@/db/schema";
import { formatMinutes, parseTime } from "@/lib/hours";

type Row = {
  id: number;
  restaurantName: string | null;
  startDate: string;
  endDate: string;
  closed: boolean;
  periods: Period[] | null;
  note: string;
};

const today = () =>
  new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

export function OverrideManager({
  restaurants,
  overrides,
}: {
  restaurants: { id: number; name: string }[];
  overrides: Row[];
}) {
  const t = useTranslations("admin");
  const th = useTranslations("hoursForm");
  const tc = useTranslations("common");
  const onError = useActionError();
  const [scope, setScope] = useState("campus");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [closed, setClosed] = useState(true);
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("17:00");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_360px]">
      <section>
        {overrides.length === 0 ? (
          <p className="text-muted-foreground">{t("noOverrides")}</p>
        ) : (
          <ul className="divide-y">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="flex items-start justify-between gap-3 py-3 text-[14px]"
              >
                <div>
                  <p className="font-semibold">
                    {o.restaurantName ?? t("campusWide")}
                  </p>
                  <p className="tabular-nums text-muted-foreground">
                    {o.startDate} → {o.endDate}：
                    {o.closed
                      ? th("closedAllDay")
                      : (o.periods ?? [])
                          .map(
                            (p) =>
                              `${formatMinutes(p.opens)}–${formatMinutes(p.closes)}`,
                          )
                          .join(", ")}
                  </p>
                  {o.note && <p>{o.note}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() =>
                    start(async () => {
                      const res = await deleteOverride({ id: o.id });
                      if (!res.ok) onError(res.error);
                    })
                  }
                  className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        className="space-y-4 rounded-2xl bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const o = parseTime(opens);
          let c = parseTime(closes);
          if (!closed && (o === null || c === null))
            return toast.error(tc("invalid"));
          if (!closed && c !== null && o !== null && c <= o) c += 1440;
          start(async () => {
            const res = await createOverride({
              restaurantId: scope === "campus" ? null : Number(scope),
              startDate,
              endDate,
              closed,
              periods: closed
                ? null
                : [{ opens: o as number, closes: c as number }],
              note,
            });
            if (!res.ok) return onError(res.error);
            toast.success(t("saved"));
            setNote("");
          });
        }}
      >
        <h2 className="font-bold">{t("addOverride")}</h2>
        <p className="text-[12px] text-muted-foreground">{t("closeAllHint")}</p>
        <Field label={t("overrideScope")}>
          {(id) => (
            <select
              id={id}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={`${inputClass} h-11`}
            >
              <option value="campus">{t("campusWide")}</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={th("from")}>
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
          </Field>
          <Field label={th("to")}>
            {(id) => (
              <TextInput
                id={id}
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Toggle
          checked={closed}
          onChange={setClosed}
          label={th("closedAllDay")}
        />
        {!closed && (
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              type="time"
              value={opens}
              onChange={(e) => setOpens(e.target.value)}
              aria-label={th("from")}
            />
            <TextInput
              type="time"
              value={closes}
              onChange={(e) => setCloses(e.target.value)}
              aria-label={th("to")}
            />
          </div>
        )}
        <Field label={th("note")}>
          {(id) => (
            <TextInput
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="八號風球 / Typhoon Signal No. 8"
            />
          )}
        </Field>
        <PrimaryButton pending={pending}>{t("publish")}</PrimaryButton>
      </form>
    </div>
  );
}
