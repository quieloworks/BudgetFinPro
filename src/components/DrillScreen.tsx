import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight } from "../hooks/useKeyboardFormScrollPadding";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";

type DrillScreenProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  action?: ReactNode;
};

/** Colchón bajo el contenido cuando el teclado está visible (barra sugerencias / margen). */
const DRILL_SCROLL_KEYBOARD_EXTRA = 56;

/** Ref al TextInput nativo (o componente que delegue al host). */
export type DrillTextInputRef = { current: unknown } | null | undefined;

type ScrollToInputFn = (inputRef: DrillTextInputRef) => void;

const DrillScrollToInputContext = createContext<ScrollToInputFn>(() => {});

/** Desplaza el ScrollView del drill para mantener el campo enfocado encima del teclado. */
export function useDrillScrollToInput(): ScrollToInputFn {
  return useContext(DrillScrollToInputContext);
}

export const DrillScreen = ({
  title,
  onBack,
  children,
  action,
}: DrillScreenProps) => {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const kbH = useKeyboardHeight();
  const baseBottom = Math.max(24, insets.bottom + 16);
  /**
   * Con windowSoftInputMode adjustNothing (Android) el teclado cubre la vista: padding
   * inferior ~altura del teclado para poder hacer scroll hasta el TextInput.
   */
  const kbPad = useMemo(() => {
    if (kbH <= 0) {
      return { paddingTop: 18, paddingBottom: baseBottom };
    }
    return {
      paddingTop: 18,
      paddingBottom:
        baseBottom + Math.ceil(kbH) + DRILL_SCROLL_KEYBOARD_EXTRA,
    };
  }, [kbH, baseBottom]);

  const scrollViewRef = useRef(null);

  const scrollToInput = useCallback((inputRef) => {
    const sv = scrollViewRef.current;
    const el = inputRef?.current;
    if (!sv || el == null) return;
    const fn = sv.scrollResponderScrollNativeHandleToKeyboard;
    if (typeof fn !== "function") return;
    requestAnimationFrame(() => {
      try {
        fn.call(sv, el, 32, false);
      } catch {
        /* noop */
      }
    });
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        backgroundColor: C.bg,
        flexDirection: "column",
      }}
    >
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: C.bg2,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 16,
            paddingHorizontal: 18,
          }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            style={{ minWidth: 48, minHeight: 48, justifyContent: "center" }}
          >
            <Text
              style={{
                color: C.text,
                fontSize: TY.drillChevron,
                fontWeight: "300",
              }}
            >
              &#8249;
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: TY.title,
              fontWeight: "600",
              flex: 1,
              color: C.text,
              marginRight: 8,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: kbPad.paddingTop,
            paddingBottom: kbPad.paddingBottom,
          }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          automaticallyAdjustKeyboardInsets
        >
          <DrillScrollToInputContext.Provider value={scrollToInput}>
            {children}
          </DrillScrollToInputContext.Provider>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
