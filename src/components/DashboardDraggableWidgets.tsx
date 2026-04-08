import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DimensionValue } from "react-native";
import { Platform, Pressable, Text, View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import type { ThemeTokens } from "../theme/tokens";
import type { DashboardWidgetId } from "../constants/storage";
import { fmt } from "../utils/format";
import { sectionDotColor } from "../utils/sectionDotColor";

const CARD_GAP = 12;
const LONG_PRESS_MS = 1500;

export type DashboardDraggableWidgetsProps = {
  order: DashboardWidgetId[];
  onReorder: (next: DashboardWidgetId[]) => void;
  /** Bloquea el scroll del home mientras se arrastra una tarjeta */
  onScrollLockChange?: (locked: boolean) => void;
  cS: Record<string, unknown>;
  C: ThemeTokens;
  t: (k: string, o?: Record<string, unknown>) => string;
  openDrill: (key: string) => void;
  byAccount: { a: string; bal: number }[];
  defaultAccount: string;
  trendData: { inc: number; exp: number; label: string }[];
  trendHasAnyData: boolean;
  maxTrend: number;
  dashboardBudgetRows: { s: string; b: number; spent: number }[];
  goals: {
    id: string;
    name: string;
    saved: number;
    target: number;
    deadline: string;
    color: string;
  }[];
  dashboardCreditPreviews: {
    id: number;
    name: string;
    paid: number;
    principal: number;
    pct: number;
    color: string;
    subtitle: string;
  }[];
  dashboardCreditCardPreviews: {
    id: number;
    name: string;
    balance: number;
    limit: number;
    pct: number;
    color: string;
    subtitle: string;
  }[];
  recTxs: {
    id: string;
    desc: string;
    section: string;
    freq?: string;
    type: string;
    amount: number;
  }[];
};

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= arr.length ||
    to >= arr.length
  ) {
    return [...arr];
  }
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function renderWidgetBody(
  item: DashboardWidgetId,
  p: DashboardDraggableWidgetsProps,
): ReactNode {
  const {
    C,
    t,
    byAccount,
    defaultAccount,
    trendData,
    trendHasAnyData,
    maxTrend,
    dashboardBudgetRows,
    goals,
    dashboardCreditPreviews,
    dashboardCreditCardPreviews,
    recTxs,
  } = p;

  if (item === "accounts") {
    return (
      <>
        <View
          style={{
            paddingTop: 14,
            paddingHorizontal: 20,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "500", color: C.text }}>
            {t("dashboard.accountsTitle")}{" "}
            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                fontWeight: "400",
              }}
            >
              · {t("dashboard.defaultAccountShort")}{" "}
              <Text style={{ color: C.green }}>{defaultAccount}</Text>
            </Text>
          </Text>
          <Text style={{ color: C.hint, fontSize: 14 }}>›</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {byAccount.map((a, i) => (
            <View
              key={a.a}
              style={{
                width: "50%",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRightWidth: i % 2 === 0 ? 1 : 0,
                borderRightColor: C.border,
                borderBottomWidth: i < byAccount.length - 2 ? 1 : 0,
                borderBottomColor: C.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: C.muted,
                  letterSpacing: 0.85,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {a.a}
                {defaultAccount === a.a ? (
                  <Text style={{ marginLeft: 5, color: C.green }}>✓</Text>
                ) : null}
              </Text>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  color: a.bal >= 0 ? C.green : C.red,
                }}
              >
                {a.bal < 0 ? "-" : ""}
                {fmt(a.bal)}
              </Text>
            </View>
          ))}
        </View>
      </>
    );
  }

  if (item === "trend") {
    return (
      <>
        <Text
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: C.hint,
            fontSize: 14,
          }}
        >
          ›
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 14,
            color: C.text,
          }}
        >
          {t("dashboard.monthlyTrend")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-end",
            minHeight: trendHasAnyData ? 72 : 40,
          }}
        >
          {trendHasAnyData ? (
            trendData.map((m, i) => {
              const hInc = maxTrend > 0 ? (m.inc / maxTrend) * 56 : 0;
              const hExp = maxTrend > 0 ? (m.exp / maxTrend) * 56 : 0;
              const barInc = m.inc > 0 ? Math.max(2, hInc) : 0;
              const barExp = m.exp > 0 ? Math.max(2, hExp) : 0;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      flexDirection: "row",
                      gap: 3,
                      alignItems: "flex-end",
                      justifyContent: "center",
                      height: 56,
                    }}
                  >
                    <View
                      style={{
                        width: "47%",
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        height: barInc,
                        backgroundColor: C.green,
                        opacity: 0.9,
                      }}
                    />
                    <View
                      style={{
                        width: "47%",
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        height: barExp,
                        backgroundColor: C.red,
                        opacity: 0.9,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 10, color: C.muted }}>
                    {m.label}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text
              style={{
                fontSize: 12,
                color: C.muted,
                paddingVertical: 8,
                width: "100%",
                textAlign: "center",
              }}
            >
              {t("dashboard.trendEmpty")}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: C.green,
              }}
            />
            <Text style={{ fontSize: 11, color: C.muted }}>
              {t("balance.income")}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: C.red,
              }}
            />
            <Text style={{ fontSize: 11, color: C.muted }}>
              {t("balance.expense")}
            </Text>
          </View>
        </View>
      </>
    );
  }

  if (item === "budget") {
    return (
      <>
        <Text
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: C.hint,
            fontSize: 14,
          }}
        >
          ›
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 14,
            color: C.text,
          }}
        >
          {t("dashboard.budgetVsActual")}
        </Text>
        {dashboardBudgetRows.map((b) => {
          const pct =
            b.b > 0 ? Math.min(100, (b.spent / b.b) * 100) : 100;
          const over = b.spent > b.b && b.b > 0;
          return (
            <View key={b.s} style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: sectionDotColor(b.s, C),
                    }}
                  />
                  <Text style={{ fontSize: 14, color: C.text }}>{b.s}</Text>
                </View>
                <Text style={{ color: over ? C.red : C.muted }}>
                  {fmt(b.spent)}{" "}
                  <Text style={{ color: C.hint }}>/ {fmt(b.b)}</Text>
                </Text>
              </View>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.bg3,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${pct}%` as DimensionValue,
                    height: "100%",
                    backgroundColor: over ? C.red : C.green,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          );
        })}
      </>
    );
  }

  if (item === "goals") {
    return (
      <>
        <Text
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: C.hint,
            fontSize: 14,
          }}
        >
          ›
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 12,
            color: C.text,
          }}
        >
          {t("dashboard.savingsGoals")}
        </Text>
        {goals.slice(0, 2).map((g) => {
          const pct = Math.min(
            100,
            Math.round((g.saved / g.target) * 100),
          );
          return (
            <View key={g.id} style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text style={{ fontSize: 12, color: C.text }}>{g.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {fmt(g.saved)}{" "}
                  <Text style={{ color: C.hint }}>/ {fmt(g.target)}</Text>
                </Text>
              </View>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.bg3,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${pct}%` as DimensionValue,
                    height: "100%",
                    backgroundColor: g.color,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text
                style={{ fontSize: 10, color: C.muted, marginTop: 3 }}
              >
                {t("goals.limitProgress", {
                  pct,
                  date: g.deadline,
                })}
              </Text>
            </View>
          );
        })}
      </>
    );
  }

  if (item === "credits") {
    return (
      <>
        <Text
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: C.hint,
            fontSize: 14,
          }}
        >
          ›
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 12,
            color: C.text,
          }}
        >
          {t("dashboard.creditsLoans")}
        </Text>
        {dashboardCreditPreviews.length === 0 ? (
          <Text
            style={{
              fontSize: 12,
              color: C.muted,
              paddingVertical: 8,
              width: "100%",
              textAlign: "center",
            }}
          >
            {t("dashboard.creditsEmpty")}
          </Text>
        ) : (
          dashboardCreditPreviews.map((c) => (
            <View key={c.id} style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{ fontSize: 12, color: C.text, flex: 1, marginRight: 8 }}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>
                  {fmt(c.paid)}{" "}
                  <Text style={{ color: C.hint }}>/ {fmt(c.principal)}</Text>
                </Text>
              </View>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.bg3,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, c.pct)}%` as DimensionValue,
                    height: "100%",
                    backgroundColor: c.color,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text
                style={{ fontSize: 10, color: C.muted, marginTop: 3 }}
                numberOfLines={2}
              >
                {c.pct}% · {c.subtitle}
              </Text>
            </View>
          ))
        )}
      </>
    );
  }

  if (item === "credit_cards") {
    return (
      <>
        <Text
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: C.hint,
            fontSize: 14,
          }}
        >
          ›
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 12,
            color: C.text,
          }}
        >
          {t("dashboard.creditCards")}
        </Text>
        {dashboardCreditCardPreviews.length === 0 ? (
          <Text
            style={{
              fontSize: 12,
              color: C.muted,
              paddingVertical: 8,
              width: "100%",
              textAlign: "center",
            }}
          >
            {t("dashboard.creditCardsEmpty")}
          </Text>
        ) : (
          dashboardCreditCardPreviews.map((c) => (
            <View key={c.id} style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{ fontSize: 12, color: C.text, flex: 1, marginRight: 8 }}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12, flexShrink: 0 }}>
                  {fmt(c.balance)}{" "}
                  <Text style={{ color: C.hint }}>/ {fmt(c.limit)}</Text>
                </Text>
              </View>
              <View
                style={{
                  height: 5,
                  backgroundColor: C.bg3,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, c.pct)}%` as DimensionValue,
                    height: "100%",
                    backgroundColor: c.color,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text
                style={{ fontSize: 10, color: C.muted, marginTop: 3 }}
                numberOfLines={2}
              >
                {c.pct}% · {c.subtitle}
              </Text>
            </View>
          ))
        )}
      </>
    );
  }

  return (
    <>
      <Text
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          color: C.hint,
          fontSize: 14,
        }}
      >
        ›
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          marginBottom: 12,
          color: C.text,
        }}
      >
        {t("dashboard.recurringCard")}
      </Text>
      {recTxs.slice(0, 4).map((rec) => (
        <View
          key={rec.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <View>
            <Text style={{ fontSize: 13, color: C.text }}>{rec.desc}</Text>
            <Text
              style={{ fontSize: 11, color: C.muted, marginTop: 2 }}
            >
              {rec.section} · {t("freq." + (rec.freq || "monthly"))}
            </Text>
          </View>
          <Text
            style={{
              fontWeight: "500",
              color: rec.type === "income" ? C.green : C.red,
            }}
          >
            {rec.type === "income" ? "+" : "-"}
            {fmt(rec.amount)}
          </Text>
        </View>
      ))}
      {recTxs.length > 4 && (
        <Text
          style={{
            fontSize: 11,
            color: C.muted,
            paddingTop: 8,
            textAlign: "center",
          }}
        >
          {t("dashboard.moreRecurring", {
            n: recTxs.length - 4,
          })}
        </Text>
      )}
    </>
  );
}

