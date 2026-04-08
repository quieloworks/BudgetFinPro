/** Map app locale codes to BCP 47 for Intl / DateTimeFormat */
const MAP: Record<string, string> = {
  zh: "zh-CN",
  pt: "pt-BR",
  bn: "bn-IN",
  hi: "hi-IN",
};

export function toBcp47Locale(code: string | undefined): string {
  if (!code) return "en";
  const base = code.split("-")[0] ?? code;
  return MAP[base] ?? code;
}
