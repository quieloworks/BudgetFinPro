/**
 * Idiomas soportados. `native` = autónimo (etiqueta en el selector).
 * Para listas desplegables usar `sortedSupportedLocales()` (orden A–Z por nombre en inglés).
 */
export const SUPPORTED_LOCALES = [
  { code: "ar", enName: "Arabic", native: "العربية" },
  { code: "bn", enName: "Bengali", native: "বাংলা" },
  { code: "zh", enName: "Chinese", native: "中文" },
  { code: "en", enName: "English", native: "English" },
  { code: "fr", enName: "French", native: "Français" },
  { code: "de", enName: "German", native: "Deutsch" },
  { code: "hi", enName: "Hindi", native: "हिन्दी" },
  { code: "it", enName: "Italian", native: "Italiano" },
  { code: "ja", enName: "Japanese", native: "日本語" },
  { code: "ko", enName: "Korean", native: "한국어" },
  { code: "pt", enName: "Portuguese", native: "Português" },
  { code: "ru", enName: "Russian", native: "Русский" },
  { code: "es", enName: "Spanish", native: "Español" },
] as const;

/** Orden alfabético por nombre del idioma en inglés (A–Z). */
export function sortedSupportedLocales(): readonly (typeof SUPPORTED_LOCALES)[number][] {
  return [...SUPPORTED_LOCALES].sort((a, b) =>
    a.enName.localeCompare(b.enName, "en"),
  );
}

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

export const DEFAULT_LOCALE: AppLocale = "es";

export function isSupportedLocale(code: string | undefined | null): code is AppLocale {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}
