import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors, typography } from "../src/theme/tokens";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontSize: typography.size.lg,
            fontWeight: typography.weight.bold,
            color: colors.textPrimary,
          },
          contentStyle: {
            backgroundColor: colors.canvas,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "NeoSchola",
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
