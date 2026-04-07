import { MN } from "../constants/calendar";

export const todayStr = () => new Date().toISOString().slice(0, 10);

/** Fecha local medianoche para evitar desfaces UTC al editar YYYY-MM-DD. */
export const parseLocalYmd = (ymd: string): Date => {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!p) return new Date();
  const y = Number(p[1]);
  const m = Number(p[2]) - 1;
  const d = Number(p[3]);
  return new Date(y, m, d, 12, 0, 0, 0);
};

export const formatLocalYmd = (dt: Date): string => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Meses consecutivos para gráficos de balance (izquierda = más antiguo).
 * `count`: p. ej. 4 → cuatro meses hasta el mes calendario actual.
 */
export function rollingChartMonthBuckets(
  count: number,
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const d = new Date();
    d.setDate(12);
    d.setMonth(d.getMonth() - back);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    out.push({
      key,
      label: `${MN[m]} ${String(y).slice(-2)}`,
    });
  }
  return out;
}
