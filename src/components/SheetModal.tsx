import type { ReactNode } from "react";
import { useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal as RNModal,
  Animated,
  useWindowDimensions,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";

/** Drag past this distance to dismiss (points). */
const DISMISS_DRAG_PX = 72;
/** Downward flick velocity threshold (px/s, RNGH). */
const DISMISS_VELOCITY_PX_S = 520;
const OFF_SCREEN = 720;

type SheetModalProps = {
  onClose: () => void;
  children: ReactNode;
  height?: string;
  title?: string;
};

/** RN native often ignores `vh`; map to px so the sheet and flex children get a real height. */
function sheetCapPx(
  heightProp: string | undefined,
  windowHeight: number,
): number {
  const fallback = Math.round(windowHeight * 0.9);
  if (heightProp == null || heightProp === "") return fallback;
  const h = String(heightProp).trim();
  const vh = /^([\d.]+)\s*vh$/i.exec(h);
  if (vh)
    return Math.round(windowHeight * (Math.min(100, parseFloat(vh[1])) / 100));
  const pct = /^([\d.]+)\s*%$/.exec(h);
  if (pct)
    return Math.round(windowHeight * (Math.min(100, parseFloat(pct[1])) / 100));
  return fallback;
}

export const SheetModal = ({
  onClose,
  children,
  height,
  title,
}: SheetModalProps) => {
  const { C } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** El modal a pantalla completa cubre la barra de tabs; solo respetar safe area (home indicator). */
  const sheetPadBottom = Math.max(16, insets.bottom + 16);
  const capPx = sheetCapPx(height, windowHeight);
  /**
   * No mover ni encoger el sheet al abrir el teclado: si el sheet sube o cambia de alto,
   * la barra de tipo y el monto “saltan” y el foco se pierde. El teclado queda encima del
   * borde inferior; el contenido superior sigue igual (como un layout fijo + teclado abajo).
   */
  const sheetHeight = capPx;

  const translateY = useRef(new Animated.Value(0)).current;
  const swipeDismissComplete = useRef(false);

  const handlePanGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(6)
        .failOffsetX([-48, 48])
        .onStart(() => {
          translateY.stopAnimation();
        })
        .onUpdate((e) => {
          const ty = e.translationY;
          translateY.setValue(ty > 0 ? ty : 0);
        })
        .onEnd((e) => {
          const ty = e.translationY;
          const vy = e.velocityY;
          const drop =
            ty > DISMISS_DRAG_PX || vy > DISMISS_VELOCITY_PX_S;
          if (drop) {
            Animated.timing(translateY, {
              toValue: OFF_SCREEN,
              duration: 220,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (!finished || swipeDismissComplete.current) return;
              swipeDismissComplete.current = true;
              // Do not reset translateY here: setValue(0) would snap the sheet
              // back on screen for a frame before unmount → "double modal" flash.
              onClose();
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
            }).start();
          }
        }),
    [onClose, translateY],
  );

  return (
    <RNModal visible animationType="slide" transparent onRequestClose={onClose}>
      {/* Modal renders outside the app root; GH needs its own root for gestures. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: C.overlay }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: C.bg2,
              borderTopLeftRadius: C.sheetRadius,
              borderTopRightRadius: C.sheetRadius,
              borderWidth: 1,
              borderColor: C.border,
              borderBottomWidth: 0,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: sheetPadBottom,
              height: sheetHeight,
              maxHeight: sheetHeight,
              width: "100%",
              transform: [{ translateY }],
            }}
          >
            <GestureDetector gesture={handlePanGesture}>
              <View
                style={{
                  alignItems: "center",
                  marginBottom: 10,
                  paddingVertical: 8,
                  flexShrink: 0,
                }}
              >
                <View
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 56,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: C.hint,
                    }}
                  />
                </View>
              </View>
            </GestureDetector>
            {title ? (
              <Text
                style={{
                  fontSize: TY.title,
                  fontWeight: "600",
                  color: C.text,
                  marginBottom: 20,
                  flexShrink: 0,
                }}
              >
                {title}
              </Text>
            ) : null}
            <View style={{ flex: 1, minHeight: 0, width: "100%" }}>
              {children}
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </RNModal>
  );
};
