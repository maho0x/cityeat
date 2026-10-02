"use client";

import { Bell, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markNotificationsRead, updateName } from "@/actions/content";
import { setLocale } from "@/actions/locale";
import { Segmented } from "@/components/forms/fields";
import { useActionError } from "@/components/forms/use-action-error";
import type { NotificationData } from "@/db/schema";
import { authClient } from "@/lib/auth-client";
import type { getMyPage } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof getMyPage>>;

export function MeView({
  name,
  email,
  locale,
  favorites,
  reviews,
  submissions,
  notifications,
}: Data & { name: string; email: string; locale: string }) {
  const t = useTranslations("me");
  const ta = useTranslations("auth");
  const format = useFormatter();
  const router = useRouter();
  const onError = useActionError();
  const { theme, setTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [pending, start] = useTransition();
  const unread = notifications.filter((n) => !n.readAt).length;

  const notifText = (d: NotificationData) => {
    if (d.kind === "reply")
      return d.by ? t("notif.reply", { by: d.by }) : t("notif.replyAnon");
    if (d.kind === "submission")
      return d.status === "approved"
        ? t("notif.approved")
        : t("notif.rejected");
    return t("notif.removed");
  };

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <header className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand text-[26px] font-black text-brand-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await updateName({ name: draft });
                  if (!res.ok) return onError(res.error);
                  toast.success(t("saved"));
                  setEditing(false);
                });
              }}
            >
              <input
                // biome-ignore lint/a11y/noAutofocus: opened by an explicit tap
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={30}
                aria-label={t("name")}
                className="h-10 min-w-0 flex-1 rounded-xl border bg-card px-3 text-[16px] outline-none focus:border-foreground/40"
              />
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl bg-foreground px-4 text-[14px] font-semibold text-background"
              >
                {t("save")}
              </button>
            </form>
          ) : (
            <h1 className="flex items-baseline gap-3 text-[24px] font-black">
              <span className="truncate">{name}</span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 text-[13px] font-medium text-brand"
              >
                {t("editName")}
              </button>
            </h1>
          )}
          <p className="truncate text-[13px] text-muted-foreground">{email}</p>
        </div>
      </header>

      <Section
        icon={Bell}
        title={t("notifications")}
        action={
          unread > 0 && (
            <button
              type="button"
              className="text-[13px] font-medium text-brand"
              onClick={() =>
                start(async () => void (await markNotificationsRead({})))
              }
            >
              {t("markRead")}
            </button>
          )
        }
      >
        {notifications.length === 0 ? (
          <Empty>{t("noNotifications")}</Empty>
        ) : (
          <ul className="divide-y">
            {notifications.slice(0, 10).map((n) => {
              const body = (
                <span className="flex items-start gap-3 py-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-brand",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px]">
                      {notifText(n.data)}
                    </span>
                    {n.data.kind === "submission" && n.data.note && (
                      <span className="block text-[13px] text-muted-foreground">
                        “{n.data.note}”
                      </span>
                    )}
                    <span className="block text-[12px] text-muted-foreground">
                      {format.relativeTime(new Date(n.createdAt))}
                    </span>
                  </span>
                </span>
              );
              return (
                <li key={n.id}>
                  {n.data.kind === "reply" ? (
                    <Link href={`/r/${n.data.restaurantSlug}#reviews`}>
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section icon={Heart} title={t("favorites")}>
        {favorites.length === 0 ? (
          <Empty>{t("noFavorites")}</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <Link
                key={f.slug}
                href={`/r/${f.slug}`}
                className="rounded-full border bg-card px-4 py-2 text-[14px] font-medium hover:border-foreground/30"
              >
                {f.name}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Star} title={t("myReviews")}>
        {reviews.length === 0 ? (
          <Empty>{t("noReviews")}</Empty>
        ) : (
          <ul className="divide-y">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link href={`/r/${r.slug}#reviews`} className="block py-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-[13px] text-brand">
                      {"★".repeat(r.rating)}
                    </span>
                  </span>
                  {r.content && (
                    <span className="mt-0.5 line-clamp-2 block text-[14px] text-muted-foreground">
                      {r.content}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("submissions")}>
        {submissions.length === 0 ? (
          <Empty>{t("noSubmissions")}</Empty>
        ) : (
          <ul className="divide-y">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-3 text-[14px]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {t(`types.${s.type}`)}，
                    {format.relativeTime(new Date(s.createdAt))}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium",
                    s.status === "pending" && "bg-soon-soft text-soon",
                    s.status === "approved" && "bg-open-soft text-open",
                    s.status === "rejected" && "bg-muted text-muted-foreground",
                  )}
                >
                  {t(`status.${s.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("settings")}>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">{t("language")}</p>
            <Segmented
              value={locale}
              onChange={(v) => start(() => setLocale(v))}
              options={[
                { value: "zh-HK", label: "繁體中文" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">{t("theme")}</p>
            <Segmented
              value={theme ?? "system"}
              onChange={setTheme}
              options={[
                { value: "system", label: t("themeSystem") },
                { value: "light", label: t("themeLight") },
                { value: "dark", label: t("themeDark") },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/");
              router.refresh();
            }}
            className="h-11 w-full rounded-full border text-[15px] font-medium text-destructive hover:border-destructive/40"
          >
            {ta("signOut")}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          {Icon && <Icon className="size-4" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] text-muted-foreground">{children}</p>;
}
