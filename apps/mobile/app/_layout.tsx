import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
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
        animation: "fade",
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen
        name="notifications"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="pengumuman"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{ animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Muat font Plus Jakarta Sans tanpa menahan layar (fallback sistem jika belum siap)
  useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "neoschola-web-polish";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          html, body {
            font-family: 'PlusJakartaSans_400Regular', -apple-system, BlinkMacSystemFont, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            scroll-behavior: smooth;
          }
          div {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background-color: ${colors.modalHandle};
            border-radius: 9999px;
          }
          [role="button"], [role="tab"] {
            transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, opacity 180ms ease;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
