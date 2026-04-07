import { fmt } from "./format";

export type BudgetThresholdRule = {
  kind: "budget_threshold";
  section: string;
  /** Dispara advertencia cuando gasto del mes >= presupuesto * percent/100 */
  percent: number;
};

export type AccountLowRule = {
  kind: "account_low";
  account: string;
  /** Dispara cuando saldo < minBalance (y saldo >= 0) */
  minBalance: number;
};

export type AlertRuleDefinition = BudgetThresholdRule | AccountLowRule;

export type AlertRule = {
  id: number;
  enabled: boolean;
  severity: "warn" | "error";
  rule: AlertRuleDefinition;
};

export type ComputedAlert = {
  id: string;
  type: "warn" | "error";
  msg: string;
};

/** YYYY-MM en calendario local */
export function monthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function spentInMonth(
  txs: Array<{ type: string; section: string; amount: number; date: string }>,
  section: string,
  prefix: string,
): number {
  return txs
    .filter(
      (t) =>
        t.type === "expense" &&
        t.section === section &&
        typeof t.date === "string" &&
        t.date.startsWith(prefix),
    )
    .reduce((s, t) => s + t.amount, 0);
}

const DEFAULT_BUDGET_WARN_PCT = 80;

/**
 * Evalúa alertas automáticas (presupuesto mes, saldo negativo) y reglas del usuario.
 */
export function computeAlerts(input: {
  monthPrefix: string;
  sections: string[];
  budget: Record<string, number>;
  txs: Array<{
    type: string;
    section: string;
    amount: number;
    date: string;
  }>;
  accounts: string[];
  /** saldo por cuenta */
  balances: Record<string, number>;
  rules: AlertRule[];
}): ComputedAlert[] {
  const out: ComputedAlert[] = [];
  const { monthPrefix, sections, budget, txs, accounts, balances, rules } =
    input;

  const enabledRules = rules.filter((r) => r.enabled);

  const budgetThresholdForSection = (section: string): number => {
    const customs = enabledRules.filter(
      (r) =>
        r.rule.kind === "budget_threshold" && r.rule.section === section,
    );
    if (customs.length === 0) return DEFAULT_BUDGET_WARN_PCT;
    return Math.min(
      ...customs.map((r) =>
        r.rule.kind === "budget_threshold"
          ? Math.min(99, Math.max(1, r.rule.percent))
          : DEFAULT_BUDGET_WARN_PCT,
      ),
    );
  };

  for (const s of sections) {
    const b = budget[s] ?? 0;
    if (b <= 0 || s === "Transferencias") continue;
    const spent = spentInMonth(txs, s, monthPrefix);
    if (spent >= b) {
      out.push({
        id: `bud:${s}:${monthPrefix}:exceeded`,
        type: "error",
        msg: `${s}: presupuesto del mes superado (${fmt(spent)} / ${fmt(b)})`,
      });
      continue;
    }
    const pct = budgetThresholdForSection(s);
    if (spent >= (b * pct) / 100) {
      const userRulesSec = enabledRules.filter(
        (r) => r.rule.kind === "budget_threshold" && r.rule.section === s,
      );
      const sev = userRulesSec.some((r) => r.severity === "error")
        ? "error"
        : "warn";
      out.push({
        id: `bud:${s}:${monthPrefix}:pct${pct}`,
        type: sev,
        msg: `${s}: ${pct}% o mas del presupuesto mensual usado (${fmt(spent)} / ${fmt(b)})`,
      });
    }
  }

  for (const a of accounts) {
    const bal = balances[a] ?? 0;
    if (bal < 0) {
      out.push({
        id: `acc:${a}:${monthPrefix}:negative`,
        type: "error",
        msg: `${a}: saldo negativo (${fmt(bal)})`,
      });
    }
  }

  for (const r of enabledRules) {
    if (r.rule.kind !== "account_low") continue;
    const acc = r.rule.account;
    const minB = r.rule.minBalance;
    const bal = balances[acc] ?? 0;
    if (bal >= 0 && bal < minB) {
      out.push({
        id: `acc:${acc}:${monthPrefix}:low:${minB}`,
        type: r.severity,
        msg: `${acc}: saldo bajo ${fmt(bal)} (minimo ${fmt(minB)})`,
      });
    }
  }

  return out;
}
