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
import { colors, spacing, radius, typography, touchTarget } from "../theme/tokens";

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

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
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
  onPress,
  variant = "primary",
  size = "md",
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

  const getVariantStyle = (pressed: boolean) => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          borderColor: pressed ? colors.primaryPressed : colors.primary,
        };
      case "secondary":
        return {
          backgroundColor: pressed ? "#D1FAE5" : colors.primarySoft,
          borderColor: "#BBF7D0",
          borderWidth: 1,
        };
      case "outline":
        return {
          backgroundColor: pressed ? "#F1F5F9" : "transparent",
          borderColor: colors.primary,
          borderWidth: 1.5,
        };
      case "danger":
        return {
          backgroundColor: pressed ? "#FCA5A5" : colors.badge.danger.bg,
          borderColor: colors.badge.danger.border,
          borderWidth: 1,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return colors.textInverse;
      case "secondary":
      case "outline":
        return colors.primary;
      case "danger":
        return colors.badge.danger.text;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { paddingHorizontal: spacing.md, minHeight: touchTarget.minHeight };
      case "lg":
        return { paddingHorizontal: spacing.xxl, minHeight: 48 };
      case "md":
      default:
        return { paddingHorizontal: spacing.lg, minHeight: touchTarget.minHeight };
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
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
          color={variant === "primary" ? colors.textInverse : colors.primary}
        />
      ) : (
        <View style={styles.buttonContent}>
          {Boolean(leftIcon) && <View style={styles.buttonIconLeft}>{leftIcon}</View>}
          <Text
            style={[
              styles.buttonText,
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {Boolean(rightIcon) && <View style={styles.buttonIconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

// Badge

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

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
      case "success":
        return colors.badge.success;
      case "warning":
        return colors.badge.warning;
      case "danger":
        return colors.badge.danger;
      case "info":
        return colors.badge.info;
      case "neutral":
      default:
        return {
          bg: "#F1F5F9",
          text: "#334155",
          border: "#CBD5E1",
        };
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

  // Jika hanya ada 1 anak: tampilkan kartu ringkas info anak aktif tanpa tombol ganti yang membingungkan
  if (students.length === 1) {
    const student = students[0];
    return (
      <View style={[styles.childSwitcherSingleCard, style]}>
        <View style={styles.childAvatarBadge}>
          <Text style={styles.childAvatarText}>
            {student.nickname ? student.nickname.slice(0, 1).toUpperCase() : "A"}
          </Text>
        </View>
        <View style={styles.childInfoCol}>
          <Text style={styles.childSingleName}>{student.full_name}</Text>
          <Text style={styles.childSingleClass}>
            {student.class_name || "Peserta Didik"} • NIS {student.nis}
          </Text>
        </View>
      </View>
    );
  }

  // Jika >= 2 anak: pemilih anak interaktif
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
              accessibilityLabel={`Pilih ${student.nickname || student.full_name}, ${student.class_name || ""}`}
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
                  {student.nickname ? student.nickname.slice(0, 1).toUpperCase() : "A"}
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
                  {student.nickname || student.full_name}
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
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Ionicons name="file-tray-outline" size={32} color={colors.textSecondary} />
        </View>
        <Text style={styles.stateTitle}>{title || "Belum Ada Data"}</Text>
        <Text style={styles.stateMessage}>
          {message || "Data yang Anda cari saat ini belum tersedia."}
        </Text>
        {Boolean(actionLabel && onAction) && (
          <Button
            title={actionLabel!}
            onPress={onAction}
            variant="primary"
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
        <Ionicons name="alert-circle-outline" size={32} color={colors.badge.danger.text} />
      </View>
      <Text style={styles.stateTitle}>{title || "Terjadi Kendala"}</Text>
      <Text style={styles.stateMessage}>
        {message || "Gagal memuat data. Periksa koneksi internet Anda dan coba lagi."}
      </Text>
      <Button
        title={actionLabel || "Coba Lagi"}
        onPress={onAction}
        variant="primary"
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
              <Ionicons name="close" size={24} color={colors.textPrimary} />
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

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Screen
  screenSafeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  screenScrollView: {
    flex: 1,
  },
  screenContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  screenStaticContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenHeaderTitleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
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
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
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
    opacity: 0.55,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    textAlign: "center",
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
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
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
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  chipTextUnselected: {
    color: colors.textSecondary,
  },
  chipCountBadge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  chipCountBadgeSelected: {
    backgroundColor: colors.primary,
  },
  chipCountBadgeUnselected: {
    backgroundColor: "#E2E8F0",
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
  chipCountTextSelected: {
    color: colors.textInverse,
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
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
    borderColor: colors.borderFocus,
    borderWidth: 1.5,
  },
  inputWrapperError: {
    borderColor: colors.badge.danger.text,
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
    color: colors.badge.danger.text,
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
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
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
  childAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  childAvatarText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  childInfoCol: {
    flex: 1,
  },
  childSingleName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
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
    fontWeight: typography.weight.semibold,
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
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  childTabItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  childTabItemInactive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  childTabAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  childTabAvatarActive: {
    backgroundColor: colors.primary,
  },
  childTabAvatarInactive: {
    backgroundColor: "#E2E8F0",
  },
  childTabAvatarText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  childTabAvatarTextActive: {
    color: colors.textInverse,
  },
  childTabAvatarTextInactive: {
    color: colors.textSecondary,
  },
  childTabTextCol: {
    justifyContent: "center",
  },
  childTabName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  childTabNameActive: {
    color: colors.primary,
  },
  childTabNameInactive: {
    color: colors.textPrimary,
  },
  childTabClass: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  childTabClassActive: {
    color: colors.primary,
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
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  stateErrorIconCircle: {
    backgroundColor: colors.badge.danger.bg,
  },
  stateTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
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
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "85%",
    paddingBottom: spacing.xxl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
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
    backgroundColor: "#CBD5E1",
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
    fontWeight: typography.weight.bold,
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
