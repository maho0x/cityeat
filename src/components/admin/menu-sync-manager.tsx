"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addMenuSource,
  deleteMenuSource,
  setMenuSourceEnabled,
  syncMenuSource,
} from "@/actions/admin";
import {
  Field,
  inputClass,
  PrimaryButton,
  TextInput,
} from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  restaurantName: string;
  storeName: string;
  platform: string;
  storeId: string;
  url: string;
  enabled: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
  itemCount: number;
};

type SyncResult = { ok: true; items: number } | { ok: false; error: string };

export function MenuSyncManager({
  restaurants,
  sources,
}: {
  restaurants: { id: number; name: string }[];
  sources: Row[];
}) {
  const t = useTranslations("admin");
  const onError = useActionError();
  const [restaurantId, setRestaurantId] = useState(
    String(restaurants[0]?.id ?? ""),
  );
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();

  const report = (r: SyncResult) =>
    r.ok
      ? toast.success(t("synced", { count: r.items }))
      : toast.error(t("syncFailed", { error: r.error }));

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_360px]">
      <section>
        <p className="mb-4 text-[14px] text-muted-foreground">
          {t("menuSyncHint")}
        </p>
        {sources.length === 0 ? (
          <p className="text-muted-foreground">{t("noMenuSources")}</p>
        ) : (
          <ul className="divide-y">
            {sources.map((s) => (
              <SourceRow key={s.id} source={s} onResult={report} />
            ))}
          </ul>
        )}
      </section>

      <form
        className="space-y-4 rounded-2xl bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addMenuSource({
              restaurantId: Number(restaurantId),
              url,
            });
            if (!res.ok) return onError(res.error);
            report(res.data);
            setUrl("");
          });
        }}
      >
        <h2 className="font-bold">{t("addMenuSource")}</h2>
        <Field label={t("restaurant")}>
          {(id) => (
            <select
              id={id}
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className={`${inputClass} h-11`}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t("orderUrl")}>
          {(id) => (
            <TextInput
              id={id}
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://csd.order.place/home/store/…"
            />
          )}
        </Field>
        <p className="text-[12px] text-muted-foreground">{t("orderUrlHint")}</p>
        <PrimaryButton pending={pending}>{t("addMenuSource")}</PrimaryButton>
      </form>
    </div>
  );
}

function SourceRow({
  source: s,
  onResult,
}: {
  source: Row;
  onResult: (r: SyncResult) => void;
}) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const onError = useActionError();
  const [pending, start] = useTransition();

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 py-3 text-[14px]",
        !s.enabled && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold">
          {s.restaurantName}
          {s.storeName && ` · ${s.storeName}`}
        </p>
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-muted-foreground hover:underline"
        >
          {s.platform} #{s.storeId}
        </a>
        <p className="text-muted-foreground">
          {!s.enabled
            ? t("disabled")
            : s.lastSyncedAt
              ? t("lastSynced", {
                  time: format.relativeTime(new Date(s.lastSyncedAt)),
                  count: s.itemCount,
                })
              : t("neverSynced")}
        </p>
        {s.lastError && (
          <p className="break-words text-destructive">
            {t("syncFailed", { error: s.lastError })}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setMenuSourceEnabled({
                id: s.id,
                enabled: !s.enabled,
              });
              if (!res.ok) onError(res.error);
            })
          }
          className="h-9 rounded-full px-3 font-medium hover:bg-muted"
        >
          {s.enabled ? t("disable") : t("enable")}
        </button>
        <button
          type="button"
          aria-label={t("syncNow")}
          title={t("syncNow")}
          disabled={pending || !s.enabled}
          onClick={() =>
            start(async () => {
              const res = await syncMenuSource({ id: s.id });
              if (!res.ok) onError(res.error);
              else onResult(res.data);
            })
          }
          className="grid size-9 place-items-center rounded-full hover:bg-muted disabled:opacity-40"
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteMenuSource({ id: s.id });
              if (!res.ok) onError(res.error);
            })
          }
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
