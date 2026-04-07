import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FinanceApp from "./src/FinanceApp";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FinanceApp />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
