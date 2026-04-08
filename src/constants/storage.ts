export const THEME_STORAGE_KEY = "finpro_theme";
export const LANGUAGE_STORAGE_KEY = "finpro_lang";
export const FINPRO_STORAGE_KEY = "finpro_v6";
export const DASHBOARD_WIDGET_ORDER_KEY = "finpro_dashboard_widget_order";

/** Orden por defecto de tarjetas en Home (excluye el hero de balance total). */
export const DASHBOARD_WIDGET_IDS = [
  "accounts",
  "trend",
  "budget",
  "goals",
  "recurring",
] as const;
