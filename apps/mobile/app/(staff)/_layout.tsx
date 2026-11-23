import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { Role } from "@neoschola/shared";
import { useAuth } from "../../src/store/auth";
import { shadcn, typography } from "../../src/theme/tokens";

export default function StaffTabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const financeOrAcademicTitle = isAdmin ? "Keuangan" : "Akademik";

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
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: shadcn.foreground,
        tabBarInactiveTintColor: shadcn.mutedForeground,
        tabBarStyle: {
          backgroundColor: shadcn.background,
          borderTopColor: shadcn.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 60,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
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
