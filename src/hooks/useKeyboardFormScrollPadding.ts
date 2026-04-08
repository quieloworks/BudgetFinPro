import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Slack simétrico (misma regla que el modal de transacción): arriba kb/2, abajo kb/4. */
export function formScrollPaddingFromKb(
  kbHeight: number,
  baseTop: number,
  baseBottom: number,
) {
  return {
    paddingTop: baseTop + Math.round(kbHeight / 2),
    paddingBottom: baseBottom + Math.round(kbHeight / 4),
  };
}

export function useKeyboardHeight() {
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEv =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEv =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEv, (e) =>
      setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEv, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return kbHeight;
}
