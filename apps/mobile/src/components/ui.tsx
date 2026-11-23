import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Student } from "@neoschola/shared";
import { colors, shadows, spacing, radius, typography, touchTarget, shadcn, bento } from "../theme/tokens";
import { Avatar } from "./ui/shadcn";

// Re-export seluruh primitif shadcn/ui dan komponen bento
export * from "./ui/shadcn";
export * from "./ui/bento";

// Screen

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerShown?: boolean;
}

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  rightAction,
  style,
  contentContainerStyle,
  headerShown = true,
}: ScreenProps) {
  const hasHeader = headerShown && (Boolean(title) || Boolean(rightAction));

  return (
    <SafeAreaView style={[styles.screenSafeArea, style]}>
      {hasHeader && (
        <View style={styles.screenHeader}>
          <View style={styles.screenHeaderTitleContainer}>
            {Boolean(title) && <Text style={styles.screenTitle}>{title}</Text>}
            {Boolean(subtitle) && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
          </View>
          {Boolean(rightAction) && (
            <View style={styles.screenRightAction}>{rightAction}</View>
          )}
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={styles.screenScrollView}
          contentContainerStyle={[styles.screenContentContainer, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenStaticContainer, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

// Card

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  testID,
}: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardTouchable, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

// Button

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link"
  // Kompatibilitas varian lama
  | "primary"
  | "danger";

export type ButtonSize = "sm" | "default" | "md" | "lg" | "icon";

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  title,
  children,
  onPress,
  variant = "default",
  size = "default",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Normalisasi varian lama ke standar shadcn
  const normalizedVariant: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" =
    variant === "primary"
      ? "default"
      : variant === "danger"
      ? "destructive"
      : variant;

  const getVariantStyle = (pressed: boolean) => {
    switch (normalizedVariant) {
      case "default":
        return {
          backgroundColor: pressed ? shadcn.primaryPressed : shadcn.primary,
          borderColor: pressed ? shadcn.primaryPressed : shadcn.primary,
          borderWidth: 1,
        };
      case "secondary":
        return {
          backgroundColor: pressed ? shadcn.secondaryPressed : shadcn.secondary,
          borderColor: pressed ? shadcn.secondaryPressed : shadcn.secondary,
          borderWidth: 1,
        };
      case "outline":
        return {
          backgroundColor: pressed ? shadcn.secondary : shadcn.background,
          borderColor: shadcn.border,
          borderWidth: 1,
        };
      case "ghost":
        return {
          backgroundColor: pressed ? shadcn.secondary : "transparent",
          borderColor: "transparent",
          borderWidth: 1,
        };
      case "destructive":
        return {
          backgroundColor: pressed ? shadcn.destructivePressed : shadcn.destructive,
          borderColor: pressed ? shadcn.destructivePressed : shadcn.destructive,
          borderWidth: 1,
        };
      case "link":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    switch (normalizedVariant) {
      case "default":
        return shadcn.primaryForeground;
      case "secondary":
        return shadcn.secondaryForeground;
      case "outline":
      case "ghost":
      case "link":
        return shadcn.foreground;
      case "destructive":
        return shadcn.destructiveForeground;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return {
          paddingHorizontal: spacing.md,
          minHeight: touchTarget.minHeight,
        };
      case "lg":
        return {
          paddingHorizontal: spacing.xxl,
          minHeight: 48,
        };
      case "icon":
        return {
          width: touchTarget.minWidth,
          minHeight: touchTarget.minHeight,
          paddingHorizontal: 0,
          justifyContent: "center" as const,
          alignItems: "center" as const,
        };
      case "md":
      case "default":
      default:
        return {
          paddingHorizontal: spacing.lg,
          minHeight: touchTarget.minHeight,
        };
    }
  };

  const displayTitle = title || (typeof children === "string" ? children : "");

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || displayTitle}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.buttonBase,
        getSizeStyle(),
        getVariantStyle(pressed),
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
        />
      ) : (
        <View style={styles.buttonContent}>
          {Boolean(leftIcon) && <View style={styles.buttonIconLeft}>{leftIcon}</View>}
          {displayTitle ? (
            <Text
              style={[
                styles.buttonText,
                { color: getTextColor() },
                normalizedVariant === "link" && styles.buttonTextLink,
                textStyle,
              ]}
            >
              {displayTitle}
            </Text>
          ) : (
            children
          )}
          {Boolean(rightIcon) && <View style={styles.buttonIconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

// Badge

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "neutral"
  // Kompatibilitas varian lama
  | "danger";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  variant = "neutral",
  style,
  textStyle,
}: BadgeProps) {
  const getBadgeColors = () => {
    switch (variant) {
      case "default":
        return {
          bg: shadcn.primary,
          text: shadcn.primaryForeground,
          border: shadcn.primary,
        };
      case "secondary":
        return {
          bg: shadcn.secondary,
          text: shadcn.secondaryForeground,
          border: shadcn.border,
        };
      case "outline":
        return {
          bg: shadcn.background,
          text: shadcn.foreground,
          border: shadcn.border,
        };
      case "destructive":
      case "danger":
        return shadcn.status.danger;
      case "success":
        return shadcn.status.success;
      case "warning":
        return shadcn.status.warning;
      case "info":
        return shadcn.status.info;
      case "neutral":
      default:
        return shadcn.status.neutral;
    }
  };

  const badgeColor = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor.bg,
          borderColor: badgeColor.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// Chip

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  count,
  style,
  accessibilityLabel,
}: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${label}${count !== undefined ? ` (${count})` : ""}`}
    >
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          style={[
            styles.chipCountBadge,
            selected ? styles.chipCountBadgeSelected : styles.chipCountBadgeUnselected,
          ]}
        >
          <Text
            style={[
              styles.chipCountText,
              selected ? styles.chipCountTextSelected : styles.chipCountTextUnselected,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Input

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  leftAddon,
  rightAddon,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {Boolean(label) && <Text style={styles.inputLabel}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          rest.multiline && styles.inputWrapperMultiline,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        {Boolean(leftAddon) && (
          <View style={styles.inputAddonLeft}>{leftAddon}</View>
        )}
        <TextInput
          style={[
            styles.inputField,
            rest.multiline && styles.inputFieldMultiline,
            inputStyle,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {Boolean(rightAddon) && (
          <View style={styles.inputAddonRight}>{rightAddon}</View>
        )}
      </View>
      {Boolean(error) ? (
        <Text style={styles.inputErrorText}>{error}</Text>
      ) : Boolean(helperText) ? (
        <Text style={styles.inputHelperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

// SectionHeader

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  rightAction,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderTitleCol}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {Boolean(subtitle) && (
          <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
        )}
      </View>
      {Boolean(rightAction) && (
        <View style={styles.sectionHeaderRight}>{rightAction}</View>
      )}
    </View>
  );
}

// ChildSwitcher

export interface ChildSwitcherProps {
  students: Student[];
  activeStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function ChildSwitcher({
  students,
  activeStudentId,
  onSelectStudent,
  style,
}: ChildSwitcherProps) {
  if (!students || students.length === 0) {
    return null;
  }

  // Jika hanya ada 1 anak: tampilkan kartu ringkas info anak aktif dengan hairline border elegan
  if (students.length === 1) {
    const student = students[0];
    const studentName = student.nickname || student.full_name;
    return (
      <View style={[styles.childSwitcherSingleCard, style]}>
        <Avatar name={studentName} size="md" style={styles.childSingleAvatar} />
        <View style={styles.childInfoCol}>
          <Text style={styles.childSingleName}>{student.full_name}</Text>
          <Text style={styles.childSingleClass}>
            {student.class_name || "Peserta Didik"} - NIS {student.nis}
          </Text>
        </View>
      </View>
    );
  }

  // Jika >= 2 anak: pemilih anak interaktif bergaya shadcn
  return (
    <View style={[styles.childSwitcherContainer, style]}>
      <Text style={styles.childSwitcherLabel}>Pilih Anak Asuh:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.childSwitcherScrollList}
      >
        {students.map((student) => {
          const isActive = student.id === activeStudentId;
          const studentName = student.nickname || student.full_name;
          return (
            <TouchableOpacity
              key={student.id}
              style={[
                styles.childTabItem,
                isActive ? styles.childTabItemActive : styles.childTabItemInactive,
              ]}
              onPress={() => onSelectStudent(student.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Pilih ${studentName}, ${student.class_name || ""}`}
            >
              <View
                style={[
                  styles.childTabAvatar,
                  isActive ? styles.childTabAvatarActive : styles.childTabAvatarInactive,
                ]}
              >
                <Text
                  style={[
                    styles.childTabAvatarText,
                    isActive ? styles.childTabAvatarTextActive : styles.childTabAvatarTextInactive,
                  ]}
                >
                  {studentName ? studentName.slice(0, 1).toUpperCase() : "A"}
                </Text>
              </View>
              <View style={styles.childTabTextCol}>
                <Text
                  style={[
                    styles.childTabName,
                    isActive ? styles.childTabNameActive : styles.childTabNameInactive,
                  ]}
                  numberOfLines={1}
                >
                  {studentName}
                </Text>
                <Text
                  style={[
                    styles.childTabClass,
                    isActive ? styles.childTabClassActive : styles.childTabClassInactive,
                  ]}
                >
                  {student.class_name || "Siswa"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// StateView (Loading, Empty, Error)

export interface StateViewProps {
  type: "loading" | "empty" | "error";
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StateView({
  type,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: StateViewProps) {
  if (type === "loading") {
    return (
      <View style={[styles.stateViewContainer, style]}>
        <ActivityIndicator size="large" color={shadcn.primary} />
        <Text style={styles.stateLoadingText}>
          {message || "Memuat data..."}
        </Text>
      </View>
    );
  }

  if (type === "empty") {
    return (
      <View style={[styles.stateViewContainer, style]}>
        <View style={styles.stateIconCircle}>
          <Ionicons name="file-tray-outline" size={28} color={shadcn.mutedForeground} />
        </View>
        <Text style={styles.stateTitle}>{title || "Belum Ada Data"}</Text>
        <Text style={styles.stateMessage}>
          {message || "Data yang Anda cari saat ini belum tersedia."}
        </Text>
        {Boolean(actionLabel && onAction) && (
          <Button
            title={actionLabel!}
            onPress={onAction}
            variant="default"
            style={styles.stateActionButton}
          />
        )}
      </View>
    );
  }

  // Error State
  return (
    <View style={[styles.stateViewContainer, style]}>
      <View style={[styles.stateIconCircle, styles.stateErrorIconCircle]}>
        <Ionicons name="alert-circle-outline" size={28} color={shadcn.status.danger.text} />
      </View>
      <Text style={styles.stateTitle}>{title || "Terjadi Kendala"}</Text>
      <Text style={styles.stateMessage}>
        {message || "Gagal memuat data. Periksa koneksi internet Anda dan coba lagi."}
      </Text>
      <Button
        title={actionLabel || "Coba Lagi"}
        onPress={onAction}
        variant="default"
        style={styles.stateActionButton}
      />
    </View>
  );
}

// ModalSheet (Responsive Bottom Sheet / Modal)

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function ModalSheet({
  visible,
  onClose,
  title,
  children,
}: ModalSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable
          style={styles.modalDismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup modal"
        />
        <View style={styles.modalSheetCard}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHandleBar} />
          </View>
          <View style={styles.modalTitleRow}>
            <Text style={styles.modalTitleText}>{title || ""}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Tutup formulir"
            >
              <Ionicons name="close" size={20} color={shadcn.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScrollBody}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Ekspor alias Sheet untuk kompatibilitas shadcn/ui
export const Sheet = ModalSheet;
export type SheetProps = ModalSheetProps;

// Styles

const styles = StyleSheet.create({
  // Screen
  screenSafeArea: {
    flex: 1,
    backgroundColor: bento.surface,
  },
  screenScrollView: {
    flex: 1,
  },
  screenContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
  },
  screenStaticContainer: {
    flex: 1,
    padding: spacing.lg,
    maxWidth: 1120,
    alignSelf: "center",
    width: "100%",
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: bento.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenHeaderTitleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    letterSpacing: typography.tracking.tight,
  },
  screenSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  screenRightAction: {
    marginLeft: spacing.md,
    minHeight: touchTarget.minHeight,
    justifyContent: "center",
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: shadows.xs.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 2px rgba(9, 9, 11, 0.03)",
      },
    }),
  },
  cardTouchable: {
    minHeight: touchTarget.minHeight,
  },

  // Button
  buttonBase: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    textAlign: "center",
  },
  buttonTextLink: {
    textDecorationLine: "underline",
  },
  buttonIconLeft: {
    marginRight: spacing.sm,
  },
  buttonIconRight: {
    marginLeft: spacing.sm,
  },

  // Badge
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },

  // Chip
  chip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipSelected: {
    backgroundColor: shadcn.primary,
    borderColor: shadcn.primary,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.size.sm,
  },
  chipTextSelected: {
    color: shadcn.primaryForeground,
    fontWeight: typography.weight.semibold,
  },
  chipTextUnselected: {
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  chipCountBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  chipCountBadgeSelected: {
    backgroundColor: shadcn.primaryPressed,
  },
  chipCountBadgeUnselected: {
    backgroundColor: colors.cardSecondary,
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  chipCountTextSelected: {
    color: shadcn.primaryForeground,
  },
  chipCountTextUnselected: {
    color: colors.textSecondary,
  },

  // Input
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
  },
  inputWrapperMultiline: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: shadcn.primary,
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: shadcn.destructive,
  },
  inputField: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    minHeight: touchTarget.minHeight,
    paddingVertical: 0,
  },
  inputFieldMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  inputAddonLeft: {
    marginRight: spacing.sm,
  },
  inputAddonRight: {
    marginLeft: spacing.sm,
    minHeight: touchTarget.minHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  inputErrorText: {
    fontSize: typography.size.xs,
    color: shadcn.status.danger.text,
    marginTop: spacing.xs,
  },
  inputHelperText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHeaderTitleCol: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    letterSpacing: typography.tracking.snug,
  },
  sectionHeaderSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRight: {
    marginLeft: spacing.md,
    minHeight: touchTarget.minHeight,
    justifyContent: "center",
  },

  // ChildSwitcher
  childSwitcherSingleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  childSingleAvatar: {
    marginRight: spacing.md,
  },
  childInfoCol: {
    flex: 1,
  },
  childSingleName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    letterSpacing: typography.tracking.snug,
  },
  childSingleClass: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childSwitcherContainer: {
    marginBottom: spacing.md,
  },
  childSwitcherLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  childSwitcherScrollList: {
    paddingVertical: spacing.xs,
  },
  childTabItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  childTabItemActive: {
    backgroundColor: shadcn.primary,
    borderColor: shadcn.primary,
  },
  childTabItemInactive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  childTabAvatar: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  childTabAvatarActive: {
    backgroundColor: shadcn.primaryPressed,
  },
  childTabAvatarInactive: {
    backgroundColor: shadcn.secondary,
  },
  childTabAvatarText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  childTabAvatarTextActive: {
    color: shadcn.primaryForeground,
  },
  childTabAvatarTextInactive: {
    color: shadcn.secondaryForeground,
  },
  childTabTextCol: {
    justifyContent: "center",
  },
  childTabName: {
    fontSize: typography.size.sm,
  },
  childTabNameActive: {
    color: shadcn.primaryForeground,
    fontWeight: typography.weight.semibold,
  },
  childTabNameInactive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
  },
  childTabClass: {
    fontSize: 11,
  },
  childTabClassActive: {
    color: colors.textInverseMuted,
  },
  childTabClassInactive: {
    color: colors.textSecondary,
  },

  // StateView
  stateViewContainer: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  stateLoadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  stateErrorIconCircle: {
    backgroundColor: shadcn.status.danger.bg,
    borderColor: shadcn.status.danger.border,
  },
  stateTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    letterSpacing: typography.tracking.snug,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  stateMessage: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.lineHeight.sm,
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  stateActionButton: {
    minWidth: 160,
  },

  // ModalSheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.45)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: "85%",
    paddingBottom: spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: shadows.xs.shadowColor,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeaderRow: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.modalHandle,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitleText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.tracking.snug,
    color: colors.textPrimary,
    flex: 1,
  },
  modalCloseButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  modalScrollBody: {
    paddingHorizontal: spacing.lg,
  },
  modalScrollContent: {
    paddingVertical: spacing.md,
  },
});
