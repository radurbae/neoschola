import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadcn, shadows, radius, spacing, typography, touchTarget } from "../../theme/tokens";
import { SpringPressable } from "./motion";

export interface CardHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export interface CardTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardTitle({ children, style }: CardTitleProps) {
  return <Text style={[styles.cardTitle, style]}>{children}</Text>;
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  return <Text style={[styles.cardDescription, style]}>{children}</Text>;
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.cardFooter, style]}>{children}</View>;
}

export interface LabelProps {
  children: React.ReactNode;
  required?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Label({ children, required = false, style }: LabelProps) {
  return (
    <View style={styles.labelContainer}>
      <Text style={[styles.label, style]}>{children}</Text>
      {required && <Text style={styles.labelAsterisk}>*</Text>}
    </View>
  );
}

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}

export function Separator({
  orientation = "horizontal",
  style,
}: SeparatorProps) {
  return (
    <View
      style={[
        orientation === "horizontal"
          ? styles.separatorHorizontal
          : styles.separatorVertical,
        style,
      ]}
    />
  );
}

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  style,
  textStyle,
}: AvatarProps) {
  const initials = getInitials(name);

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return styles.avatarSm;
      case "lg":
        return styles.avatarLg;
      case "md":
      default:
        return styles.avatarMd;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case "sm":
        return styles.avatarTextSm;
      case "lg":
        return styles.avatarTextLg;
      case "md":
      default:
        return styles.avatarTextMd;
    }
  };

  return (
    <View style={[styles.avatarBase, getSizeStyle(), style]}>
      <Text style={[styles.avatarTextBase, getTextSizeStyle(), textStyle]}>
        {initials}
      </Text>
    </View>
  );
}

export type AlertVariant = "default" | "destructive" | "info" | "warning";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  description: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Alert({
  variant = "default",
  title,
  description,
  icon,
  style,
}: AlertProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          container: styles.alertDestructive,
          title: styles.alertDestructiveTitle,
          description: styles.alertDestructiveDescription,
          defaultIconName: "alert-circle-outline" as const,
          iconColor: shadcn.status.danger.text,
        };
      case "info":
        return {
          container: styles.alertInfo,
          title: styles.alertInfoTitle,
          description: styles.alertInfoDescription,
          defaultIconName: "information-circle-outline" as const,
          iconColor: shadcn.status.info.text,
        };
      case "warning":
        return {
          container: styles.alertWarning,
          title: styles.alertWarningTitle,
          description: styles.alertWarningDescription,
          defaultIconName: "warning-outline" as const,
          iconColor: shadcn.status.warning.text,
        };
      case "default":
      default:
        return {
          container: styles.alertDefault,
          title: styles.alertDefaultTitle,
          description: styles.alertDefaultDescription,
          defaultIconName: "notifications-outline" as const,
          iconColor: shadcn.primary,
        };
    }
  };

  const v = getVariantStyles();

  return (
    <View style={[styles.alertBase, v.container, style]}>
      <View style={styles.alertIconCol}>
        {icon || <Ionicons name={v.defaultIconName} size={20} color={v.iconColor} />}
      </View>
      <View style={styles.alertBodyCol}>
        {Boolean(title) && <Text style={[styles.alertTitleBase, v.title]}>{title}</Text>}
        <Text style={[styles.alertDescriptionBase, v.description]}>{description}</Text>
      </View>
    </View>
  );
}

export interface TabItem {
  value: string;
  label: string;
  accessibilityLabel?: string;
  count?: number;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  style?: StyleProp<ViewStyle>;
}

export function Tabs({
  value,
  onValueChange,
  items,
  style,
}: TabsProps) {
  return (
    <View style={[styles.tabsRail, style]}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <SpringPressable
            key={item.value}
            onPress={() => onValueChange(item.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.accessibilityLabel || item.label}
            style={[
              styles.tabTrigger,
              isActive ? styles.tabTriggerActive : styles.tabTriggerInactive,
            ]}
          >
            <Text
              style={[
                styles.tabTriggerText,
                isActive ? styles.tabTriggerTextActive : styles.tabTriggerTextInactive,
              ]}
            >
              {item.label}
            </Text>
            {item.count !== undefined && (
              <View
                style={[
                  styles.tabCountBadge,
                  isActive ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    isActive ? styles.tabCountTextActive : styles.tabCountTextInactive,
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            )}
          </SpringPressable>
        );
      })}
    </View>
  );
}

export interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius: customRadius = radius.sm,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height,
          borderRadius: customRadius,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: shadcn.cardForeground,
    letterSpacing: typography.tracking.snug,
  },
  cardDescription: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.sm,
    marginTop: 2,
  },
  cardContent: {
    paddingVertical: spacing.xs,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },

  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
    color: shadcn.foreground,
  },
  labelAsterisk: {
    color: shadcn.destructive,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    marginLeft: 3,
  },

  separatorHorizontal: {
    height: 1,
    backgroundColor: shadcn.border,
    width: "100%",
  },
  separatorVertical: {
    width: 1,
    backgroundColor: shadcn.border,
    height: "100%",
  },

  avatarBase: {
    backgroundColor: shadcn.secondary,
    borderWidth: 1,
    borderColor: shadcn.border,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSm: {
    width: 32,
    height: 32,
  },
  avatarMd: {
    width: 40,
    height: 40,
  },
  avatarLg: {
    width: 48,
    height: 48,
  },
  avatarTextBase: {
    color: shadcn.primary,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
  },
  avatarTextSm: {
    fontSize: 12,
  },
  avatarTextMd: {
    fontSize: 14,
  },
  avatarTextLg: {
    fontSize: 16,
  },

  alertBase: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertIconCol: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  alertBodyCol: {
    flex: 1,
  },
  alertTitleBase: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    marginBottom: 2,
  },
  alertDescriptionBase: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    lineHeight: typography.lineHeight.sm,
  },
  alertDefault: {
    backgroundColor: shadcn.secondary,
    borderColor: shadcn.border,
  },
  alertDefaultTitle: {
    color: shadcn.foreground,
  },
  alertDefaultDescription: {
    color: shadcn.mutedForeground,
  },
  alertDestructive: {
    backgroundColor: shadcn.status.danger.bg,
    borderColor: shadcn.status.danger.border,
  },
  alertDestructiveTitle: {
    color: shadcn.status.danger.text,
  },
  alertDestructiveDescription: {
    color: shadcn.status.danger.text,
  },
  alertInfo: {
    backgroundColor: shadcn.status.info.bg,
    borderColor: shadcn.status.info.border,
  },
  alertInfoTitle: {
    color: shadcn.status.info.text,
  },
  alertInfoDescription: {
    color: shadcn.status.info.text,
  },
  alertWarning: {
    backgroundColor: shadcn.status.warning.bg,
    borderColor: shadcn.status.warning.border,
  },
  alertWarningTitle: {
    color: shadcn.status.warning.text,
  },
  alertWarningDescription: {
    color: shadcn.status.warning.text,
  },

  tabsRail: {
    flexDirection: "row",
    backgroundColor: shadcn.secondary,
    padding: 4,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  tabTrigger: {
    flex: 1,
    flexDirection: "row",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  tabTriggerActive: {
    backgroundColor: shadcn.background,
    borderWidth: 1,
    borderColor: shadcn.border,
    ...Platform.select({
      ios: {
        shadowColor: shadows.xs.shadowColor,
        shadowOffset: shadows.xs.shadowOffset,
        shadowOpacity: shadows.xs.shadowOpacity,
        shadowRadius: shadows.xs.shadowRadius,
      },
      android: {
        elevation: shadows.xs.elevation,
      },
      web: {
        boxShadow: "0 1px 2px rgba(9, 9, 11, 0.04)",
      },
    }),
  },
  tabTriggerInactive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabTriggerText: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.medium,
  },
  tabTriggerTextActive: {
    color: shadcn.foreground,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
  },
  tabTriggerTextInactive: {
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
  },
  tabCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tabCountBadgeActive: {
    backgroundColor: shadcn.primary,
  },
  tabCountBadgeInactive: {
    backgroundColor: shadcn.border,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
  },
  tabCountTextActive: {
    color: shadcn.primaryForeground,
  },
  tabCountTextInactive: {
    color: shadcn.mutedForeground,
  },

  // Skeleton
  skeletonBase: {
    backgroundColor: shadcn.border,
  },
});
