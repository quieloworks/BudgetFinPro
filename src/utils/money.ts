export const fmtMoneyDigits = (digits: string | null | undefined) => {
  if (digits == null || digits === "") return "";
  const n = parseInt(String(digits).replace(/\D/g, ""), 10) / 100;
  if (Number.isNaN(n)) return "";
  return (
    "$" +
    n.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

export const digitsFromNumber = (num: unknown) => {
  if (num == null || num === "" || Number.isNaN(Number(num))) return "";
  return String(Math.round(Number(num) * 100));
};

export const parseMoneyDigits = (digits: string | null | undefined) => {
  if (digits == null || digits === "") return NaN;
  return parseInt(String(digits).replace(/\D/g, ""), 10) / 100;
};

export const stripMoneyToDigits = (text: string) =>
  String(text || "").replace(/\D/g, "");
