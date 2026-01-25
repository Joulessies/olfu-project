/**
 * Root Layout
 * OLFU-QC Commute Smart App
 *
 * Main application layout with navigation theming
 */

// Polyfills for Node.js modules (must be first!)
import "react-native-url-polyfill/auto";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, LogBox } from "react-native";
import { ClerkProvider } from "@clerk/clerk-expo";
import Colors from "../constants/colors";
import { clerkPublishableKey } from "../config/clerk";
import "react-native-reanimated";

// Suppress known library deprecation warnings
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
]);

// Custom OLFU theme
const OLFULightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: "#E0E0E0",
    notification: Colors.accent,
  },
};

const OLFUDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primaryLight,
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    border: "#333333",
    notification: Colors.accent,
  },
};

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ThemeProvider
        value={colorScheme === "dark" ? OLFUDarkTheme : OLFULightTheme}
      >
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
              headerStyle: {
                backgroundColor: Colors.primary,
              },
              headerTintColor: Colors.textOnPrimary,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkProvider>
  );
}