function slotShiftStyle(
  rowIndex: number,
  drag: {
    from: number;
    to: number;
    ty: number;
  } | null,
  heights: number[],
): object {
  if (!drag) return {};
  const { from, to, ty } = drag;
  if (from === to) {
    return rowIndex === from
      ? {
          transform: [{ translateY: ty }],
          zIndex: 50,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }
      : {};
  }
  const h = heights[from] ?? 120;
  const step = h + CARD_GAP;
  if (rowIndex === from) {
    return {
      transform: [{ translateY: ty }],
      zIndex: 50,
      elevation: 12,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
    };
  }
  if (from < to) {
    if (rowIndex > from && rowIndex <= to) {
      return { transform: [{ translateY: -step }] };
    }
  } else if (from > to) {
    if (rowIndex >= to && rowIndex < from) {
      return { transform: [{ translateY: step }] };
    }
  }
  return {};
}

type RowProps = {
  id: DashboardWidgetId;
  rowIndex: number;
  props: DashboardDraggableWidgetsProps;
  cardStyle: object;
  drag: {
    from: number;
    to: number;
    ty: number;
  } | null;
  heightsRef: React.MutableRefObject<number[]>;
  orderRef: React.MutableRefObject<DashboardWidgetId[]>;
  setDrag: React.Dispatch<
    React.SetStateAction<{
      id: DashboardWidgetId;
      from: number;
      to: number;
      ty: number;
    } | null>
  >;
  onScrollLockChange?: (locked: boolean) => void;
};

