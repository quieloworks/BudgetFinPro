import * as React from "react";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeTokens } from "../theme/tokens";

type NativePickerProps = React.ComponentProps<typeof Picker>;

export type ThemedPickerProps = NativePickerProps & {
  C: ThemeTokens;
};

type PickerItemData = {
  label: string;
  value: string | number;
  enabled: boolean;
};

function parsePickerItems(children: ReactNode): PickerItemData[] {
  const out: PickerItemData[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const p = child.props as {
      label?: string;
      value?: string | number;
      enabled?: boolean;
    };
    if (typeof p.label !== "string") return;
    out.push({
      label: p.label,
      value: p.value as string | number,
      enabled: p.enabled !== false,
    });
  });
  return out;
}

function enhanceItems(children: ReactNode, C: ThemeTokens): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const ch = child as ReactElement<{
      label?: string;
      value?: string | number;
      color?: string;
      style?: StyleProp<TextStyle>;
    }>;
    const p = ch.props;
    if (typeof p.label !== "string") return child;

    return cloneElement(ch, {
      color: C.text,
    });
  });
}

const IOS = Platform.OS === "ios";

function AndroidWebPicker({
  C,
  children,
  selectedValue,
  onValueChange,
  enabled = true,
  style,
  prompt,
  accessibilityLabel,
  testID,
}: ThemedPickerProps) {
  const insets = useSafeAreaInsets();
  const items = parsePickerItems(children);
  const [open, setOpen] = React.useState(false);

  const selected =
    items.find((i) => i.value === selectedValue) ??
    items.find((i) => i.enabled !== false) ??
    items[0];
  const label = selected?.label ?? "—";

  const textStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontSize = textStyle?.fontSize ?? 16;

  if (!enabled) {
    const readLabel =
      items.find((i) => i.value === selectedValue)?.label ??
      (selectedValue != null && selectedValue !== ""
        ? String(selectedValue)
        : "—");
    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: "transparent",
            minHeight: 44,
            opacity: 1,
          },
        ]}
      >
        <Text
          style={{ flex: 1, color: C.text, fontSize }}
          numberOfLines={2}
        >
          {readLabel}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={!enabled}
        onPress={() => enabled && items.length > 0 && setOpen(true)}
        style={[
          styles.row,
          !enabled && styles.disabled,
          { backgroundColor: "transparent" },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: C.text,
            fontSize,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: C.overlay }]}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: C.bg2,
                borderColor: C.border,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {prompt ? (
              <Text
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 8,
                  fontSize: 12,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {prompt}
              </Text>
            ) : null}
            <ScrollView
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
            >
              {items.map((item, index) => {
                const sel = item.value === selectedValue;
                return (
                  <Pressable
                    key={String(item.label) + String(item.value)}
                    disabled={item.enabled === false}
                    onPress={() => {
                      onValueChange?.(item.value, index);
                      setOpen(false);
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: C.border,
                      backgroundColor: sel ? C.bg3 : C.bg2,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          item.enabled === false ? C.hint : C.text,
                        fontWeight: sel ? "600" : "400",
                        opacity: item.enabled === false ? 0.55 : 1,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * En iOS: Picker nativo + themeVariant.
 * En Android / web: lista en modal con colores del tema (el Spinner nativo ignora el modo oscuro).
 */
export function ThemedPicker({
  C,
  children,
  style,
  itemStyle,
  enabled = true,
  selectedValue,
  ...rest
}: ThemedPickerProps) {
  if (!IOS) {
    return (
      <AndroidWebPicker
        C={C}
        style={style}
        enabled={enabled}
        selectedValue={selectedValue}
        {...rest}
      >
        {children}
      </AndroidWebPicker>
    );
  }

  if (!enabled) {
    const items = parsePickerItems(children);
    const readLabel =
      items.find((i) => i.value === selectedValue)?.label ??
      (selectedValue != null && selectedValue !== ""
        ? String(selectedValue)
        : "—");
    const textStyle = StyleSheet.flatten(style) as TextStyle | undefined;
    const fontSize = textStyle?.fontSize ?? 16;
    return (
      <View
        style={[
          styles.row,
          { backgroundColor: "transparent", minHeight: 44 },
        ]}
      >
        <Text
          style={{ flex: 1, color: C.text, fontSize }}
          numberOfLines={2}
        >
          {readLabel}
        </Text>
      </View>
    );
  }

  const baseStyle: StyleProp<TextStyle> = [{ color: C.text }, style];
  const mergedItemStyle: StyleProp<TextStyle> = [{ color: C.text }, itemStyle];

  const platformProps = {
    themeVariant: C.isDark ? "dark" : "light",
  };

  return (
    <Picker
      {...(platformProps as NativePickerProps)}
      {...rest}
      enabled={enabled}
      selectedValue={selectedValue}
      style={baseStyle}
      itemStyle={mergedItemStyle}
    >
      {enhanceItems(children, C)}
    </Picker>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disabled: {
    opacity: 0.45,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
