import { View, Text, Pressable, Modal as RNModal } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";

type ConfirmProps = {
  msg: string;
  onYes: () => void;
  onNo: () => void;
  confirmLabel?: string;
};

export const Confirm = ({ msg, onYes, onNo, confirmLabel }: ConfirmProps) => {
  const { t } = useTranslation();
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pad = Math.max(20, 12 + insets.top, 12 + insets.bottom);
  return (
    <RNModal visible animationType="fade" transparent onRequestClose={onNo}>
      <Pressable
        onPress={onNo}
        style={{
          flex: 1,
          backgroundColor: C.overlay,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingVertical: pad,
        }}
      >
        <View
          style={{
            backgroundColor: C.bg2,
            borderWidth: 1,
            borderColor: C.redBorder,
            borderRadius: C.cardRadius,
            padding: 26,
            width: "100%",
            maxWidth: 340,
          }}
        >
          <Text
            style={{
              fontSize: TY.body,
              color: C.text,
              marginBottom: 22,
              lineHeight: Math.round(TY.body * 1.45),
            }}
          >
            {msg}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onNo}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.bg3,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: C.muted,
                  fontSize: TY.body,
                }}
              >
                {t("confirm.cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onYes}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: C.red,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#FFFFFF",
                  fontSize: TY.body,
                  fontWeight: "600",
                }}
              >
                {confirmLabel || t("confirm.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </RNModal>
  );
};
