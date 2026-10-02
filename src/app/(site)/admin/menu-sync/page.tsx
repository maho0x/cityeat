import { MenuSyncManager } from "@/components/admin/menu-sync-manager";
import { getAdminRestaurants, getMenuSources } from "@/lib/admin-queries";

export default async function AdminMenuSyncPage() {
  const [sources, restaurants] = await Promise.all([
    getMenuSources(),
    getAdminRestaurants(),
  ]);
  return (
    <MenuSyncManager
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.nameZh }))}
      sources={sources.map(({ source: s, restaurantName }) => ({
        id: s.id,
        restaurantName,
        storeName: s.storeNameZh,
        platform: s.platform,
        storeId: s.storeId,
        url: s.url,
        enabled: s.enabled,
        lastSyncedAt: s.lastSyncedAt,
        lastError: s.lastError,
        itemCount: s.itemCount,
      }))}
    />
  );
}
