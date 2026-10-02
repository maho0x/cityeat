export const locales = ["zh-HK", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-HK";
export const LOCALE_COOKIE = "locale";

export function isLocale(v: unknown): v is Locale {
  return locales.includes(v as Locale);
}

/** Pick the zh or en variant of a bilingual DB field. */
export function pick<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  const zh = row[`${field}Zh`] as string | undefined;
  const en = row[`${field}En`] as string | undefined;
  return (locale === "en" ? en || zh : zh || en) ?? "";
}
