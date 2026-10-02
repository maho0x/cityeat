import { getTranslations } from "next-intl/server";
import { SubmissionCard } from "@/components/admin/submission-card";
import { getPendingSubmissions } from "@/lib/admin-queries";

export default async function AdminSubmissionsPage() {
  const t = await getTranslations("admin");
  const rows = await getPendingSubmissions();
  if (rows.length === 0)
    return (
      <p className="py-10 text-center text-muted-foreground">
        {t("noPending")}
      </p>
    );
  return (
    <ul className="space-y-4">
      {rows.map(
        ({ s, restaurantName, restaurantSlug, userName, userEmail }) => (
          <SubmissionCard
            key={s.id}
            submission={{
              id: s.id,
              type: s.type,
              payload: s.payload,
              images: s.images,
              createdAt: s.createdAt,
              restaurantName,
              restaurantSlug,
              submitter: userName ? `${userName} <${userEmail}>` : "—",
            }}
          />
        ),
      )}
    </ul>
  );
}
