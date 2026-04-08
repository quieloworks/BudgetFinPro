import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";
import { fmt } from "../utils/format";

type TxListProps = {
  txs: Record<string, unknown>[];
  emptyMsg?: string;
  goals?: { id: number; name: string }[] | undefined;
};

export const TxList = ({ txs, emptyMsg, goals }: TxListProps) => {
  const { t } = useTranslation();
  const { C } = useAppTheme();
  return (
    <View>
      {txs.length === 0 && (
        <Text
          style={{
            fontSize: TY.bodyEm,
            color: C.muted,
            textAlign: "center",
            paddingVertical: 40,
          }}
        >
          {emptyMsg || t("txList.empty")}
        </Text>
      )}
      {txs.map((tx) => {
        const sub =
          tx.type !== "transfer"
            ? null
            : tx.transferFromGoalId != null
              ? ((goals || []).find((g) => g.id === tx.transferFromGoalId)
                  ?.name || t("txList.goalFallback")) +
                " → " +
                tx.account
              : tx.transferToGoalId != null
                ? tx.account +
                  " → " +
                  ((goals || []).find((g) => g.id === tx.transferToGoalId)
                    ?.name || t("txList.goalFallback"))
                : tx.transferToAccount
                  ? tx.account + " → " + tx.transferToAccount
                  : tx.account;
        const col =
          tx.type === "income"
            ? C.green
            : tx.type === "expense"
              ? C.red
              : C.blue;
        return (
          <View
            key={tx.id as number}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
              <Text
                style={{
                  fontSize: TY.bodyEm,
                  color: C.text,
                  fontWeight: "500",
                }}
                numberOfLines={2}
              >
                {(tx.desc as string) || t("tx.transferDefault")}
              </Text>
              <Text
                style={{ fontSize: TY.caption, color: C.muted, marginTop: 4 }}
              >
                {String(tx.date)} · {String(sub || tx.account)}
              </Text>
            </View>
            <Text
              style={{
                fontWeight: "600",
                fontSize: TY.bodyEm,
                color: col,
                flexShrink: 0,
              }}
            >
              {tx.type === "transfer"
                ? fmt(tx.amount as number)
                : (tx.type === "income" ? "+" : "-") +
                  fmt(tx.amount as number)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
