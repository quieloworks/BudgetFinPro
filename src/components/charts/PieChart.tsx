import Svg, { Path, Circle } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeContext";

type Slice = { label: string; value: number; color: string };

type PieChartProps = { data: Slice[]; size?: number };

export const PieChart = ({ data, size = 176 }: PieChartProps) => {
  const { C } = useAppTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  let angle = -Math.PI / 2;
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 10;
  return (
    <Svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(angle),
          y1 = cy + r * Math.sin(angle);
        angle += sweep;
        const x2 = cx + r * Math.cos(angle),
          y2 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        return (
          <Path
            key={i}
            d={
              "M " +
              cx +
              " " +
              cy +
              " L " +
              x1 +
              " " +
              y1 +
              " A " +
              r +
              " " +
              r +
              " 0 " +
              large +
              " 1 " +
              x2 +
              " " +
              y2 +
              " Z"
            }
            fill={d.color}
            opacity={0.85}
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={r * 0.5} fill={C.bg2} />
    </Svg>
  );
};
