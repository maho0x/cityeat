import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MeView } from "@/components/site/me-view";
import { getMyPage } from "@/lib/queries";
import { getViewer } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("me");
  return { title: t("title") };
}

export default async function MePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/me");
  const locale = await getLocale();
  const data = await getMyPage(viewer.id, locale);
  return (
    <MeView name={viewer.name} email={viewer.email} locale={locale} {...data} />
  );
}
