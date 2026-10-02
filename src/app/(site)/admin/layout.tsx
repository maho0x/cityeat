import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminTabs } from "@/components/admin/tabs";
import { getViewer } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return (
    <div>
      <AdminTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
