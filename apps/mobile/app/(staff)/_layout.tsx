import React from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Role } from "@neoschola/shared";
import { useAuth } from "../../src/store/auth";
import { ResponsiveShell, ShellNavItem } from "../../src/components/ui";

export default function StaffTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const financeOrAcademicTitle = isAdmin ? "Keuangan" : "Akademik";

  const getActiveKey = () => {
    if (pathname.includes("/presensi")) return "presensi";
    if (pathname.includes("/izin")) return "izin";
    if (pathname.includes("/pengumuman")) return "pengumuman";
    if (pathname.includes("/keuangan")) return "keuangan";
    return "index";
  };

  const navItems: ShellNavItem[] = [
    {
      key: "index",
      label: "Ringkasan",
      accessibilityLabel: "Tab Ringkasan Staf",
      icon: "grid-outline",
      activeIcon: "grid",
      href: "/(staff)",
    },
    {
      key: "presensi",
      label: "Presensi",
      accessibilityLabel: "Tab Presensi Kelas",
      icon: "calendar-outline",
      activeIcon: "calendar",
      href: "/(staff)/presensi",
    },
    {
      key: "izin",
      label: "Izin",
      accessibilityLabel: "Tab Pengajuan Izin Siswa",
      icon: "document-text-outline",
      activeIcon: "document-text",
      href: "/(staff)/izin",
    },
    {
      key: "pengumuman",
      label: "Info",
      accessibilityLabel: "Tab Pengumuman Sekolah",
      icon: "megaphone-outline",
      activeIcon: "megaphone",
      href: "/(staff)/pengumuman",
    },
    {
      key: "keuangan",
      label: financeOrAcademicTitle,
      accessibilityLabel: `Tab ${financeOrAcademicTitle}`,
      icon: isAdmin ? "wallet-outline" : "school-outline",
      activeIcon: isAdmin ? "wallet" : "school",
      href: "/(staff)/keuangan",
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
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
        <Tabs.Screen name="index" options={{ title: "Ringkasan" }} />
        <Tabs.Screen name="presensi" options={{ title: "Presensi" }} />
        <Tabs.Screen name="izin" options={{ title: "Izin" }} />
        <Tabs.Screen name="pengumuman" options={{ title: "Info" }} />
        <Tabs.Screen
          name="keuangan"
          options={{ title: financeOrAcademicTitle }}
        />
        <Tabs.Screen
          name="pesan"
          options={{
            href: null,
            title: "Pesan Wali Murid",
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            href: null,
            title: "Profil Akun",
            tabBarItemStyle: { display: "none" },
          }}
        />
      </Tabs>
    </ResponsiveShell>
  );
}
