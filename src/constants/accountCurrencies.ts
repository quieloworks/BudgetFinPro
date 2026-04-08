import type { AppLocale } from "./languages";

/**
 * Monedas principales alineadas con los idiomas de la app y divisas mayoritarias.
 */
export const ACCOUNT_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "INR",
  "BRL",
  "RUB",
  "KRW",
  "SAR",
  "BDT",
  "MXN",
  "ARS",
  "CHF",
  "AUD",
  "CAD",
  "TRY",
  "PLN",
] as const;

const LOCALE_DEFAULT_CURRENCY: Record<AppLocale, string> = {
  ar: "SAR",
  bn: "BDT",
  zh: "CNY",
  en: "USD",
  fr: "EUR",
  de: "EUR",
  hi: "INR",
  it: "EUR",
  ja: "JPY",
  ko: "KRW",
  pt: "BRL",
  ru: "RUB",
  es: "EUR",
};

export function defaultCurrencyForLocale(lang: AppLocale): string {
  return LOCALE_DEFAULT_CURRENCY[lang] ?? "USD";
}
