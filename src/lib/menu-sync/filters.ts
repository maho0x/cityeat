const PACKAGING = /餐盒|餐具|紙杯|膠袋|外賣盒|container|cutlery|plastic bag/i;

/**
 * Takeaway boxes, cutlery, cups and bags are sold as items but aren't food.
 * The price cap keeps real dishes such as 紙杯蛋糕 (cupcakes).
 */
export function isPackaging(name: string, priceCents: number) {
  return priceCents <= 500 && PACKAGING.test(name);
}
