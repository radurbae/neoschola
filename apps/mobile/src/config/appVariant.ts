import { Role } from "@neoschola/shared";

export type AppVariant = "all" | "guardian" | "teacher" | "admin" | "staff";

export interface AppVariantConfig {
  id: AppVariant;
  appName: string;
  subtitle: string;
  allowedRoles: readonly Role[];
  wrongRoleMessage: string;
}

function parseAppVariant(raw?: string): AppVariant {
  const normalized = (raw || "").trim().toLowerCase();
  if (
    normalized === "guardian" ||
    normalized === "teacher" ||
    normalized === "admin" ||
    normalized === "staff"
  ) {
    return normalized;
  }
  return "all";
}

export const ACTIVE_APP_VARIANT: AppVariant = parseAppVariant(
  typeof process !== "undefined"
    ? process.env?.EXPO_PUBLIC_APP_VARIANT
    : undefined
);

export const APP_VARIANT_CONFIG: Record<AppVariant, AppVariantConfig> = {
  all: {
    id: "all",
    appName: "NeoSchola",
    subtitle: "SDN Nusantara Harapan",
    allowedRoles: [Role.GUARDIAN, Role.TEACHER, Role.ADMIN],
    wrongRoleMessage: "Peran akun tidak dikenali.",
  },
  guardian: {
    id: "guardian",
    appName: "NeoSchola Wali",
    subtitle: "Portal Orang Tua dan Wali Murid",
    allowedRoles: [Role.GUARDIAN],
    wrongRoleMessage:
      "Akun ini bukan akun Wali Murid. Gunakan aplikasi NeoSchola sesuai peran Anda.",
  },
  teacher: {
    id: "teacher",
    appName: "NeoSchola Guru",
    subtitle: "Portal Wali Kelas dan Pengajar",
    allowedRoles: [Role.TEACHER],
    wrongRoleMessage:
      "Akun ini bukan akun Guru. Gunakan aplikasi NeoSchola sesuai peran Anda.",
  },
  admin: {
    id: "admin",
    appName: "NeoSchola Admin",
    subtitle: "Portal Tata Usaha dan Keuangan",
    allowedRoles: [Role.ADMIN],
    wrongRoleMessage:
      "Akun ini bukan akun Admin TU. Gunakan aplikasi NeoSchola sesuai peran Anda.",
  },
  staff: {
    id: "staff",
    appName: "NeoSchola Staf",
    subtitle: "Portal Guru dan Tata Usaha",
    allowedRoles: [Role.TEACHER, Role.ADMIN],
    wrongRoleMessage:
      "Akun ini bukan akun Staf Sekolah. Gunakan aplikasi NeoSchola Wali.",
  },
};

export function getActiveVariantConfig(): AppVariantConfig {
  return APP_VARIANT_CONFIG[ACTIVE_APP_VARIANT];
}

export function isRoleAllowedInCurrentVariant(role: Role): boolean {
  return APP_VARIANT_CONFIG[ACTIVE_APP_VARIANT].allowedRoles.includes(role);
}

export function getHomeRouteForRole(role?: Role): "/(tabs)" | "/(staff)" {
  return role === Role.GUARDIAN ? "/(tabs)" : "/(staff)";
}

export function getProfileRouteForRole(
  role?: Role
): "/(tabs)/profil" | "/(staff)/profil" {
  return role === Role.GUARDIAN ? "/(tabs)/profil" : "/(staff)/profil";
}

export function getAnnouncementsRouteForRole(
  role?: Role
): "/pengumuman" | "/(staff)/pengumuman" {
  return role === Role.GUARDIAN ? "/pengumuman" : "/(staff)/pengumuman";
}
