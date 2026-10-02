/** A dish from a synced ordering menu, as sent to the browser. Price in cents. */
export type Dish = {
  restaurantId: number;
  name: string;
  altName: string;
  price: number;
  available: boolean;
};

export type SearchQuery = { text: string; maxPrice: number | null };

/**
 * Budget forms: "$40", "40以下", "50蚊以內", "under 30", "<45". A bare number
 * is left as text so building codes like "AC3" still work.
 */
const BUDGET = [
  /\$\s*(\d{1,4})/,
  /(\d{1,4})\s*蚊?\s*(?:以下|以內|or less)/,
  /(?:under|below|<)\s*\$?\s*(\d{1,4})/,
];

/** Variant characters menus use interchangeably (咖喱/咖哩, 麪/麵). */
const VARIANTS: [RegExp, string][] = [
  [/喱/g, "哩"],
  [/麪/g, "麵"],
];

function normalize(s: string) {
  let out = s.toLowerCase();
  for (const [re, to] of VARIANTS) out = out.replace(re, to);
  return out;
}

export function parseSearch(raw: string): SearchQuery {
  let text = normalize(raw.trim());
  let maxPrice: number | null = null;
  for (const re of BUDGET) {
    const m = text.match(re);
    if (m) {
      maxPrice = Number(m[1]);
      text = text.replace(m[0], " ");
      break;
    }
  }
  return { text: text.replace(/\s+/g, " ").trim(), maxPrice };
}

const withinBudget = (d: Dish, q: SearchQuery) =>
  q.maxPrice === null || d.price <= q.maxPrice * 100;

export function dishMatches(d: Dish, q: SearchQuery) {
  if (!q.text && q.maxPrice === null) return false;
  if (!withinBudget(d, q)) return false;
  return (
    !q.text ||
    normalize(d.name).includes(q.text) ||
    normalize(d.altName).includes(q.text)
  );
}

/**
 * A restaurant matches when its own text matches and it fits the budget, or
 * when one of its dishes matches. Without a synced menu, the budget is checked
 * against its lowest price per person.
 */
export function matchesRestaurant(
  r: { haystack: string; priceMin: number | null },
  dishes: Dish[],
  q: SearchQuery,
) {
  if (!q.text && q.maxPrice === null) return true;
  if (dishes.some((d) => dishMatches(d, q))) return true;
  const textOk = !q.text || normalize(r.haystack).includes(q.text);
  const budgetOk =
    q.maxPrice === null ||
    (dishes.length
      ? dishes.some((d) => withinBudget(d, q))
      : r.priceMin !== null && r.priceMin <= q.maxPrice);
  return textOk && budgetOk;
}
