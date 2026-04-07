import { formatLocalYmd, todayStr } from "./dates";

type GoalRow = { id: number; saved: number };
type TxRow = {
  type: string;
  date: string;
  amount: number;
  transferToGoalId?: number | null;
  transferFromGoalId?: number | null;
};

/**
 * Suma del ahorrado en todas las metas, tal como estaba al cierre de `asOfDate`
 * (rebobina transferencias a/desde metas con fecha posterior).
 */
export function totalGoalSavedAsOfDate(
  goals: GoalRow[],
  txs: TxRow[],
  asOfDate: string,
): number {
  if (!goals.length) return 0;
  const byId = new Map<number, number>();
  for (const g of goals) {
    byId.set(g.id, g.saved);
  }
  for (const t of txs) {
    if (t.type !== "transfer") continue;
    if (t.date <= asOfDate) continue;
    const amt = t.amount;
    const toId = t.transferToGoalId;
    const fromId = t.transferFromGoalId;
    if (toId != null && byId.has(toId)) {
      byId.set(toId, (byId.get(toId) ?? 0) - amt);
    }
    if (fromId != null && byId.has(fromId)) {
      byId.set(fromId, (byId.get(fromId) ?? 0) + amt);
    }
  }
  let sum = 0;
  for (const g of goals) {
    sum += Math.max(0, byId.get(g.id) ?? 0);
  }
  return sum;
}

/** Último día del mes calendario `YYYY-MM`, sin pasar de hoy. */
export function chartMonthEndDate(monthKey: string): string {
  const [Y, M] = monthKey.split("-").map(Number);
  const last = formatLocalYmd(new Date(Y, M, 0));
  const t = todayStr();
  return last < t ? last : t;
}

/** Fecha de cierre del periodo seleccionado en el reporte (≤ hoy). */
export function reportAsOfEndDate(
  tf: string,
  custom: { from: string; to: string } | null | undefined,
): string {
  const today = todayStr();
  const now = new Date();
  const y = now.getFullYear();
  const m1 = now.getMonth() + 1;

  if (tf === "custom" && custom?.to) {
    return custom.to < today ? custom.to : today;
  }
  if (tf === "all") return today;
  if (tf === "day" || tf === "week") return today;
  if (tf === "month") {
    const last = formatLocalYmd(new Date(y, m1, 0));
    return last < today ? last : today;
  }
  if (tf === "quarter") {
    const qEndMonth = Math.floor((m1 - 1) / 3) * 3 + 3;
    const last = formatLocalYmd(new Date(y, qEndMonth, 0));
    return last < today ? last : today;
  }
  if (tf === "semester") {
    const moHigh = m1 <= 6 ? 6 : 12;
    const last = formatLocalYmd(new Date(y, moHigh, 0));
    return last < today ? last : today;
  }
  if (tf === "year") {
    const last = formatLocalYmd(new Date(y, 12, 0));
    return last < today ? last : today;
  }
  return today;
}
