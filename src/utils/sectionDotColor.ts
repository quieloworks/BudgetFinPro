import type { ThemeTokens } from "../theme/tokens";

export const sectionDotColor = (s: string, C: ThemeTokens): string =>
  (
    ({
      Rentas: C.red,
      Creditos: C.gold,
      Suscripciones: C.purple,
      Comida: C.green,
      Transporte: C.blue,
      Salud: C.red,
      Entretenimiento: C.purple,
      Nomina: C.green,
      Freelance: C.blue,
      Otros: C.muted,
      General: C.muted,
      Transferencias: C.blue,
    }) as Record<string, string>
  )[s] || C.muted;
