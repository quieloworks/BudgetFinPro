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
  "credits",
  "credit_cards",
  "recurring",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

/** Migra orden guardado (p. ej. sin tarjeta de créditos) al set actual. */
export function normalizeDashboardWidgetOrder(
  parsed: unknown,
): DashboardWidgetId[] | null {
  const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
  if (!Array.isArray(parsed)) return null;
  const seq = parsed.filter(
    (id): id is string => typeof id === "string" && allowed.has(id),
  );
  const seen = new Set<string>();
  const deduped = seq.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  let next = [...deduped];
  if (!next.includes("credits")) {
    const gi = next.indexOf("goals");
    if (gi >= 0) next.splice(gi + 1, 0, "credits");
    else next.push("credits");
  }
  if (!next.includes("credit_cards")) {
    const ci = next.indexOf("credits");
    if (ci >= 0) next.splice(ci + 1, 0, "credit_cards");
    else next.push("credit_cards");
  }
  for (const id of DASHBOARD_WIDGET_IDS) {
    if (!next.includes(id)) return null;
  }
  if (next.length !== DASHBOARD_WIDGET_IDS.length) return null;
  return next as DashboardWidgetId[];
}
