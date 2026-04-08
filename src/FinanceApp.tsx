import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nextProvider } from "react-i18next";
import { AppThemeContext, type ThemeMode } from "./theme/ThemeContext";
import { T_DARK, T_LIGHT, type ThemeTokens } from "./theme/tokens";
import { THEME_STORAGE_KEY, LANGUAGE_STORAGE_KEY } from "./constants/storage";
import { isSupportedLocale } from "./constants/languages";
import { i18n, setAppLanguage } from "./i18n/i18n";
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
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (isSupportedLocale(s)) setAppLanguage(s);
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
    <I18nextProvider i18n={i18n}>
      <AppThemeContext.Provider value={ctx}>
        <FinanceScreen />
      </AppThemeContext.Provider>
    </I18nextProvider>
  );
}
