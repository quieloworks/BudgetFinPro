import { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";
import { fmt } from "../utils/format";
import { sectionDotColor } from "../utils/sectionDotColor";

type SwipeRowProps = {
  t: Record<string, unknown>;
  onView: (t: Record<string, unknown>, mode: string) => void;
  goals?: { id: number; name: string }[];
};

export const SwipeRow = ({ t, onView, goals }: SwipeRowProps) => {
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
          onView(t, "edit");
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
          onView(t, "delete");
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
    if (t.type !== "transfer") return null;
    if (t.transferFromGoalId != null) {
      const g = (goals || []).find((x) => x.id === t.transferFromGoalId);
      return (g ? g.name : "Meta") + " → " + t.account;
    }
    if (t.transferToGoalId != null) {
      const g = (goals || []).find((x) => x.id === t.transferToGoalId);
      return t.account + " → " + (g ? g.name : "Meta");
    }
    if (t.transferToAccount) return t.account + " → " + t.transferToAccount;
    return t.account;
  };
  const rowColor =
    t.type === "income" ? C.green : t.type === "expense" ? C.red : C.blue;
  const rowBg =
    t.type === "income" ? C.greenBg : t.type === "expense" ? C.redBg : C.blueBg;
  const rowBr =
    t.type === "income"
      ? C.greenBorder
      : t.type === "expense"
        ? C.redBorder
        : C.blueBorder;
  const sym = t.type === "income" ? "↑" : t.type === "expense" ? "↓" : "⇄";
  return (
    <View style={{ marginBottom: 8 }}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={() => onView(t, "view")}
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
                {(t.desc as string) || "Transferencia"}
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
                    backgroundColor: sectionDotColor(t.section as string, C),
                  }}
                />
                <Text style={{ fontSize: TY.caption, color: C.muted }}>
                  {t.type === "transfer"
                    ? String(transferSub() ?? "")
                    : String(t.section) + " · " + String(t.account)}{" "}
                  · {String(t.date)}
                </Text>
                {t.recurring ? <Text style={{ color: C.gold }}> ↻</Text> : null}
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
            {t.type === "transfer"
              ? fmt(t.amount as number)
              : (t.type === "income" ? "+" : "-") + fmt(t.amount as number)}
          </Text>
        </Pressable>
      </Swipeable>
    </View>
  );
};
