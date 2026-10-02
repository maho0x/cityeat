"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { resolveReport, setUserBanned } from "@/actions/admin";
import { useActionError } from "@/components/forms/use-action-error";

export function ReportCard({
  report: r,
}: {
  report: {
    id: number;
    targetType: "review" | "reply" | "menu";
    reason: string;
    reporter: string | null;
    createdAt: Date;
    text: string | null;
    images: string[];
    authorId: string | null;
  };
}) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const onError = useActionError();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: unknown }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) onError(res.error as "SERVER");
    });

  return (
    <li className="rounded-2xl border bg-card p-5 text-[14px]">
      <p className="flex flex-wrap justify-between gap-2">
        <span className="font-bold">
          {r.targetType} #{r.id}：{r.reason}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {r.reporter}，{format.relativeTime(new Date(r.createdAt))}
        </span>
      </p>
      <blockquote className="mt-3 rounded-lg bg-muted px-3 py-2 whitespace-pre-line">
        {r.text === null ? "(deleted)" : r.text || "—"}
      </blockquote>
      {r.images.length > 0 && (
        <div className="mt-2 flex gap-2">
          {r.images.map((id) => (
            // biome-ignore lint/performance/noImgElement: already-optimised uploads
            <img
              key={id}
              src={`/uploads/${id}_t.webp`}
              alt=""
              className="size-16 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => resolveReport({ id: r.id, removeContent: false }))
          }
          className="h-9 rounded-full border px-4 font-medium"
        >
          {t("dismiss")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => resolveReport({ id: r.id, removeContent: true }))
          }
          className="h-9 rounded-full bg-brand px-4 font-bold text-brand-foreground"
        >
          {t("removeContent")}
        </button>
        {r.authorId && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirm(`${t("ban")}?`) &&
              run(() =>
                setUserBanned({ userId: r.authorId as string, banned: true }),
              )
            }
            className="ml-auto h-9 rounded-full border border-destructive/40 px-4 font-medium text-destructive"
          >
            {t("ban")}
          </button>
        )}
      </div>
    </li>
  );
}
