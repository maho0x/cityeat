import { getTranslations } from "next-intl/server";
import { ReportCard } from "@/components/admin/report-card";
import { getOpenReports } from "@/lib/admin-queries";

export default async function AdminReportsPage() {
  const t = await getTranslations("admin");
  const reports = await getOpenReports();
  if (reports.length === 0)
    return (
      <p className="py-10 text-center text-muted-foreground">
        {t("noReports")}
      </p>
    );
  return (
    <ul className="space-y-4">
      {reports.map((r) => (
        <ReportCard
          key={r.id}
          report={{
            id: r.id,
            targetType: r.targetType,
            reason: r.reason,
            reporter: r.reporter,
            createdAt: r.createdAt,
            text: r.target?.text ?? null,
            images: r.target?.images ?? [],
            authorId: r.target?.userId ?? null,
          }}
        />
      ))}
    </ul>
  );
}
