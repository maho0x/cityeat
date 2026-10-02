import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-[64px] font-black text-brand">404</p>
        <p className="mt-2 text-[17px]">{t("notFound")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-6 font-semibold text-background"
        >
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}
