import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeContext";
import { TY } from "../../theme/typography";
import {
  axisDomain0ToMax,
  axisDomainMaybeNegative,
  formatAxisMoney,
} from "../../utils/chartAxis";

type Series = { label: string; color: string; data: number[] };

type LineChartProps = {
  series: Series[];
  height?: number;
  labels?: string[];
};

const MIN_W = 200;
const PAD_L = 52;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 32;
const MAX_X_LABELS = 4;

export const LineChart = ({ series, height = 176, labels }: LineChartProps) => {
  const { C } = useAppTheme();
  const [containerW, setContainerW] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerW(w);
  }, []);

  const w = Math.max(MIN_W, containerW > 0 ? containerW : MIN_W);
  const plotW = Math.max(48, w - PAD_L - PAD_R);
  const plotH = Math.max(56, height - PAD_T - PAD_B);

  const normalized = series.map((s) => ({
    ...s,
    data: (s.data ?? []).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0)),
  }));

  const allVals = normalized.flatMap((s) => s.data);

  if (!normalized.length) {
    return null;
  }

  const maxObs = allVals.length ? Math.max(...allVals) : 0;
  const minObs = allVals.length ? Math.min(...allVals) : 0;

  const { min: minAxis, max: maxAxis, ticks } =
    minObs < 0
      ? axisDomainMaybeNegative(minObs, maxObs, 4)
      : axisDomain0ToMax(maxObs, 1.1);

  const span = maxAxis - minAxis || 1;

  const xAt = (i: number, len: number) =>
    PAD_L + (len <= 1 ? plotW / 2 : (i * plotW) / Math.max(1, len - 1));

  const yAt = (v: number) =>
    PAD_T + plotH - ((v - minAxis) / span) * plotH;

  const xSkip =
    labels && labels.length > MAX_X_LABELS
      ? Math.ceil(labels.length / MAX_X_LABELS)
      : 1;

  const showXLabel = (i: number, total: number) =>
    i === 0 || i === total - 1 || (xSkip > 1 ? i % xSkip === 0 : true);

  return (
    <View
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
      onLayout={onLayout}
    >
      <Svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
        {ticks.map((tv, ti) => {
          const y = yAt(tv);
          return (
            <G key={`gy-${ti}-${tv}`}>
              <Line
                x1={PAD_L}
                y1={y}
                x2={PAD_L + plotW}
                y2={y}
                stroke={C.border + "88"}
                strokeWidth={0.8}
              />
              <SvgText
                x={4}
                y={y + 4}
                fontSize={TY.micro}
                fill={C.muted}
                textAnchor="start"
              >
                {formatAxisMoney(tv)}
              </SvgText>
            </G>
          );
        })}

        {minAxis < 0 && maxAxis > 0 ? (
          <Line
            x1={PAD_L}
            y1={yAt(0)}
            x2={PAD_L + plotW}
            y2={yAt(0)}
            stroke={C.text}
            strokeOpacity={0.22}
            strokeWidth={1.2}
          />
        ) : null}

        <Line
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={PAD_L + plotW}
          y2={PAD_T + plotH}
          stroke={C.border}
          strokeWidth={1}
        />

        {normalized.map((s, si) => {
          const len = s.data.length;
          if (len === 0) return null;
          const p = s.data.map((v, i) => [xAt(i, len), yAt(v)] as const);
          const d = p
            .map(
              (pt, i) =>
                (i === 0 ? "M" : "L") +
                pt[0].toFixed(1) +
                " " +
                pt[1].toFixed(1),
            )
            .join(" ");
          return (
            <Path
              key={si}
              d={d}
              stroke={s.color}
              strokeWidth={2.25}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {labels &&
          labels.map((l, i) =>
            showXLabel(i, labels.length) ? (
              <SvgText
                key={`xl-${i}`}
                x={xAt(i, labels.length).toFixed(1)}
                y={PAD_T + plotH + 16}
                fontSize={TY.micro}
                fill={C.hint}
                textAnchor="middle"
              >
                {l}
              </SvgText>
            ) : null,
          )}
      </Svg>
    </View>
  );
};
