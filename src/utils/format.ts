export const fmt = (n: number) =>
  "$" + Math.abs(Math.round(n)).toLocaleString("es-MX");
