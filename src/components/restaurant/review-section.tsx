"use client";

import {
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addReply,
  deleteReply,
  deleteReview,
  toggleLike,
} from "@/actions/content";
import { ReportForm } from "@/components/forms/contribution-forms";
import { Sheet } from "@/components/forms/sheet";
import { useActionError } from "@/components/forms/use-action-error";
import { useRequireSignIn, useViewer } from "@/components/site/viewer-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReviewEntry, ReviewSort } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useLightbox } from "./lightbox";

export function Stars({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      className={cn("inline-flex", className)}
      aria-label={`${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= Math.round(value)
              ? "fill-brand text-brand"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

export function ReviewSection({
  reviews,
  sort,
  summary,
  hasMine,
  onWrite,
}: {
  reviews: ReviewEntry[];
  sort: ReviewSort;
  summary: { average: number | null; distribution: number[]; count: number };
  hasMine: boolean;
  onWrite: () => void;
}) {
  const t = useTranslations("restaurant");
  const pathname = usePathname();
  const lightbox = useLightbox();
  const max = Math.max(1, ...summary.distribution);

  return (
    <section id="reviews" className="scroll-mt-20">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-[22px] font-black">{t("reviews")}</h2>
        {summary.count > 0 && (
          <button
            type="button"
            onClick={onWrite}
            className="text-[14px] font-medium text-brand hover:underline"
          >
            {hasMine ? t("editReview") : t("writeReview")}
          </button>
        )}
      </div>

      {summary.count === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
          <p className="text-muted-foreground">{t("noReviews")}</p>
          <button
            type="button"
            onClick={onWrite}
            className="mt-4 h-10 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background"
          >
            {t("writeFirstReview")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6 rounded-2xl bg-card p-5">
            <div className="text-center">
              <p className="text-[44px] leading-none font-black tabular-nums">
                {summary.average?.toFixed(1)}
              </p>
              <Stars value={summary.average ?? 0} className="mt-2" />
              <p className="mt-1 text-[12px] text-muted-foreground">
                {t("ratingCount", { count: summary.count })}
              </p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-2 text-[12px] text-muted-foreground"
                >
                  <span className="w-2 tabular-nums">{n}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{
                        width: `${(summary.distribution[n - 1] / max) * 100}%`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <nav className="scrollbar-none mt-5 flex gap-4 overflow-x-auto border-b text-[14px]">
            {(
              [
                ["recent", t("sortRecent")],
                ["top", t("sortTop")],
                ["high", t("sortHigh")],
                ["low", t("sortLow")],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={
                  key === "recent"
                    ? `${pathname}#reviews`
                    : `${pathname}?sort=${key}#reviews`
                }
                scroll={false}
                replace
                className={cn(
                  "-mb-px shrink-0 border-b-2 border-transparent pb-2 font-medium text-muted-foreground",
                  sort === key && "border-foreground text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <ul className="divide-y">
            {reviews.map((rv) => (
              <ReviewItem
                key={rv.id}
                review={rv}
                onOpenImage={(i) => lightbox.open(rv.images, i)}
              />
            ))}
          </ul>
        </>
      )}
      {lightbox.element}
    </section>
  );
}

