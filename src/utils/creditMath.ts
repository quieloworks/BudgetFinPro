import { parseLocalYmd, todayStr } from "./dates";
import type { FreqKey } from "../constants/frequencies";

export type CreditDirection = "given" | "received";
export type CreditKind = "cash" | "inkind";

export type CreditRow = {
  id: number;
  direction: CreditDirection;
  kind: CreditKind;
  name: string;
  principal: number;
  account: string;
  startDate: string;
  endDate: string | null;
  installmentFreq: "" | FreqKey;
  installmentAmount: number | null;
  color: string;
};

export function daysBetweenYmd(startYmd: string, endYmd: string): number {
  const a = parseLocalYmd(startYmd);
  const b = parseLocalYmd(endYmd);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function monthsBetweenYmd(startYmd: string, endYmd: string): number {
  const s = parseLocalYmd(startYmd);
  const e = parseLocalYmd(endYmd);
  let m =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Periodos de pago completos transcurridos desde inicio hasta `asOf` (inclusive del período en curso según freq). */
export function installmentPeriodsElapsed(
  startYmd: string,
  freq: FreqKey | "",
  asOfYmd: string,
): number {
  if (!freq) return 0;
  const d = daysBetweenYmd(startYmd, asOfYmd);
  switch (freq) {
    case "daily":
      return d;
    case "weekly":
      return Math.floor(d / 7);
    case "biweekly":
      return Math.floor(d / 14);
    case "monthly":
      return monthsBetweenYmd(startYmd, asOfYmd);
    case "yearly":
      return Math.floor(monthsBetweenYmd(startYmd, asOfYmd) / 12);
    default:
      return 0;
  }
}

export function sumCreditPayments(
  txs: { creditId?: number | null; creditPart?: string | null; amount?: number }[],
  creditId: number,
): number {
  return txs
    .filter(
      (t) =>
        t.creditId === creditId &&
        String(t.creditPart || "") === "payment",
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

/** Pagos al crédito con fecha ≤ asOf (inclusive). */
export function sumCreditPaymentsAsOf(
  txs: {
    date?: string;
    creditId?: number | null;
    creditPart?: string | null;
    amount?: number;
  }[],
  creditId: number,
  asOfYmd: string,
): number {
  return txs
    .filter(
      (t) =>
        (t.date || "") <= asOfYmd &&
        t.creditId === creditId &&
        String(t.creditPart || "") === "payment",
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

/** Lo que el calendario de cuotas “espera” acumulado hasta hoy (tope: principal). */
export function expectedPaidBySchedule(
  credit: CreditRow,
  asOfYmd: string = todayStr(),
): number {
  if (
    !credit.installmentFreq ||
    credit.installmentAmount == null ||
    Number.isNaN(credit.installmentAmount) ||
    credit.installmentAmount <= 0
  ) {
    return 0;
  }
  const n = installmentPeriodsElapsed(
    credit.startDate,
    credit.installmentFreq,
    asOfYmd,
  );
  return Math.min(
    credit.principal,
    n * credit.installmentAmount,
  );
}

export function creditRemaining(credit: CreditRow, paid: number): number {
  return Math.max(0, credit.principal - paid);
}

export function creditProgressPct(credit: CreditRow, paid: number): number {
  if (credit.principal <= 0) return 100;
  return Math.min(100, (paid / credit.principal) * 100);
}

/** Diferencia: pagado real − esperado por calendario (positivo = por encima del plan). */
export function creditScheduleDiff(
  credit: CreditRow,
  paid: number,
  asOfYmd?: string,
): number {
  const exp = expectedPaidBySchedule(credit, asOfYmd ?? todayStr());
  if (exp <= 0 && !credit.installmentFreq) return 0;
  return paid - exp;
}
