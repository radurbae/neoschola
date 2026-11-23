import React from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { ResponsiveShell, type ShellNavItem } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const getActiveKey = (): string => {
    if (pathname.includes("presensi")) return "presensi";
    if (pathname.includes("akademik")) return "akademik";
    if (pathname.includes("pesan")) return "pesan";
    if (pathname.includes("keuangan")) return "keuangan";
    return "index";
  };

  const navItems: ShellNavItem[] = [
    {
      key: "index",
      label: "Beranda",
      accessibilityLabel: "Tab Beranda",
      icon: "home-outline",
      activeIcon: "home",
      href: "/(tabs)",
    },
    {
      key: "presensi",
      label: "Presensi",
      accessibilityLabel: "Tab Presensi",
      icon: "calendar-outline",
      activeIcon: "calendar",
      href: "/(tabs)/presensi",
    },
    {
      key: "akademik",
      label: "Akademik",
      accessibilityLabel: "Tab Akademik",
      icon: "book-outline",
      activeIcon: "book",
      href: "/(tabs)/akademik",
    },
    {
      key: "pesan",
      label: "Pesan",
      accessibilityLabel: "Tab Pesan",
      icon: "chatbubbles-outline",
      activeIcon: "chatbubbles",
      href: "/(tabs)/pesan",
    },
    {
      key: "keuangan",
      label: "Keuangan",
      accessibilityLabel: "Tab Keuangan",
      icon: "wallet-outline",
      activeIcon: "wallet",
      href: "/(tabs)/keuangan",
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  return (
    <ResponsiveShell
      navItems={navItems}
      activeKey={getActiveKey()}
      onSelect={(href) => router.push(href as any)}
      onLogout={handleLogout}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          animation: "fade",
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="presensi" />
        <Tabs.Screen name="akademik" />
        <Tabs.Screen name="pesan" />
        <Tabs.Screen name="keuangan" />
        <Tabs.Screen
          name="profil"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ResponsiveShell>
  );
}
