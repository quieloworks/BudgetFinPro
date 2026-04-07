/**
 * Pasos legibles en ejes (1, 2, 5, 10 × 10^n).
 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const f = rough / Math.pow(10, exp);
  let nf = 1;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
}

/**
 * Marcas entre min y max con paso ~ (max-min)/(targetTicks-1).
 */
export function axisTicks(
  dataMin: number,
  dataMax: number,
  targetTicks = 4,
): number[] {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return [0, 1];
  }
  let lo = dataMin;
  let hi = dataMax;
  if (hi <= lo) {
    hi = lo + 1;
  }
  const span = hi - lo;
  const rough = span / Math.max(2, targetTicks - 1);
  const step = niceStep(rough);
  const nStart = Math.ceil((lo - step * 1e-9) / step);
  const nEnd = Math.floor((hi + step * 1e-9) / step);
  const out: number[] = [];
  for (let n = nStart; n <= nEnd; n++) {
    out.push(n * step);
  }
  return out.length >= 2 ? out : [lo, hi];
}

/** Eje Y ≥ 0: margen superior y pasos según el máximo real. */
export function axisDomain0ToMax(dataMax: number, padRatio = 1.08) {
  const raw = Number(dataMax);
  if (!Number.isFinite(raw) || raw <= 0) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }
  const padded = raw * padRatio;
  const step = niceStep(padded / 3);
  const niceMax = Math.max(step, Math.ceil(padded / step) * step);
  const ticks = axisTicks(0, niceMax, 4);
  const max = ticks[ticks.length - 1] ?? niceMax;
  return { min: 0, max, ticks };
}

/** Puede haber valores negativos (p. ej. ahorro neto). */
export function axisDomainMaybeNegative(
  dataMin: number,
  dataMax: number,
  targetTicks = 4,
) {
  const dMin = Number(dataMin);
  const dMax = Number(dataMax);
  if (!Number.isFinite(dMin) || !Number.isFinite(dMax)) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }
  const pad = Math.max(1, (dMax - dMin) * 0.05);
  const lo = Math.min(0, dMin) - (dMin < 0 ? pad * 0.5 : 0);
  const hi = Math.max(dMax, dMin + 1) + (dMax > 0 ? pad * 0.5 : 0);
  const ticks = axisTicks(lo, hi, targetTicks);
  return {
    min: ticks[0] ?? lo,
    max: ticks[ticks.length - 1] ?? hi,
    ticks,
  };
}

export function formatAxisMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const body =
    abs >= 1_000_000
      ? `${(abs / 1e6).toFixed(1)}M`
      : abs >= 1000
        ? `${Math.round(abs / 1000)}k`
        : `${Math.round(abs)}`;
  return `${sign}$${body}`;
}
