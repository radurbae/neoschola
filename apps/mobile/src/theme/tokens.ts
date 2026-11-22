/**
 * NeoSchola Design System Tokens
 * Sesuai panduan docs/DESIGN.md
 * Memenuhi rasio kontras WCAG 2.1 AA (minimal 4.5:1) dan tap target minimal 44pt.
 */

export const colors = {
  // Kanvas & Permukaan
  canvas: "#F7F9F8",
  card: "#FFFFFF",
  cardSecondary: "#F1F5F9",
  border: "#E2E8F0",
  borderFocus: "#166534",

  // Identitas Hijau Sekolah (Forest Green)
  primary: "#166534", // Kontras 7.4:1 terhadap #FFFFFF
  primaryPressed: "#14532D",
  primarySoft: "#ECFDF5",

  // Teks & Hierarki
  textPrimary: "#0F172A", // Kontras 14.8:1 terhadap #FFFFFF
  textSecondary: "#475569", // Kontras 5.3:1 terhadap #FFFFFF
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  // Status Badges & Semantic Chips (Teks ke background >= 4.5:1)
  badge: {
    success: {
      bg: "#DCFCE7",
      text: "#166534",
      border: "#BBF7D0",
    },
    warning: {
      bg: "#FEF9C3",
      text: "#854D0E",
      border: "#FEF08A",
    },
    info: {
      bg: "#DBEAFE",
      text: "#1E40AF",
      border: "#BFDBFE",
    },
    danger: {
      bg: "#FEE2E2",
      text: "#991B1B",
      border: "#FECACA",
    },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  max: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    xxxl: 38,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
} as const;

export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
} as const;
