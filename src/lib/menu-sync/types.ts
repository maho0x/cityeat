/** One dish as mirrored from an ordering platform. `price` is in HKD cents. */
export type MenuItemInput = {
  externalId: string;
  categoryZh: string;
  categoryEn: string;
  nameZh: string;
  nameEn: string;
  price: number;
  imageUrl: string | null;
  available: boolean;
  sort: number;
};

export type ParsedMenu = {
  storeName: { zh: string; en: string };
  items: MenuItemInput[];
};