function DashboardWidgetRow({
  id,
  rowIndex,
  props: p,
  cardStyle,
  drag,
  heightsRef,
  orderRef,
  setDrag,
  onScrollLockChange,
}: RowProps) {
  const { openDrill, onReorder, C } = p;

  const computeHover = useCallback(
    (from: number, ty: number, n: number) => {
      const heights = heightsRef.current;
      if (n <= 1) return 0;
      let cum = 0;
      const centers: number[] = [];
      for (let i = 0; i < n; i++) {
        const h = heights[i] ?? 110;
        centers.push(cum + h / 2);
        cum += h + CARD_GAP;
      }
      const start = centers[from] ?? 0;
      const moving = start + ty;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(moving - centers[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    [heightsRef],
  );

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(450)
      .onEnd(() => {
        openDrill(id);
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(LONG_PRESS_MS)
      .onStart(() => {
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onScrollLockChange?.(true);
        const ord = orderRef.current;
        const from = ord.indexOf(id);
        if (from < 0) return;
        setDrag({ id, from, to: from, ty: 0 });
      })
      .onUpdate((e) => {
        const ord = orderRef.current;
        const from = ord.indexOf(id);
        if (from < 0) return;
        const ty = e.translationY;
        const to = computeHover(from, ty, ord.length);
        setDrag({ id, from, to, ty });
      })
      .onEnd((e) => {
        const ord = orderRef.current;
        const from = ord.indexOf(id);
        if (from < 0) {
          setDrag(null);
          onScrollLockChange?.(false);
          return;
        }
        const ty = e.translationY;
        const to = computeHover(from, ty, ord.length);
        if (to !== from) {
          onReorder(arrayMove(ord, from, to));
          if (Platform.OS !== "web") {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          }
        }
        setDrag(null);
        onScrollLockChange?.(false);
      })
      .onFinalize(() => {
        setDrag(null);
        onScrollLockChange?.(false);
      });

    return Gesture.Exclusive(tap, pan);
  }, [
    id,
    openDrill,
    onReorder,
    orderRef,
    heightsRef,
    computeHover,
    setDrag,
    onScrollLockChange,
  ]);

  const shiftStyle = slotShiftStyle(
    rowIndex,
    drag,
    heightsRef.current,
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[shiftStyle]}
        onLayout={(e) => {
          heightsRef.current[rowIndex] = e.nativeEvent.layout.height;
        }}
      >
        <View style={cardStyle}>
          {renderWidgetBody(id, p)}
        </View>
      </View>
    </GestureDetector>
  );
}

export function DashboardDraggableWidgets(props: DashboardDraggableWidgetsProps) {
  const {
    order,
    onReorder,
    cS,
    C,
    onScrollLockChange,
  } = props;

  const orderRef = useRef(order);
  orderRef.current = order;

  const heightsRef = useRef<number[]>([]);

  const [drag, setDrag] = useState<{
    id: DashboardWidgetId;
    from: number;
    to: number;
    ty: number;
  } | null>(null);

  const dragForStyle = drag
    ? { from: drag.from, to: drag.to, ty: drag.ty }
    : null;

  const cardStyle = useCallback(
    (id: DashboardWidgetId) =>
      id === "accounts"
        ? { ...cS, padding: 0, overflow: "hidden" as const }
        : { ...cS, position: "relative" as const },
    [cS],
  );

  if (Platform.OS === "web") {
    return (
      <>
        {order.map((id, i) => (
          <View
            key={id}
            style={i > 0 ? { marginTop: CARD_GAP } : undefined}
          >
            <Pressable
              onPress={() => props.openDrill(id)}
              style={cardStyle(id)}
            >
              {renderWidgetBody(id, props)}
            </Pressable>
          </View>
        ))}
      </>
    );
  }

  return (
    <View style={styles.column}>
      {order.map((id, rowIndex) => (
        <View
          key={id}
          style={
            rowIndex > 0
              ? { marginTop: CARD_GAP }
              : undefined
          }
        >
          <DashboardWidgetRow
            id={id}
            rowIndex={rowIndex}
            props={props}
            cardStyle={cardStyle(id)}
            drag={dragForStyle}
            heightsRef={heightsRef}
            orderRef={orderRef}
            setDrag={setDrag}
            onScrollLockChange={onScrollLockChange}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignSelf: "stretch",
  },
});
