import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { Role } from "@neoschola/shared";
import { useAuth } from "../../src/store/auth";
import { colors, typography } from "../../src/theme/tokens";

export default function StaffTabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const financeOrAcademicTitle = isAdmin ? "Keuangan" : "Akademik";

  return (
    <Tabs
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
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weight.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ringkasan",
          tabBarLabel: "Ringkasan",
          tabBarAccessibilityLabel: "Tab Ringkasan Staf",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
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
          tabBarAccessibilityLabel: "Tab Presensi Kelas",
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
        name="izin"
        options={{
          title: "Izin",
          tabBarLabel: "Izin",
          tabBarAccessibilityLabel: "Tab Pengajuan Izin Siswa",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "document-text" : "document-text-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pengumuman"
        options={{
          title: "Info",
          tabBarLabel: "Info",
          tabBarAccessibilityLabel: "Tab Pengumuman Sekolah",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "megaphone" : "megaphone-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="keuangan"
        options={{
          title: financeOrAcademicTitle,
          tabBarLabel: financeOrAcademicTitle,
          tabBarAccessibilityLabel: `Tab ${financeOrAcademicTitle}`,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                isAdmin
                  ? focused
                    ? "wallet"
                    : "wallet-outline"
                  : focused
                  ? "school"
                  : "school-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Pesan disembunyikan dari tab bar bawah agar maksimal 5 tab lega di layar 360px */}
      <Tabs.Screen
        name="pesan"
        options={{
          href: null,
          title: "Pesan Wali Murid",
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
