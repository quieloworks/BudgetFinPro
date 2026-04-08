import type { CreditRow } from "./creditMath";

export type CreditTxPart = "principal" | "payment";

/** Crea transacción inicial (solo crédito en efectivo). */
export function buildPrincipalTransaction(
  credit: CreditRow,
  tid: number,
  t: (key: string, opts?: Record<string, string>) => string,
): Record<string, unknown> | null {
  if (credit.kind === "inkind" && credit.direction === "received") {
    return null;
  }
  if (!credit.account) return null;

  const base = {
    id: tid,
    creditId: credit.id,
    creditPart: "principal" as CreditTxPart,
    date: credit.startDate,
    recurring: false,
    freq: "",
    notes: "",
    section: "Transferencias",
    transferToAccount: null,
    transferToGoalId: null,
    transferFromGoalId: null,
  };

  if (credit.direction === "given") {
    return {
      ...base,
      type: "expense",
      amount: credit.principal,
      desc: t("credits.txPrincipalGiven", { name: credit.name }),
      account: credit.account,
    };
  }

  return {
    ...base,
    type: "income",
    amount: credit.principal,
    desc: t("credits.txPrincipalReceived", { name: credit.name }),
    account: credit.account,
  };
}

export function buildPaymentTransaction(
  credit: CreditRow,
  amount: number,
  dateStr: string,
  tid: number,
  desc: string,
  t: (key: string, opts?: Record<string, string>) => string,
): Record<string, unknown> | null {
  if (amount <= 0 || !credit.account) return null;
  const base = {
    id: tid,
    creditId: credit.id,
    creditPart: "payment" as CreditTxPart,
    date: dateStr,
    recurring: false,
    freq: "",
    notes: "",
    section: "Transferencias",
    transferToAccount: null,
    transferToGoalId: null,
    transferFromGoalId: null,
  };
  const label =
    (desc || "").trim() ||
    (credit.direction === "given"
      ? t("credits.txPaymentReceived", { name: credit.name })
      : t("credits.txPaymentMade", { name: credit.name }));

  if (credit.direction === "given") {
    return {
      ...base,
      type: "income",
      amount,
      desc: label,
      account: credit.account,
    };
  }

  return {
    ...base,
    type: "expense",
    amount,
    desc: label,
    account: credit.account,
  };
}
