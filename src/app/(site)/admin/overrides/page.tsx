import { OverrideManager } from "@/components/admin/override-manager";
import { getAdminRestaurants, getUpcomingOverrides } from "@/lib/admin-queries";

export default async function AdminOverridesPage() {
  const [overrides, restaurants] = await Promise.all([
    getUpcomingOverrides(),
    getAdminRestaurants(),
  ]);
  return (
    <OverrideManager
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.nameZh }))}
      overrides={overrides.map(({ o, restaurantName }) => ({
        id: o.id,
        restaurantName,
        startDate: o.startDate,
        endDate: o.endDate,
        closed: o.closed,
        periods: o.periods,
        note: o.note,
      }))}
    />
  );
}
