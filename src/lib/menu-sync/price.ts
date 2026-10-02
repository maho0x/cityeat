/** Items under $20 are drinks, desserts, toppings and add-ons, not a meal. */
const MEAL_MIN_CENTS = 2000;
const MIN_MEALS = 5;

function percentile(sorted: number[], p: number) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

const toFive = (cents: number) => Math.round(cents / 500) * 5;

/**
 * "Price per person" in whole HKD from a menu's prices (cents): the 10th–90th
 * percentile of meal-priced items, rounded to $5. Null when the menu has too
 * few meals to tell.
 */
export function menuPriceRange(prices: number[]): [number, number] | null {
  const meals = prices.filter((p) => p >= MEAL_MIN_CENTS).sort((a, b) => a - b);
  if (meals.length < MIN_MEALS) return null;
  return [toFive(percentile(meals, 0.1)), toFive(percentile(meals, 0.9))];
}
