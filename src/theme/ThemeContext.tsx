import { createContext, useContext } from "react";
import type { ThemeTokens } from "./tokens";
import { T_DARK } from "./tokens";

export type ThemeMode = "dark" | "light";

export type AppThemeContextValue = {
  C: ThemeTokens;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

export const AppThemeContext = createContext<AppThemeContextValue>({
  C: T_DARK as ThemeTokens,
  themeMode: "dark",
  setThemeMode: () => {},
});

export const useAppTheme = () => useContext(AppThemeContext);
