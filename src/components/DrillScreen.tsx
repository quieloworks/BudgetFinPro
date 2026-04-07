import type { ReactNode } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeContext";
import { TY } from "../theme/typography";

type DrillScreenProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  action?: ReactNode;
};

export const DrillScreen = ({
  title,
  onBack,
  children,
  action,
}: DrillScreenProps) => {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
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
      <GHScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: Math.max(24, insets.bottom + 16),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        nestedScrollEnabled
      >
        {children}
      </GHScrollView>
    </View>
  );
};
