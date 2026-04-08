import { MN } from "../constants/calendar";

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

/** “Hoy” en calendario local (no `toISOString()` UTC). */
export const todayStr = () => formatLocalYmd(new Date());

/**
 * Normaliza tx.date (YYYY-MM-DD, ISO, mes sin cero…) a "YYYY-MM" para agrupar por mes.
 */
export function yearMonthKeyFromTxDate(dateStr: unknown): string | null {
  const raw = String(dateStr ?? "").trim();
  if (!raw) return null;
  const p = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(raw);
  if (!p) return null;
  const monthNum = Number(p[2]);
  if (monthNum < 1 || monthNum > 12) return null;
  const mo = String(monthNum).padStart(2, "0");
  return `${p[1]}-${mo}`;
}

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

/**
 * Mismos meses que rollingChartMonthBuckets, pero el primer elemento es el mes en
 * curso y el último el más antiguo (hasta `count` meses).
 */
export function rollingChartMonthBucketsNewestFirst(
  count: number,
): { key: string; label: string }[] {
  return [...rollingChartMonthBuckets(count)].reverse();
}