function ReviewItem({
  review: rv,
  onOpenImage,
}: {
  review: ReviewEntry;
  onOpenImage: (i: number) => void;
}) {
  const t = useTranslations("restaurant");
  const tr = useTranslations("review");
  const trep = useTranslations("report");
  const format = useFormatter();
  const viewer = useViewer();
  const requireSignIn = useRequireSignIn();
  const onError = useActionError();
  const [liked, setLiked] = useState(rv.liked);
  const [likes, setLikes] = useState(rv.likes);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [reporting, setReporting] = useState<{
    type: "review" | "reply";
    id: number;
  } | null>(null);
  const [pending, start] = useTransition();

  const author = rv.mine ? t("you") : (rv.author ?? t("anonymous"));
  const edited =
    new Date(rv.updatedAt).getTime() - new Date(rv.createdAt).getTime() >
    60_000;

  return (
    <li className="py-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-bold",
            rv.author
              ? "bg-brand-soft text-brand"
              : "bg-muted text-muted-foreground",
          )}
        >
          {(rv.author ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold">{author}</p>
            <span className="text-[12px] text-muted-foreground">
              {format.relativeTime(new Date(rv.createdAt))}
              {edited && ` (${t("edited")})`}
            </span>
          </div>
          <Stars value={rv.rating} className="mt-0.5" />
          {rv.content && (
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">
              {rv.content}
            </p>
          )}
          {rv.images.length > 0 && (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
              {rv.images.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenImage(i)}
                  className="shrink-0"
                >
                  {/* biome-ignore lint/performance/noImgElement: already-optimised uploads */}
                  <img
                    src={`/uploads/${id}_t.webp`}
                    alt=""
                    loading="lazy"
                    className="size-24 rounded-xl object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1 text-[13px] text-muted-foreground">
            <button
              type="button"
              aria-pressed={liked}
              onClick={() => {
                if (!requireSignIn()) return;
                setLiked(!liked);
                setLikes((n) => n + (liked ? -1 : 1));
                start(async () => {
                  const res = await toggleLike({ reviewId: rv.id });
                  if (!res.ok) onError(res.error);
                });
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-2.5 hover:bg-muted",
                liked && "text-brand",
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              {likes > 0 ? likes : t("like")}
            </button>
            <button
              type="button"
              onClick={() => requireSignIn() && setReplying((v) => !v)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 hover:bg-muted"
            >
              <MessageCircle className="size-4" />
              {rv.replies.length > 0 ? rv.replies.length : t("reply")}
            </button>
            {viewer && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("report")}
                  className="ml-auto grid size-8 place-items-center rounded-full hover:bg-muted"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(rv.mine || viewer.isAdmin) && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (!confirm(tr("confirmDelete"))) return;
                        start(async () => {
                          const res = await deleteReview({ id: rv.id });
                          if (!res.ok) onError(res.error);
                          else toast.success(tr("deleted"));
                        });
                      }}
                    >
                      <Trash2 className="size-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  )}
                  {!rv.mine && (
                    <DropdownMenuItem
                      onClick={() =>
                        setReporting({ type: "review", id: rv.id })
                      }
                    >
                      <Flag className="size-4" />
                      {t("report")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {rv.replies.length > 0 && (
            <ul className="mt-2 space-y-3 border-l-2 pl-4">
              {rv.replies.map((p) => (
                <li key={p.id} className="text-[14px]">
                  <p>
                    <span className="font-semibold">
                      {p.mine ? t("you") : (p.author ?? t("anonymous"))}
                    </span>{" "}
                    <span className="text-[12px] text-muted-foreground">
                      {format.relativeTime(new Date(p.createdAt))}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-line">{p.content}</p>
                  {viewer && (
                    <div className="mt-1 flex gap-3 text-[12px] text-muted-foreground">
                      {(p.mine || viewer.isAdmin) && (
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() =>
                            start(async () => {
                              const res = await deleteReply({ id: p.id });
                              if (!res.ok) onError(res.error);
                            })
                          }
                        >
                          {t("delete")}
                        </button>
                      )}
                      {!p.mine && (
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() =>
                            setReporting({ type: "reply", id: p.id })
                          }
                        >
                          {t("report")}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {replying && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await addReply({
                    reviewId: rv.id,
                    content: reply,
                    anonymous: false,
                  });
                  if (!res.ok) return onError(res.error);
                  setReply("");
                  setReplying(false);
                });
              }}
            >
              <input
                // biome-ignore lint/a11y/noAutofocus: opened by an explicit tap on Reply
                autoFocus
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("replyPlaceholder")}
                maxLength={500}
                className="h-10 min-w-0 flex-1 rounded-full border bg-card px-4 text-[14px] outline-none focus:border-foreground/40"
              />
              <button
                type="submit"
                disabled={pending || !reply.trim()}
                className="h-10 rounded-full bg-foreground px-4 text-[14px] font-semibold text-background disabled:opacity-40"
              >
                {t("send")}
              </button>
            </form>
          )}
        </div>
      </div>
      <Sheet
        open={!!reporting}
        onOpenChange={(o) => !o && setReporting(null)}
        title={trep("title")}
      >
        {reporting && (
          <ReportForm
            targetType={reporting.type}
            targetId={reporting.id}
            onDone={() => setReporting(null)}
          />
        )}
      </Sheet>
    </li>
  );
}
