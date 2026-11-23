/**
 * NeoSchola Design System Tokens
 * Berbasis ui.shadcn.com (Zinc Base / New York Style)
 * Memenuhi rasio kontras WCAG 2.1 AA (minimal 4.5:1) dan tap target minimal 44pt.
 */

export const shadcn = {
  background: "#FFFFFF",
  canvas: "#FAFAFA",
  foreground: "#09090B",
  card: "#FFFFFF",
  cardForeground: "#09090B",
  popover: "#FFFFFF",
  popoverForeground: "#09090B",
  primary: "#18181B",
  primaryPressed: "#27272A",
  primaryForeground: "#FAFAFA",
  secondary: "#F4F4F5",
  secondaryPressed: "#E4E4E7",
  secondaryForeground: "#18181B",
  muted: "#F4F4F5",
  mutedForeground: "#52525B",
  accent: "#F4F4F5",
  accentForeground: "#18181B",
  destructive: "#DC2626",
  destructivePressed: "#B91C1C",
  destructiveForeground: "#FAFAFA",
  border: "#E4E4E7",
  input: "#E4E4E7",
  ring: "#18181B",
  status: {
    success: {
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
    },
    warning: {
      bg: "#FFFBEB",
      text: "#92400E",
      border: "#FDE68A",
    },
    info: {
      bg: "#EFF6FF",
      text: "#1D4ED8",
      border: "#BFDBFE",
    },
    danger: {
      bg: "#FEF2F2",
      text: "#B91C1C",
      border: "#FECACA",
    },
    neutral: {
      bg: "#F4F4F5",
      text: "#3F3F46",
      border: "#E4E4E7",
    },
  },
} as const;

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: "#09090B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#09090B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

export const colors = {
  // Kanvas dan Permukaan
  canvas: shadcn.canvas,
  card: shadcn.card,
  cardSecondary: shadcn.secondary,
  border: shadcn.border,
  borderFocus: shadcn.primary,
  modalHandle: "#D4D4D8",

  // Identitas Monokrom Zinc
  primary: shadcn.primary,
  primaryPressed: shadcn.primaryPressed,
  primarySoft: shadcn.secondary,

  // Teks dan Hierarki
  textPrimary: shadcn.foreground,
  textSecondary: shadcn.mutedForeground,
  textMuted: "#71717A",
  textInverse: shadcn.primaryForeground,
  textInverseMuted: "#A1A1AA",

  // Status Badges dan Semantic Chips (Teks ke background >= 4.5:1)
  badge: {
    success: shadcn.status.success,
    warning: shadcn.status.warning,
    info: shadcn.status.info,
    danger: shadcn.status.danger,
    neutral: shadcn.status.neutral,
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
  md: 8,
  lg: 12,
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
  tracking: {
    tight: -0.4,
    snug: -0.2,
    normal: 0,
  },
} as const;

export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
} as const;
