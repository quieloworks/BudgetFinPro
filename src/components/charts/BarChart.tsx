import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";
import { TY } from "../../theme/typography";
import {
  axisDomain0ToMax,
  axisDomainMaybeNegative,
  formatAxisMoney,
} from "../../utils/chartAxis";

type BarDatum = { label: string; inc?: number; exp?: number; sav?: number };

type BarChartProps = { data: BarDatum[]; height?: number };

const MAX_X_LABELS = 4;

/**
 * Barras agrupadas con línea en cero cuando hay ahorro neto negativo (ing − egr).
 */
export const BarChart = ({ data, height = 160 }: BarChartProps) => {
  const { C } = useAppTheme();
  const [containerW, setContainerW] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerW(w);
  }, []);

  const axisW = 52;
  const labelH = 28;
  const plotH = Math.max(56, height - labelH);

  const safe = data.map((d) => ({
    ...d,
    inc: d.inc !== undefined ? (Number.isFinite(Number(d.inc)) ? Number(d.inc) : 0) : undefined,
    exp: d.exp !== undefined ? (Number.isFinite(Number(d.exp)) ? Number(d.exp) : 0) : undefined,
    sav:
      d.sav !== undefined ? (Number.isFinite(Number(d.sav)) ? Number(d.sav) : 0) : undefined,
  }));

  const savMins = safe
    .filter((d) => d.sav !== undefined)
    .map((d) => d.sav as number);
  const minSav = savMins.length ? Math.min(...savMins) : 0;
  const hasNegSav = minSav < 0;

  const maxPos = Math.max(
    1,
    ...safe.flatMap((d) => [d.inc ?? 0, d.exp ?? 0, Math.max(0, d.sav ?? 0)]),
  );

  const { min: minAxis, max: maxAxis, ticks } = hasNegSav
    ? axisDomainMaybeNegative(Math.min(0, minSav), maxPos, 4)
    : axisDomain0ToMax(maxPos, 1.08);

  const tickLabelsDesc = [...ticks].reverse();
  const span = maxAxis - minAxis || 1;

  const offsetFromBottom = (v: number) =>
    span > 0 ? ((v - minAxis) / span) * plotH : 0;
  const zeroOffset = offsetFromBottom(0);

  const xSkip =
    safe.length > MAX_X_LABELS ? Math.ceil(safe.length / MAX_X_LABELS) : 1;
  const showXLabel = (i: number, n: number) =>
    i === 0 || i === n - 1 || (xSkip > 1 ? i % xSkip === 0 : true);

  return (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        maxWidth: "100%",
        height,
        overflow: "hidden",
      }}
      onLayout={onLayout}
    >
      <View
        style={{
          width: axisW,
          paddingRight: 4,
          height: plotH,
          justifyContent: "space-between",
          alignItems: "flex-end",
          alignSelf: "flex-end",
          marginBottom: labelH,
        }}
      >
        {tickLabelsDesc.map((tv) => (
          <Text
            key={String(tv)}
            style={{ fontSize: TY.micro, color: C.muted, lineHeight: 14 }}
            numberOfLines={1}
          >
            {formatAxisMoney(tv)}
          </Text>
        ))}
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-end",
          minWidth: 0,
          gap: containerW > 360 ? 8 : 4,
          height,
        }}
      >
        {safe.map((d, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: "100%",
              height,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "stretch",
                justifyContent: "center",
                height: plotH,
                width: "100%",
                gap: 3,
                paddingHorizontal: 0,
                position: "relative",
              }}
            >
              {hasNegSav ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: zeroOffset,
                    height: 1,
                    backgroundColor: C.text,
                    opacity: 0.28,
                    zIndex: 2,
                  }}
                />
              ) : null}
              {(["inc", "exp", "sav"] as const).map((kind) => {
                const raw =
                  kind === "inc"
                    ? d.inc
                    : kind === "exp"
                      ? d.exp
                      : d.sav;
                if (raw === undefined)
                  return <View key={kind} style={{ flex: 1 }} />;
                const col =
                  kind === "inc"
                    ? C.green
                    : kind === "exp"
                      ? C.red
                      : raw >= 0
                        ? C.gold
                        : C.red;
                const v = Number(raw);
                const isSav = kind === "sav";
                const hPos =
                  v > 0
                    ? Math.max(3, Math.round(offsetFromBottom(v) - zeroOffset))
                    : 0;
                const hNeg =
                  v < 0 && isSav
                    ? Math.max(3, Math.round(zeroOffset - offsetFromBottom(v)))
                    : 0;

                return (
                  <View
                    key={kind}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: plotH,
                      position: "relative",
                    }}
                  >
                    {!isSav && v > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: zeroOffset,
                          height: Math.min(plotH - zeroOffset, hPos),
                          backgroundColor: col,
                          opacity: 0.9,
                          borderRadius: 3,
                        }}
                      />
                    ) : null}
                    {isSav && v >= 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: zeroOffset,
                          height: Math.min(plotH - zeroOffset, hPos),
                          backgroundColor: col,
                          opacity: 0.9,
                          borderRadius: 3,
                        }}
                      />
                    ) : null}
                    {isSav && v < 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: offsetFromBottom(v),
                          height: Math.min(zeroOffset, hNeg),
                          backgroundColor: col,
                          opacity: 0.9,
                          borderRadius: 3,
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
            <Text
              style={{
                fontSize: TY.overline,
                color: C.muted,
                textAlign: "center",
                marginTop: 6,
                minHeight: labelH - 6,
              }}
              numberOfLines={2}
            >
              {showXLabel(i, safe.length) ? d.label : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
