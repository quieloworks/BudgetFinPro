/** Keys for i18n `freq.*` — labels come from locales, not from this file. */
export const FREQ_KEYS = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
] as const;

export type FreqKey = (typeof FREQ_KEYS)[number];
