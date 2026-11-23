import React from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  bento,
  breakpoints,
  layout,
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";
import { Avatar } from "./shadcn";
import { FadeSlideView, SpringPressable } from "./motion";

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
  const insets = useSafeAreaInsets();
  const isTablet = width >= breakpoints.tablet;

  if (isTablet) {
    return (
      <View style={styles.tabletOuterFrame}>
        <View style={styles.tabletRail}>
          <View style={styles.tabletBadgeContainer}>
            <Text style={styles.tabletBadgeText}>NS</Text>
          </View>

          <View style={styles.tabletNavList}>
            {navItems.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <SpringPressable
                  key={item.key}
                  onPress={() => onSelect(item.href)}
                  style={[
                    styles.tabletNavButton,
                    isActive && styles.tabletNavButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={item.accessibilityLabel || item.label}
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
                </SpringPressable>
              );
            })}
          </View>

          <SpringPressable
            onPress={onLogout}
            style={styles.tabletLogoutButton}
            accessibilityRole="button"
            accessibilityLabel="Keluar akun"
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={bento.obsidianMuted}
            />
          </SpringPressable>
        </View>

        <View style={styles.tabletContentArea}>
          <FadeSlideView transitionKey={activeKey} style={styles.fillArea}>
            {children}
          </FadeSlideView>
        </View>
      </View>
    );
  }

  const mobileNavItems = navItems.slice(0, 5);
  const dockBottom = Math.max(insets.bottom, 14);
  const contentInsets = { ...insets, top: 0 };

  return (
    <SafeAreaView edges={["top"]} style={styles.mobileContainer}>
      <SafeAreaInsetsContext.Provider value={contentInsets}>
        <View style={styles.mobileContentArea}>
          <FadeSlideView transitionKey={activeKey} style={styles.fillArea}>
            {children}
          </FadeSlideView>
        </View>
      </SafeAreaInsetsContext.Provider>

      <View style={[styles.mobileDock, { bottom: dockBottom }]}>
        {mobileNavItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <SpringPressable
              key={item.key}
              onPress={() => onSelect(item.href)}
              style={styles.mobileDockButton}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.accessibilityLabel || item.label}
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
            </SpringPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export interface TopUtilityBarProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  noHorizontalPadding?: boolean;
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
  noHorizontalPadding = false,
  onPressNotifications,
  unreadCount = 0,
  onPressAnnouncements,
  profileName,
  onPressProfile,
}: TopUtilityBarProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const firstName = profileName ? profileName.trim().split(/\s+/)[0] : "Profil";

  const dynamicBarPadding = {
    paddingHorizontal: noHorizontalPadding
      ? 0
      : isTablet
      ? layout.tabletPaddingX
      : layout.mobilePaddingX,
    paddingTop: isTablet ? 20 : 10,
    paddingBottom: 6,
    gap: 12,
  };

  return (
    <View style={[styles.topUtilityBar, dynamicBarPadding]}>
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
          <SpringPressable
            onPress={onPressAnnouncements}
            style={styles.utilityIconButton}
            accessibilityRole="button"
            accessibilityLabel="Pengumuman sekolah"
          >
            <Ionicons
              name="megaphone-outline"
              size={20}
              color={shadcn.foreground}
            />
          </SpringPressable>
        )}

        {Boolean(onPressNotifications) && (
          <SpringPressable
            onPress={onPressNotifications}
            style={styles.utilityIconButton}
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={shadcn.foreground}
            />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </SpringPressable>
        )}

        {(Boolean(profileName) || Boolean(onPressProfile)) && (
          <SpringPressable
            onPress={onPressProfile}
            style={styles.profilePill}
            accessibilityRole="button"
            accessibilityLabel="Profil pengguna"
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
          </SpringPressable>
        )}
      </View>
    </View>
  );
}

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

  if (onPress) {
    return (
      <SpringPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        style={[styles.statCardTouchWrapper, style]}
      >
        <View
          style={[
            styles.statCardContainer,
            styles.statCardFillInner,
            { backgroundColor: getToneBackground() },
          ]}
        >
          <View>
            <Text style={styles.statCardValue} numberOfLines={1}>
              {value}
            </Text>
            <Text style={styles.statCardLabel} numberOfLines={1}>
              {label}
            </Text>
          </View>

          <View style={styles.statCardBottomRow}>
            <View style={styles.statCardIconBox}>
              <Ionicons name={icon} size={18} color={shadcn.foreground} />
            </View>
            {Boolean(trendText) && (
              <Text
                numberOfLines={1}
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
      </SpringPressable>
    );
  }

  return (
    <View
      style={[
        styles.statCardContainer,
        { backgroundColor: getToneBackground() },
        style,
      ]}
    >
      <View>
        <Text style={styles.statCardValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statCardLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.statCardBottomRow}>
        <View style={styles.statCardIconBox}>
          <Ionicons name={icon} size={18} color={shadcn.foreground} />
        </View>
        {Boolean(trendText) && (
          <Text
            numberOfLines={1}
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
}

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

      <View style={styles.sparklineContainer}>
        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          const barHeight = Math.max((point.value / maxValue) * 52, 6);

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

      {Boolean(periods && periods.length > 0) && (
        <View style={styles.periodSwitcherRow}>
          {periods?.map((period) => {
            const isActive = period.key === activePeriod;
            return (
              <SpringPressable
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
              </SpringPressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export interface DarkActionCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DarkActionCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  onPress,
  compact = false,
  style,
}: DarkActionCardProps) {
  return (
    <View
      style={[
        styles.darkActionCard,
        compact && styles.darkActionCardCompact,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.darkActionAccentOne,
          compact && styles.darkActionAccentOneCompact,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.darkActionAccentTwo,
          compact && styles.darkActionAccentTwoCompact,
        ]}
      />

      <View>
        {Boolean(eyebrow) && (
          <View
            style={[
              styles.darkActionEyebrowContainer,
              compact && styles.darkActionEyebrowCompact,
            ]}
          >
            <Text style={styles.darkActionEyebrowText}>{eyebrow}</Text>
          </View>
        )}

        <Text
          numberOfLines={compact ? 2 : undefined}
          style={[
            styles.darkActionTitle,
            compact && styles.darkActionTitleCompact,
          ]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={compact ? 2 : undefined}
          style={[
            styles.darkActionDescription,
            compact && styles.darkActionDescriptionCompact,
          ]}
        >
          {description}
        </Text>
      </View>

      <SpringPressable
        onPress={onPress}
        style={[
          styles.darkActionCtaButton,
          compact && styles.darkActionCtaButtonCompact,
        ]}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.darkActionCtaText}>{ctaLabel}</Text>
      </SpringPressable>
    </View>
  );
}

export interface UrgentAnnouncementBannerProps {
  title: string;
  content: string;
  category: string;
  isUrgent?: boolean;
  dateLabel?: string;
  onPress: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}

export function UrgentAnnouncementBanner({
  title,
  content,
  category,
  isUrgent = false,
  dateLabel,
  onPress,
  onDismiss,
  style,
}: UrgentAnnouncementBannerProps) {
  const pillLabel = isUrgent ? "DARURAT" : category || "Terbaru";

  return (
    <View
      style={[
        styles.urgentBannerContainer,
        isUrgent
          ? styles.urgentBannerDark
          : styles.urgentBannerButter,
        style,
      ]}
    >
      <SpringPressable
        onPress={onPress}
        style={styles.urgentBannerMainPress}
        accessibilityRole="button"
        accessibilityLabel={`Buka pengumuman: ${title}`}
      >
        <View
          style={[
            styles.urgentBannerIconBox,
            isUrgent
              ? styles.urgentBannerIconBoxDark
              : styles.urgentBannerIconBoxLight,
          ]}
        >
          <Ionicons
            name={isUrgent ? "alert-circle-outline" : "megaphone-outline"}
            size={18}
            color={isUrgent ? bento.iceBlueCta : bento.butterText}
          />
        </View>

        <View style={styles.urgentBannerBody}>
          <View style={styles.urgentBannerTopRow}>
            <View
              style={[
                styles.urgentBannerPill,
                isUrgent
                  ? styles.urgentBannerPillUrgent
                  : styles.urgentBannerPillRecent,
              ]}
            >
              <Text
                style={[
                  styles.urgentBannerPillText,
                  isUrgent
                    ? styles.urgentBannerPillTextUrgent
                    : styles.urgentBannerPillTextRecent,
                ]}
              >
                {pillLabel}
              </Text>
            </View>
            {Boolean(dateLabel) && (
              <Text
                style={[
                  styles.urgentBannerDate,
                  isUrgent
                    ? styles.urgentBannerMutedDark
                    : styles.urgentBannerMutedLight,
                ]}
                numberOfLines={1}
              >
                {dateLabel}
              </Text>
            )}
          </View>

          <Text
            style={[
              styles.urgentBannerTitle,
              isUrgent
                ? styles.urgentBannerTitleDark
                : styles.urgentBannerTitleLight,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.urgentBannerContent,
              isUrgent
                ? styles.urgentBannerMutedDark
                : styles.urgentBannerMutedLight,
            ]}
            numberOfLines={2}
          >
            {content}
          </Text>

          <Text
            style={[
              styles.urgentBannerActionLink,
              isUrgent
                ? styles.urgentBannerActionDark
                : styles.urgentBannerActionLight,
            ]}
          >
            Baca selengkapnya
          </Text>
        </View>
      </SpringPressable>

      <SpringPressable
        onPress={onDismiss}
        style={styles.urgentBannerCloseBtn}
        accessibilityRole="button"
        accessibilityLabel="Tutup pengumuman"
      >
        <Ionicons
          name="close"
          size={18}
          color={isUrgent ? bento.obsidianForeground : shadcn.foreground}
        />
      </SpringPressable>
    </View>
  );
}

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
      <View style={styles.iconRowBox}>
        <Ionicons name={icon} size={20} color={bento.obsidianForeground} />
      </View>

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
      <SpringPressable
        onPress={onPress}
        style={styles.iconRowTouchContainer}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        {rowContent}
      </SpringPressable>
    );
  }

  return <View style={styles.iconRowContainer}>{rowContent}</View>;
}

const styles = StyleSheet.create({
  fillArea: {
    flex: 1,
  },
  tabletOuterFrame: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: bento.obsidian,
    padding: 16,
    gap: 12,
  },
  tabletRail: {
    width: 72,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
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
    fontFamily: typography.family.bold,
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

  mobileContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: bento.surface,
  },
  mobileContentArea: {
    flex: 1,
  },
  mobileDock: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 30,
    backgroundColor: bento.obsidian,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: bento.obsidianBorder,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    shadowColor: bento.obsidian,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
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
    backgroundColor: "transparent",
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
    fontFamily: typography.family.bold,
    letterSpacing: -0.5,
    color: shadcn.foreground,
  },
  topUtilitySubtitle: {
    fontSize: 13,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
    marginHorizontal: 6,
    maxWidth: 90,
  },

  // PastelStatCard
  statCardTouchWrapper: {
    minHeight: touchTarget.minHeight,
    flexShrink: 0,
  },
  statCardFillInner: {
    flex: 1,
    width: "100%",
  },
  statCardContainer: {
    minHeight: 164,
    padding: 20,
    justifyContent: "space-between",
    borderRadius: radius.xl,
    borderWidth: 0,
    flexShrink: 0,
  },
  statCardValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  statCardLabel: {
    fontSize: 13,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    marginLeft: spacing.sm,
    textAlign: "right",
  },

  // MiniTrendChart
  trendCard: {
    flex: 1,
    minHeight: 232,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: bento.iceBlue,
    borderRadius: radius.xxl,
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
    fontFamily: typography.family.bold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  trendHeroLabel: {
    fontSize: 13,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
    fontVariant: ["tabular-nums"],
  },
  sparklineContainer: {
    height: 76,
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
    width: 18,
    borderRadius: 6,
  },
  sparklineBarLabel: {
    fontSize: 10,
    fontFamily: typography.family.medium,
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
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
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
    fontFamily: typography.family.semibold,
  },
  periodButtonTextInactive: {
    color: bento.pastelMutedText,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
  },

  // DarkActionCard
  darkActionCard: {
    minHeight: 176,
    padding: 20,
    justifyContent: "space-between",
    backgroundColor: bento.obsidian,
    borderRadius: radius.xxl,
    overflow: "hidden",
    position: "relative",
  },
  darkActionCardCompact: {
    minHeight: undefined,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.xl,
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
  darkActionAccentOneCompact: {
    right: -24,
    bottom: -24,
    width: 84,
    height: 84,
    borderRadius: 42,
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
  darkActionAccentTwoCompact: {
    right: -38,
    bottom: -38,
    width: 120,
    height: 120,
    borderRadius: 60,
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
  darkActionEyebrowCompact: {
    marginBottom: 6,
  },
  darkActionEyebrowText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: bento.obsidianForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  darkActionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: bento.obsidianForeground,
    letterSpacing: -0.3,
  },
  darkActionTitleCompact: {
    fontSize: typography.size.base,
    lineHeight: 22,
  },
  darkActionDescription: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    lineHeight: typography.lineHeight.sm,
    color: bento.obsidianMuted,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  darkActionDescriptionCompact: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
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
  darkActionCtaButtonCompact: {
    paddingHorizontal: spacing.lg,
  },
  darkActionCtaText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
  },

  // UrgentAnnouncementBanner
  urgentBannerContainer: {
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  urgentBannerDark: {
    backgroundColor: bento.obsidian,
    borderWidth: 1,
    borderColor: bento.obsidianBorder,
  },
  urgentBannerButter: {
    backgroundColor: bento.butter,
    borderWidth: 0,
  },
  urgentBannerMainPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  urgentBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  urgentBannerIconBoxDark: {
    backgroundColor: bento.obsidianHover,
  },
  urgentBannerIconBoxLight: {
    backgroundColor: bento.surface,
  },
  urgentBannerBody: {
    flex: 1,
    gap: 3,
  },
  urgentBannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 1,
  },
  urgentBannerPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgentBannerPillUrgent: {
    backgroundColor: shadcn.destructive,
  },
  urgentBannerPillRecent: {
    backgroundColor: bento.surface,
  },
  urgentBannerPillText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  urgentBannerPillTextUrgent: {
    color: shadcn.destructiveForeground,
  },
  urgentBannerPillTextRecent: {
    color: bento.butterText,
  },
  urgentBannerDate: {
    fontSize: 11,
    fontFamily: typography.family.regular,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  urgentBannerTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
  },
  urgentBannerTitleDark: {
    color: bento.obsidianForeground,
  },
  urgentBannerTitleLight: {
    color: shadcn.foreground,
  },
  urgentBannerContent: {
    fontSize: 13,
    fontFamily: typography.family.regular,
    lineHeight: 18,
  },
  urgentBannerMutedDark: {
    color: bento.obsidianMuted,
  },
  urgentBannerMutedLight: {
    color: bento.pastelMutedText,
  },
  urgentBannerActionLink: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    marginTop: 2,
  },
  urgentBannerActionDark: {
    color: bento.iceBlueCta,
  },
  urgentBannerActionLight: {
    color: bento.butterText,
  },
  urgentBannerCloseBtn: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    minHeight: touchTarget.minHeight,
    marginTop: -6,
    marginRight: -6,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  // DarkIconRow
  iconRowTouchContainer: {
    minHeight: 64,
    justifyContent: "center",
  },
  iconRowContainer: {
    minHeight: 64,
    justifyContent: "center",
  },
  iconRowContent: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
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
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
  },
  iconRowSubtitle: {
    fontSize: 13,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
    fontVariant: ["tabular-nums"],
    color: shadcn.foreground,
  },
  iconRowRightSecondary: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
  },
});
