"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AdminTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const tabs = [
    ["/admin", t("submissions")],
    ["/admin/reports", t("reports")],
    ["/admin/restaurants", t("restaurants")],
    ["/admin/overrides", t("overrides")],
    ["/admin/announcements", t("announcements")],
  ] as const;
  return (
    <nav className="scrollbar-none -mx-4 flex gap-5 overflow-x-auto border-b px-4 text-[14px]">
      {tabs.map(([href, label]) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent pb-2.5 font-medium text-muted-foreground",
              active && "border-brand text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
