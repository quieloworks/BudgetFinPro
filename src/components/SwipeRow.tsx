import { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Swipeable } from "react-native-gesture-handler";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";
import { fmt } from "../utils/format";
import { sectionDotColor } from "../utils/sectionDotColor";

type SwipeRowProps = {
  tx: Record<string, unknown>;
  onView: (t: Record<string, unknown>, mode: string) => void;
  goals?: { id: number; name: string }[];
  credits?: { id: number; name: string }[];
  creditCards?: { id: number; name: string }[];
};

export const SwipeRow = ({ tx, onView, goals, credits, creditCards }: SwipeRowProps) => {
  const { t } = useTranslation();
  const { C } = useAppTheme();
  const swipeRef = useRef<Swipeable>(null);
  const renderRightActions = () => (
    <View
      style={{
        flexDirection: "row",
        height: "100%",
        borderTopRightRadius: C.cardRadius,
        borderBottomRightRadius: C.cardRadius,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onView(tx, "edit");
        }}
        style={{
          width: 76,
          minHeight: 64,
          backgroundColor: C.blue,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: TY.title2,
            color: C.isDark ? "#fff" : C.onPrimary,
          }}
        >
          ✎
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onView(tx, "delete");
        }}
        style={{
          width: 76,
          minHeight: 64,
          backgroundColor: C.red,
          alignItems: "center",
          justifyContent: "center",
          borderTopRightRadius: C.cardRadius,
          borderBottomRightRadius: C.cardRadius,
        }}
      >
        <Text style={{ fontSize: TY.title2, color: "#fff" }}>✕</Text>
      </Pressable>
    </View>
  );
  const transferSub = () => {
    if (tx.type !== "transfer") return null;
    if (tx.transferFromGoalId != null) {
      const g = (goals || []).find((x) => x.id === tx.transferFromGoalId);
      return (g ? g.name : t("txList.goalFallback")) + " → " + tx.account;
    }
    if (tx.transferToGoalId != null) {
      const g = (goals || []).find((x) => x.id === tx.transferToGoalId);
      return tx.account + " → " + (g ? g.name : t("txList.goalFallback"));
    }
    if (tx.transferToAccount) return tx.account + " → " + tx.transferToAccount;
    return tx.account;
  };
  const rowColor =
    tx.type === "income" ? C.green : tx.type === "expense" ? C.red : C.blue;
  const rowBg =
    tx.type === "income" ? C.greenBg : tx.type === "expense" ? C.redBg : C.blueBg;
  const rowBr =
    tx.type === "income"
      ? C.greenBorder
      : tx.type === "expense"
        ? C.redBorder
        : C.blueBorder;
  const sym = tx.type === "income" ? "↑" : tx.type === "expense" ? "↓" : "⇄";
  const cred =
    tx.creditId != null
      ? (credits || []).find((c) => c.id === tx.creditId)
      : null;
  const ccRow =
    tx.creditCardId != null
      ? (creditCards || []).find((c) => c.id === tx.creditCardId)
      : null;
  const ccPart = String(tx.creditCardPart || "");
  let extraMeta = "";
  if (cred) extraMeta += ` · ${t("credits.badge")}: ${cred.name}`;
  if (ccRow) {
    if (ccPart === "charge")
      extraMeta += ` · ${t("creditCards.badgeCharge")}: ${ccRow.name}`;
    else if (ccPart === "payment")
      extraMeta +=
        ` · ${t("creditCards.badgePayment")}: ${ccRow.name}` +
        (tx.type === "expense" && tx.account
          ? ` (${t("creditCards.fromAccount")})`
          : "");
  }
  return (
    <View style={{ marginBottom: 8 }}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={() => onView(tx, "view")}
          style={{
            backgroundColor: C.bg2,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: C.cardRadius,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 18,
            paddingHorizontal: 18,
            minHeight: 64,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 14,
              alignItems: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: rowBg,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: rowBr,
              }}
            >
              <Text style={{ fontSize: TY.subhead, color: rowColor }}>
                {sym}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: TY.body, fontWeight: "600", color: C.text }}
                numberOfLines={2}
              >
                {(tx.desc as string) || t("tx.transferDefault")}
              </Text>
              <View
                style={{
                  marginTop: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: sectionDotColor(tx.section as string, C),
                  }}
                />
                <Text style={{ fontSize: TY.caption, color: C.muted }}>
                  {tx.type === "transfer"
                    ? String(transferSub() ?? "")
                    : ccPart === "charge"
                      ? String(tx.section) + " · " + t("creditCards.chargeShort")
                      : String(tx.section) + " · " + String(tx.account)}{" "}
                  · {String(tx.date)}
                  {extraMeta}
                </Text>
                {tx.recurring ? <Text style={{ color: C.gold }}> ↻</Text> : null}
              </View>
            </View>
          </View>
          <Text
            style={{
              fontWeight: "600",
              fontSize: TY.body,
              color: rowColor,
              flexShrink: 0,
            }}
          >
            {tx.type === "transfer"
              ? fmt(tx.amount as number)
              : (tx.type === "income" ? "+" : "-") +
                fmt(tx.amount as number)}
          </Text>
        </Pressable>
      </Swipeable>
    </View>
  );
};
