"use client";

import { Dices, PencilLine, User, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useViewer } from "./viewer-context";

function useItems() {
  const t = useTranslations("nav");
  const viewer = useViewer();
  return [
    { href: "/", label: t("home"), icon: UtensilsCrossed },
    { href: "/spin", label: t("spin"), icon: Dices },
    { href: "/contribute", label: t("contribute"), icon: PencilLine },
    viewer
      ? { href: "/me", label: t("me"), icon: User }
      : { href: "/login", label: t("signIn"), icon: User },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/r/");
  return pathname.startsWith(href);
}

export function TopNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const items = useItems();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            isActive(pathname, href) &&
              "bg-foreground text-background hover:text-background",
          )}
        >
          {label}
          {href === "/me" && unread > 0 && (
            <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-brand" />
          )}
        </Link>
      ))}
    </nav>
  );
}

export function TabBar({ unread }: { unread: number }) {
  const pathname = usePathname();
  const items = useItems();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-lg md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                  active && "text-brand",
                )}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {label}
                {href === "/me" && unread > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-2 size-2 rounded-full bg-brand" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
