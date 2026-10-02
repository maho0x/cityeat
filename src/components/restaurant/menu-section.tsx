"use client";

import { Check, Flag, MoreHorizontal, Trash2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMenu, voteMenu } from "@/actions/content";
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
import type { MenuEntry } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useLightbox } from "./lightbox";

export function MenuSection({
  menus,
  onUpload,
}: {
  menus: MenuEntry[];
  onUpload: () => void;
}) {
  const t = useTranslations("restaurant");
  const [showAll, setShowAll] = useState(false);
  const lightbox = useLightbox();
  const visible = showAll ? menus : menus.slice(0, 2);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[22px] font-black">{t("menu")}</h2>
        {menus.length > 0 && (
          <button
            type="button"
            onClick={onUpload}
            className="text-[14px] font-medium text-brand hover:underline"
          >
            {t("uploadMenu")}
          </button>
        )}
      </div>
      {menus.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
          <p className="text-muted-foreground">{t("noMenu")}</p>
          <button
            type="button"
            onClick={onUpload}
            className="mt-4 h-10 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background"
          >
            {t("uploadFirstMenu")}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {visible.map((m) => (
            <MenuCard
              key={m.id}
              menu={m}
              onOpen={(i) => lightbox.open(m.images, i)}
            />
          ))}
          {menus.length > 2 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-[14px] font-medium text-muted-foreground hover:text-foreground"
            >
              {t("menu")} +{menus.length - 2}
            </button>
          )}
        </div>
      )}
      {lightbox.element}
    </section>
  );
}

function MenuCard({
  menu: m,
  onOpen,
}: {
  menu: MenuEntry;
  onOpen: (i: number) => void;
}) {
  const t = useTranslations("restaurant");
  const tm = useTranslations("menuForm");
  const tr = useTranslations("report");
  const format = useFormatter();
  const viewer = useViewer();
  const requireSignIn = useRequireSignIn();
  const onError = useActionError();
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const date = format.dateTime(new Date(m.createdAt), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const vote = (accurate: boolean) => {
    if (!requireSignIn()) return;
    start(async () => {
      const res = await voteMenu({
        menuId: m.id,
        accurate: m.myVote === accurate ? null : accurate,
      });
      if (!res.ok) onError(res.error);
    });
  };

  return (
    <div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {m.images.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(i)}
            className="shrink-0 snap-start overflow-hidden rounded-xl bg-muted"
          >
            {/* biome-ignore lint/performance/noImgElement: already-optimised uploads */}
            <img
              src={`/uploads/${id}_t.webp`}
              alt=""
              loading="lazy"
              className="h-52 w-auto max-w-none object-cover md:h-60"
            />
          </button>
        ))}
      </div>
      {m.note && <p className="mt-3 text-[14px]">{m.note}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span className="mr-auto">
          {m.uploader
            ? t("menuUploaded", { date, name: m.uploader })
            : t("menuAnon", { date })}
        </span>
        <VoteButton
          active={m.myVote === true}
          disabled={pending}
          onClick={() => vote(true)}
          icon={Check}
          label={t("accurate")}
          count={m.accurate}
        />
        <VoteButton
          active={m.myVote === false}
          disabled={pending}
          onClick={() => vote(false)}
          icon={X}
          label={t("outdated")}
          count={m.inaccurate}
        />
        {viewer && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("report")}
              className="grid size-8 place-items-center rounded-full hover:bg-muted"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(m.mine || viewer.isAdmin) && (
                <DropdownMenuItem
                  onClick={() =>
                    start(async () => {
                      const res = await deleteMenu({ id: m.id });
                      if (!res.ok) onError(res.error);
                      else toast.success(tm("deleted"));
                    })
                  }
                >
                  <Trash2 className="size-4" />
                  {t("delete")}
                </DropdownMenuItem>
              )}
              {!m.mine && (
                <DropdownMenuItem onClick={() => setReporting(true)}>
                  <Flag className="size-4" />
                  {t("report")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Sheet open={reporting} onOpenChange={setReporting} title={tr("title")}>
        <ReportForm
          targetType="menu"
          targetId={m.id}
          onDone={() => setReporting(false)}
        />
      </Sheet>
    </div>
  );
}

function VoteButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
