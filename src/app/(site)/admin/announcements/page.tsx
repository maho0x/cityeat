import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { getAnnouncements } from "@/lib/admin-queries";

export default async function AdminAnnouncementsPage() {
  const rows = await getAnnouncements();
  return <AnnouncementManager announcements={rows} />;
}
