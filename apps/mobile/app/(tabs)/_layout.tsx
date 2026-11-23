import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { shadcn, typography } from "../../src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: shadcn.background,
        },
        headerTintColor: shadcn.foreground,
        headerTitleStyle: {
          fontSize: typography.size.base,
          fontWeight: typography.weight.semibold,
          color: shadcn.foreground,
          letterSpacing: typography.tracking.snug,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: shadcn.foreground,
        tabBarInactiveTintColor: shadcn.mutedForeground,
        tabBarStyle: {
          backgroundColor: shadcn.background,
          borderTopColor: shadcn.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 60,
          paddingBottom: Platform.OS === "ios" ? 24 : 6,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarLabel: "Beranda",
          tabBarAccessibilityLabel: "Tab Beranda",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="presensi"
        options={{
          title: "Presensi",
          tabBarLabel: "Presensi",
          tabBarAccessibilityLabel: "Tab Presensi",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="akademik"
        options={{
          title: "Akademik",
          tabBarLabel: "Akademik",
          tabBarAccessibilityLabel: "Tab Akademik",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pesan"
        options={{
          title: "Pesan",
          tabBarLabel: "Pesan",
          tabBarAccessibilityLabel: "Tab Pesan",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="keuangan"
        options={{
          title: "Keuangan",
          tabBarLabel: "Keuangan",
          tabBarAccessibilityLabel: "Tab Keuangan",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Profil disembunyikan dari bottom navigation agar maksimal 5 tab lega di layar 360px */}
      <Tabs.Screen
        name="profil"
        options={{
          href: null,
          title: "Profil Pengguna",
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
