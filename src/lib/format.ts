export function formatPrice(min: number | null, max: number | null) {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `$${min}–${max}`;
  return `$${min ?? max}`;
}

export function formatRating(r: number | null) {
  return r === null ? null : r.toFixed(1);
}
