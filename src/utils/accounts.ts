/** Apply tx to running account balances (income/expense/transfer). */
export const applyTxToAccounts = (
  balMap: Record<string, number>,
  t: Record<string, unknown>,
) => {
  if (t.type === "income") {
    balMap[t.account as string] =
      (balMap[t.account as string] || 0) + (t.amount as number);
  } else if (t.type === "expense") {
    balMap[t.account as string] =
      (balMap[t.account as string] || 0) - (t.amount as number);
  } else if (t.type === "transfer") {
    if (t.transferFromGoalId != null) {
      balMap[t.account as string] =
        (balMap[t.account as string] || 0) + (t.amount as number);
    } else {
      balMap[t.account as string] =
        (balMap[t.account as string] || 0) - (t.amount as number);
      if (t.transferToAccount) {
        balMap[t.transferToAccount as string] =
          (balMap[t.transferToAccount as string] || 0) + (t.amount as number);
      }
    }
  }
};
