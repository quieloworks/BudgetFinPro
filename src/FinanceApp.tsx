import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppThemeContext, type ThemeMode } from "./theme/ThemeContext";
import { T_DARK, T_LIGHT, type ThemeTokens } from "./theme/tokens";
import { THEME_STORAGE_KEY } from "./constants/storage";
import { FinanceScreen } from "./screens/FinanceScreen";

export default function FinanceApp() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (t === "light" || t === "dark") setThemeModeState(t);
      } catch {
        /* ignore */
      }
    })();
  }, []);
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);
  useLayoutEffect(() => {
    Appearance.setColorScheme(themeMode === "dark" ? "dark" : "light");
  }, [themeMode]);
  const C = useMemo(
    () => (themeMode === "light" ? T_LIGHT : T_DARK) as ThemeTokens,
    [themeMode],
  );
  const ctx = useMemo(
    () => ({ C, themeMode, setThemeMode }),
    [C, themeMode, setThemeMode],
  );
  return (
    <AppThemeContext.Provider value={ctx}>
      <FinanceScreen />
    </AppThemeContext.Provider>
  );
}
