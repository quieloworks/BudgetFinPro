import { View, Text } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";
import { fmt } from "../utils/format";

type TxListProps = {
  txs: Record<string, unknown>[];
  emptyMsg?: string;
  goals?: { id: number; name: string }[] | undefined;
};

export const TxList = ({ txs, emptyMsg, goals }: TxListProps) => {
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
          {emptyMsg || "Sin transacciones"}
        </Text>
      )}
      {txs.map((t) => {
        const sub =
          t.type !== "transfer"
            ? null
            : t.transferFromGoalId != null
              ? ((goals || []).find((g) => g.id === t.transferFromGoalId)
                  ?.name || "Meta") +
                " → " +
                t.account
              : t.transferToGoalId != null
                ? t.account +
                  " → " +
                  ((goals || []).find((g) => g.id === t.transferToGoalId)
                    ?.name || "Meta")
                : t.transferToAccount
                  ? t.account + " → " + t.transferToAccount
                  : t.account;
        const col =
          t.type === "income" ? C.green : t.type === "expense" ? C.red : C.blue;
        return (
          <View
            key={t.id as number}
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
                {(t.desc as string) || "Transferencia"}
              </Text>
              <Text
                style={{ fontSize: TY.caption, color: C.muted, marginTop: 4 }}
              >
                {String(t.date)} · {String(sub || t.account)}
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
              {t.type === "transfer"
                ? fmt(t.amount as number)
                : (t.type === "income" ? "+" : "-") + fmt(t.amount as number)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
