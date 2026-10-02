import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAdminRestaurants } from "@/lib/admin-queries";

export default async function AdminRestaurantsPage() {
  const t = await getTranslations("admin");
  const rows = await getAdminRestaurants();
  return (
    <div>
      <Link
        href="/admin/restaurants/new"
        className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[14px] font-bold text-brand-foreground"
      >
        {t("newRestaurant")}
      </Link>
      <ul className="mt-6 divide-y">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/restaurants/${r.id}`}
              className="flex items-center justify-between gap-3 py-3 hover:text-brand"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {r.nameZh}{" "}
                  <span className="font-normal text-muted-foreground">
                    {r.nameEn}
                  </span>
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {r.area}
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5 text-[12px]">
                {r.unverified && (
                  <span className="rounded-full bg-soon-soft px-2 py-0.5 text-soon">
                    {t("unverified")}
                  </span>
                )}
                {!r.isActive && (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    ✕ {t("active")}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
