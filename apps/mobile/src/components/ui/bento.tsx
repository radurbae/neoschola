import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  bento,
  breakpoints,
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";
import { Avatar } from "./shadcn";

// 1. ResponsiveShell

export interface ShellNavItem {
  key: string;
  label: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  href: string;
}

export interface ResponsiveShellProps {
  navItems: ShellNavItem[];
  activeKey: string;
  onSelect: (href: string) => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export function ResponsiveShell({
  navItems,
  activeKey,
  onSelect,
  onLogout,
  children,
}: ResponsiveShellProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  if (isTablet) {
    return (
      <View style={styles.tabletOuterFrame}>
        <View style={styles.tabletRail}>
          {/* Logo Badge Krem Atas */}
          <View style={styles.tabletBadgeContainer}>
            <Text style={styles.tabletBadgeText}>NS</Text>
          </View>

          {/* Navigasi Ikon Vertikal Tengah */}
          <View style={styles.tabletNavList}>
            {navItems.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => onSelect(item.href)}
                  style={[
                    styles.tabletNavButton,
                    isActive && styles.tabletNavButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={item.accessibilityLabel || item.label}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22}
                    color={
                      isActive
                        ? bento.obsidianForeground
                        : bento.obsidianMuted
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tombol Logout Bawah */}
          <TouchableOpacity
            onPress={onLogout}
            style={styles.tabletLogoutButton}
            accessibilityRole="button"
            accessibilityLabel="Keluar akun"
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={bento.obsidianMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Kanvas Putih Konten Kanan */}
        <View style={styles.tabletContentArea}>{children}</View>
      </View>
    );
  }

  // Tampilan Layar Ponsel (< 768px)
  const mobileNavItems = navItems.slice(0, 5);

  return (
    <View style={styles.mobileContainer}>
      <View style={styles.mobileContentArea}>{children}</View>

      {/* Floating Dark Bottom Dock */}
      <View style={styles.mobileDock}>
        {mobileNavItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onSelect(item.href)}
              style={styles.mobileDockButton}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.accessibilityLabel || item.label}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={22}
                color={
                  isActive
                    ? bento.obsidianForeground
                    : bento.obsidianMuted
                }
              />
              <View
                style={[
                  styles.mobileActiveDot,
                  isActive && styles.mobileActiveDotVisible,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// 2. TopUtilityBar

export interface TopUtilityBarProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  onPressNotifications?: () => void;
  unreadCount?: number;
  onPressAnnouncements?: () => void;
  profileName?: string;
  onPressProfile?: () => void;
}

export function TopUtilityBar({
  title,
  subtitle,
  leftAction,
  onPressNotifications,
  unreadCount = 0,
  onPressAnnouncements,
  profileName,
  onPressProfile,
}: TopUtilityBarProps) {
  const firstName = profileName ? profileName.trim().split(/\s+/)[0] : "Profil";

  return (
    <View style={styles.topUtilityBar}>
      <View style={styles.topUtilityLeft}>
        {Boolean(leftAction) && (
          <View style={styles.topUtilityLeftAction}>{leftAction}</View>
        )}
        <View style={styles.topUtilityTextGroup}>
          <Text style={styles.topUtilityTitle} numberOfLines={1}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text style={styles.topUtilitySubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.topUtilityRight}>
        {Boolean(onPressAnnouncements) && (
          <TouchableOpacity
            onPress={onPressAnnouncements}
            style={styles.utilityIconButton}
            accessibilityRole="button"
            accessibilityLabel="Pengumuman sekolah"
            activeOpacity={0.7}
          >
            <Ionicons
              name="megaphone-outline"
              size={20}
              color={shadcn.foreground}
            />
          </TouchableOpacity>
        )}

        {Boolean(onPressNotifications) && (
          <TouchableOpacity
            onPress={onPressNotifications}
            style={styles.utilityIconButton}
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={shadcn.foreground}
            />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        )}

        {(Boolean(profileName) || Boolean(onPressProfile)) && (
          <TouchableOpacity
            onPress={onPressProfile}
            style={styles.profilePill}
            accessibilityRole="button"
            accessibilityLabel="Profil pengguna"
            activeOpacity={0.7}
            disabled={!onPressProfile}
          >
            <Avatar name={profileName || "User"} size="sm" />
            <Text style={styles.profilePillName} numberOfLines={1}>
              {firstName}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={bento.pastelMutedText}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// 3. PastelStatCard

export interface PastelStatCardProps {
  tone: "iceBlue" | "lavender" | "mint" | "butter";
  value: string;
  label: string;
  trendText?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function PastelStatCard({
  tone,
  value,
  label,
  trendText,
  icon,
  onPress,
  accessibilityLabel,
  style,
}: PastelStatCardProps) {
  const getToneBackground = () => {
    switch (tone) {
      case "iceBlue":
        return bento.iceBlue;
      case "lavender":
        return bento.lavender;
      case "mint":
        return bento.mint;
      case "butter":
        return bento.butter;
    }
  };

  const getTrendTextColor = () => {
    switch (tone) {
      case "iceBlue":
        return bento.iceBlueText;
      case "lavender":
        return bento.lavenderText;
      case "mint":
        return bento.mintText;
      case "butter":
        return bento.butterText;
    }
  };

  const content = (
    <View
      style={[
        styles.statCardContainer,
        { backgroundColor: getToneBackground() },
        style,
      ]}
    >
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>

      <View style={styles.statCardBottomRow}>
        <View style={styles.statCardIconBox}>
          <Ionicons name={icon} size={18} color={shadcn.foreground} />
        </View>
        {Boolean(trendText) && (
          <Text
            style={[
              styles.statCardTrendText,
              { color: getTrendTextColor() },
            ]}
          >
            {trendText}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        activeOpacity={0.7}
        style={styles.statCardTouchWrapper}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// 4. MiniTrendChart

export interface TrendPoint {
  label: string;
  value: number;
}

export interface PeriodOption {
  key: string;
  label: string;
}

export interface MiniTrendChartProps {
  heroValue: string;
  heroLabel: string;
  calloutText?: string;
  points: TrendPoint[];
  periods?: PeriodOption[];
  activePeriod?: string;
  onPeriodChange?: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function MiniTrendChart({
  heroValue,
  heroLabel,
  calloutText,
  points,
  periods,
  activePeriod,
  onPeriodChange,
  style,
}: MiniTrendChartProps) {
  const maxValue = Math.max(...points.map((p) => p.value), 1);

  return (
    <View style={[styles.trendCard, style]}>
      {/* Header Nilai Hero & Callout */}
      <View style={styles.trendHeader}>
        <View style={styles.trendHeroGroup}>
          <Text style={styles.trendHeroValue}>{heroValue}</Text>
          <Text style={styles.trendHeroLabel}>{heroLabel}</Text>
        </View>

        {Boolean(calloutText) && (
          <View style={styles.trendCalloutPill}>
            <Text style={styles.trendCalloutText}>{calloutText}</Text>
          </View>
        )}
      </View>

      {/* Area Sparkline Bar Pure React Native View */}
      <View style={styles.sparklineContainer}>
        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          const barHeight = Math.max((point.value / maxValue) * 44, 4);

          return (
            <View key={point.label + index} style={styles.sparklineBarColumn}>
              <View
                style={[
                  styles.sparklineBar,
                  {
                    height: barHeight,
                    backgroundColor: isLast
                      ? bento.iceBlueActive
                      : bento.iceBlueBar,
                  },
                ]}
              />
              <Text style={styles.sparklineBarLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Baris Period Switcher */}
      {Boolean(periods && periods.length > 0) && (
        <View style={styles.periodSwitcherRow}>
          {periods?.map((period) => {
            const isActive = period.key === activePeriod;
            return (
              <TouchableOpacity
                key={period.key}
                onPress={() => onPeriodChange?.(period.key)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[
                  styles.periodButton,
                  isActive
                    ? styles.periodButtonActive
                    : styles.periodButtonInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={period.label}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    isActive
                      ? styles.periodButtonTextActive
                      : styles.periodButtonTextInactive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// 5. DarkActionCard

export interface DarkActionCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DarkActionCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  onPress,
  style,
}: DarkActionCardProps) {
  return (
    <View style={[styles.darkActionCard, style]}>
      {/* Aksen 2 Garis Geometris Sudut Kanan Bawah */}
      <View pointerEvents="none" style={styles.darkActionAccentOne} />
      <View pointerEvents="none" style={styles.darkActionAccentTwo} />

      {/* Opsional Pill Outline Eyebrow */}
      {Boolean(eyebrow) && (
        <View style={styles.darkActionEyebrowContainer}>
          <Text style={styles.darkActionEyebrowText}>{eyebrow}</Text>
        </View>
      )}

      {/* Judul & Deskripsi */}
      <Text style={styles.darkActionTitle}>{title}</Text>
      <Text style={styles.darkActionDescription}>{description}</Text>

      {/* Tombol Pill CTA */}
      <TouchableOpacity
        onPress={onPress}
        style={styles.darkActionCtaButton}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        activeOpacity={0.8}
      >
        <Text style={styles.darkActionCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// 6. DarkIconRow

export interface DarkIconRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightPrimary?: string;
  rightSecondary?: string;
  rightSecondaryTone?: "success" | "danger" | "warning" | "info" | "neutral";
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function DarkIconRow({
  icon,
  title,
  subtitle,
  rightPrimary,
  rightSecondary,
  rightSecondaryTone = "neutral",
  onPress,
  accessibilityLabel,
}: DarkIconRowProps) {
  const getRightSecondaryColor = () => {
    switch (rightSecondaryTone) {
      case "success":
        return shadcn.status.success.text;
      case "danger":
        return shadcn.status.danger.text;
      case "warning":
        return shadcn.status.warning.text;
      case "info":
        return shadcn.status.info.text;
      case "neutral":
      default:
        return bento.pastelMutedText;
    }
  };

  const rowContent = (
    <View style={styles.iconRowContent}>
      {/* Kotak Ikon Gelap Kiri */}
      <View style={styles.iconRowBox}>
        <Ionicons name={icon} size={20} color={bento.obsidianForeground} />
      </View>

      {/* Judul dan Subjudul Tengah */}
      <View style={styles.iconRowMiddle}>
        <Text style={styles.iconRowTitle} numberOfLines={1}>
          {title}
        </Text>
        {Boolean(subtitle) && (
          <Text style={styles.iconRowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Informasi Kanan */}
      {(Boolean(rightPrimary) || Boolean(rightSecondary)) && (
        <View style={styles.iconRowRight}>
          {Boolean(rightPrimary) && (
            <Text style={styles.iconRowRightPrimary}>{rightPrimary}</Text>
          )}
          {Boolean(rightSecondary) && (
            <Text
              style={[
                styles.iconRowRightSecondary,
                { color: getRightSecondaryColor() },
              ]}
            >
              {rightSecondary}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.iconRowTouchContainer}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        activeOpacity={0.7}
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.iconRowContainer}>{rowContent}</View>;
}

// Stylesheet

const styles = StyleSheet.create({
  // ResponsiveShell Tablet
  tabletOuterFrame: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: bento.obsidian,
    padding: 10,
  },
  tabletRail: {
    width: 64,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  tabletBadgeContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: bento.creamBadge,
    alignItems: "center",
    justifyContent: "center",
  },
  tabletBadgeText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: bento.obsidian,
  },
  tabletNavList: {
    alignItems: "center",
    gap: spacing.sm,
  },
  tabletNavButton: {
    width: 44,
    height: 44,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabletNavButtonActive: {
    backgroundColor: bento.obsidianHover,
  },
  tabletLogoutButton: {
    width: 44,
    height: 44,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabletContentArea: {
    flex: 1,
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    overflow: "hidden",
  },

  // ResponsiveShell Mobile
  mobileContainer: {
    flex: 1,
    backgroundColor: bento.surface,
  },
  mobileContentArea: {
    flex: 1,
  },
  mobileDock: {
    backgroundColor: bento.obsidian,
    borderRadius: radius.xxl,
    height: 60,
    marginHorizontal: 14,
    marginBottom: Platform.OS === "ios" ? 18 : 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.sm,
  },
  mobileDockButton: {
    width: 44,
    height: 44,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginTop: 2,
  },
  mobileActiveDotVisible: {
    backgroundColor: bento.iceBlueCta,
  },

  // TopUtilityBar
  topUtilityBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: bento.surface,
    minHeight: 56,
  },
  topUtilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.md,
  },
  topUtilityLeftAction: {
    marginRight: spacing.sm,
  },
  topUtilityTextGroup: {
    flex: 1,
  },
  topUtilityTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
    color: shadcn.foreground,
  },
  topUtilitySubtitle: {
    fontSize: 13,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  topUtilityRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  utilityIconButton: {
    width: 44,
    height: 44,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    borderRadius: radius.full,
    backgroundColor: bento.pillSurface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: shadcn.destructive,
    position: "absolute",
    top: 10,
    right: 10,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: bento.pillSurface,
    borderRadius: radius.full,
    minHeight: touchTarget.minHeight,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profilePillName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginHorizontal: 6,
    maxWidth: 90,
  },

  // PastelStatCard
  statCardTouchWrapper: {
    minHeight: touchTarget.minHeight,
  },
  statCardContainer: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 0,
  },
  statCardValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  statCardLabel: {
    fontSize: 13,
    color: bento.pastelMutedText,
    marginTop: 4,
  },
  statCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  statCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: bento.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardTrendText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    fontVariant: ["tabular-nums"],
  },

  // MiniTrendChart
  trendCard: {
    backgroundColor: bento.iceBlue,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 0,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  trendHeroGroup: {
    flex: 1,
  },
  trendHeroValue: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  trendHeroLabel: {
    fontSize: 13,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  trendCalloutPill: {
    backgroundColor: bento.obsidian,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trendCalloutText: {
    color: bento.obsidianForeground,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    fontVariant: ["tabular-nums"],
  },
  sparklineContainer: {
    height: 64,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginVertical: spacing.lg,
  },
  sparklineBarColumn: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  sparklineBar: {
    width: 14,
    borderRadius: radius.sm,
  },
  sparklineBarLabel: {
    fontSize: 10,
    color: bento.pastelMutedText,
    marginTop: 4,
    textAlign: "center",
  },
  periodSwitcherRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  periodButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: bento.obsidian,
  },
  periodButtonInactive: {
    backgroundColor: bento.pillSurface,
  },
  periodButtonText: {
    fontSize: typography.size.xs,
  },
  periodButtonTextActive: {
    color: bento.obsidianForeground,
    fontWeight: typography.weight.semibold,
  },
  periodButtonTextInactive: {
    color: bento.pastelMutedText,
    fontWeight: typography.weight.medium,
  },

  // DarkActionCard
  darkActionCard: {
    backgroundColor: bento.obsidian,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  darkActionAccentOne: {
    position: "absolute",
    right: -30,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: bento.obsidianBorder,
  },
  darkActionAccentTwo: {
    position: "absolute",
    right: -50,
    bottom: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: bento.obsidianBorder,
  },
  darkActionEyebrowContainer: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: bento.obsidianForeground,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  darkActionEyebrowText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: bento.obsidianForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  darkActionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: bento.obsidianForeground,
    letterSpacing: -0.3,
  },
  darkActionDescription: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: bento.obsidianMuted,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  darkActionCtaButton: {
    backgroundColor: bento.iceBlueCta,
    borderRadius: radius.full,
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  darkActionCtaText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },

  // DarkIconRow
  iconRowTouchContainer: {
    minHeight: 56,
    justifyContent: "center",
  },
  iconRowContainer: {
    minHeight: 56,
    justifyContent: "center",
  },
  iconRowContent: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  iconRowBox: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: bento.obsidian,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRowMiddle: {
    flex: 1,
    flexShrink: 1,
    marginLeft: spacing.md,
  },
  iconRowTitle: {
    fontSize: 15,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  iconRowSubtitle: {
    fontSize: 13,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  iconRowRight: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
  },
  iconRowRightPrimary: {
    fontSize: 15,
    fontWeight: typography.weight.semibold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  iconRowRightSecondary: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});
