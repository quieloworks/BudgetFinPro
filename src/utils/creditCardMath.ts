import { creditRemaining, sumCreditPaymentsAsOf, type CreditRow } from "./creditMath";

export type CreditCardKind = "bank" | "store";

export type CreditCardRow = {
  id: number;
  kind: CreditCardKind;
  name: string;
  /** Límite de crédito (línea autorizada). */
  creditLimit: number;
  /** Día de corte (1–31). */
  cutoffDay: number;
  /** Día límite de pago (1–31). */
  paymentDay: number;
  color: string;
};

export type CreditCardTxPart = "charge" | "payment";

export function creditCardBalanceAsOf(
  txs: {
    date?: string;
    creditCardId?: number | null;
    creditCardPart?: string | null;
    amount?: number;
  }[],
  cardId: number,
  asOfYmd: string,
): number {
  let bal = 0;
  for (const t of txs) {
    if ((t.date || "") > asOfYmd) continue;
    if (t.creditCardId !== cardId) continue;
    const part = String(t.creditCardPart || "");
    const amt = Number(t.amount) || 0;
    if (part === "charge") bal += amt;
    else if (part === "payment") bal -= amt;
  }
  return Math.max(0, bal);
}

export function creditCardUtilizationPct(
  balance: number,
  limit: number,
): number {
  if (limit <= 0) return balance > 0 ? 100 : 0;
  return Math.min(100, (balance / limit) * 100);
}

/** Deuda de préstamos recibidos (principal − pagos) a la fecha. */
export function totalLoanDebtAsOf(
  credits: CreditRow[],
  txs: Parameters<typeof sumCreditPaymentsAsOf>[0],
  asOfYmd: string,
): number {
  let s = 0;
  for (const c of credits) {
    if (c.direction !== "received") continue;
    const paid = sumCreditPaymentsAsOf(txs, c.id, asOfYmd);
    s += creditRemaining(c, paid);
  }
  return s;
}

export function totalCreditCardDebtAsOf(
  cards: CreditCardRow[],
  txs: Parameters<typeof creditCardBalanceAsOf>[0],
  asOfYmd: string,
): number {
  return cards.reduce(
    (acc, c) => acc + creditCardBalanceAsOf(txs, c.id, asOfYmd),
    0,
  );
}

export function totalDebtAsOf(
  credits: CreditRow[],
  creditCards: CreditCardRow[],
  txs: Parameters<typeof creditCardBalanceAsOf>[0],
  asOfYmd: string,
): number {
  return (
    totalLoanDebtAsOf(credits, txs, asOfYmd) +
    totalCreditCardDebtAsOf(creditCards, txs, asOfYmd)
  );
}
