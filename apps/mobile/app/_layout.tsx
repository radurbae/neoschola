import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Role } from "@neoschola/shared";
import { AuthProvider, useAuth } from "../src/store/auth";
import { colors } from "../src/theme/tokens";

function RootNavigator() {
  const { user, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const firstSegment = segments[0];

    if (!user && firstSegment && firstSegment !== "login") {
      router.replace("/login");
      return;
    }

    if (user && firstSegment === "login") {
      router.replace(user.role === Role.GUARDIAN ? "/(tabs)" : "/(staff)");
      return;
    }

    if (user && user.role === Role.GUARDIAN && firstSegment === "(staff)") {
      router.replace("/(tabs)");
      return;
    }

    if (user && user.role !== Role.GUARDIAN && firstSegment === "(tabs)") {
      router.replace("/(staff)");
    }
  }, [isReady, user, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.canvas,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="pengumuman" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
