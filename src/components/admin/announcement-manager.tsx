"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAnnouncement, saveAnnouncement } from "@/actions/admin";
import {
  Field,
  PrimaryButton,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";

type Row = {
  id: number;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  active: boolean;
};

export function AnnouncementManager({
  announcements,
}: {
  announcements: Row[];
}) {
  const t = useTranslations("admin");
  const tr = useTranslations("restaurant");
  const onError = useActionError();
  const empty = {
    titleZh: "",
    titleEn: "",
    bodyZh: "",
    bodyEn: "",
    active: true,
  };
  const [draft, setDraft] = useState<Omit<Row, "id"> & { id?: number }>(empty);
  const [pending, start] = useTransition();
  const set = (k: keyof Row, v: string | boolean) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_380px]">
      <ul className="divide-y">
        {announcements.length === 0 && (
          <p className="text-muted-foreground">{t("noAnnouncements")}</p>
        )}
        {announcements.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-3 py-3 text-[14px]"
          >
            <div>
              <p className="font-semibold">
                {a.titleZh}
                {!a.active && (
                  <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                    (off)
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">{a.bodyZh}</p>
            </div>
            <div className="flex shrink-0 gap-3 text-[13px]">
              <button
                type="button"
                className="text-brand"
                onClick={() => setDraft(a)}
              >
                {t("edit")}
              </button>
              <button
                type="button"
                className="text-muted-foreground"
                onClick={() =>
                  start(async () => {
                    const res = await deleteAnnouncement({ id: a.id });
                    if (!res.ok) onError(res.error);
                  })
                }
              >
                {tr("delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="space-y-4 rounded-2xl bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await saveAnnouncement(draft);
            if (!res.ok) return onError(res.error);
            toast.success(t("saved"));
            setDraft(empty);
          });
        }}
      >
        <Field label={t("announcementTitleZh")}>
          {(id) => (
            <TextInput
              id={id}
              value={draft.titleZh}
              onChange={(e) => set("titleZh", e.target.value)}
              required
            />
          )}
        </Field>
        <Field label={t("announcementTitleEn")}>
          {(id) => (
            <TextInput
              id={id}
              value={draft.titleEn}
              onChange={(e) => set("titleEn", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("announcementBodyZh")}>
          {(id) => (
            <TextArea
              id={id}
              rows={3}
              value={draft.bodyZh}
              onChange={(e) => set("bodyZh", e.target.value)}
            />
          )}
        </Field>
        <Field label={t("announcementBodyEn")}>
          {(id) => (
            <TextArea
              id={id}
              rows={3}
              value={draft.bodyEn}
              onChange={(e) => set("bodyEn", e.target.value)}
            />
          )}
        </Field>
        <Toggle
          checked={draft.active}
          onChange={(v) => set("active", v)}
          label={t("active")}
        />
        <PrimaryButton pending={pending}>
          {draft.id ? t("save") : t("publish")}
        </PrimaryButton>
      </form>
    </div>
  );
}
