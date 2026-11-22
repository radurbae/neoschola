import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId } from "@neoschola/shared";
import type { Notification, NotificationType } from "@neoschola/shared";
import { Screen, Card, Badge, Button, StateView } from "../src/components/ui";
import type { BadgeVariant } from "../src/components/ui";
import * as api from "../src/lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../src/theme/tokens";

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat notifikasi. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.markNotificationRead(notification.id);
    } catch {
      // Revert if API fails
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    // Optimistic update
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);

    try {
      await api.markAllNotificationsRead();
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const getCategoryBadge = (
    type: NotificationType
  ): { label: string; variant: BadgeVariant } => {
    switch (type) {
      case "PRESENSI":
        return { label: "Presensi", variant: "success" };
      case "IZIN":
        return { label: "Izin", variant: "warning" };
      case "PENGUMUMAN":
        return { label: "Pengumuman", variant: "info" };
      case "PESAN":
        return { label: "Pesan", variant: "info" };
      case "TAGIHAN":
        return { label: "Tagihan", variant: "danger" };
      case "AKADEMIK":
        return { label: "Akademik", variant: "neutral" };
      default:
        return { label: type, variant: "neutral" };
    }
  };

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Pusat Notifikasi"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} notifikasi belum dibaca`
          : "Semua notifikasi sudah dibaca"
      }
      rightAction={
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke layar sebelumnya"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      }
    >
      {unreadCount > 0 && (
        <View style={styles.actionBar}>
          <Button
            title="Tandai Semua Dibaca"
            onPress={handleMarkAllRead}
            variant="secondary"
            size="sm"
            loading={markingAll}
            leftIcon={
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={colors.primary}
              />
            }
            style={styles.markAllButton}
            accessibilityLabel="Tandai semua notifikasi sudah dibaca"
          />
        </View>
      )}

      {loading ? (
        <StateView
          type="loading"
          message="Memuat daftar notifikasi sekolah..."
        />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Notifikasi"
          message={errorMessage}
          actionLabel="Coba Lagi"
          onAction={() => fetchNotifications()}
        />
      ) : notifications.length === 0 ? (
        <StateView
          type="empty"
          title="Belum Ada Notifikasi"
          message="Semua kabar penting, presensi harian, dan pengumuman sekolah akan muncul di sini."
          actionLabel="Muat Ulang"
          onAction={() => fetchNotifications()}
        />
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={colors.primary}
            />
          }
        >
          {notifications.map((item) => {
            const badgeInfo = getCategoryBadge(item.type);
            const isUnread = !item.is_read;
            const formattedTime = formatTanggalId(item.created_at, {
              includeDay: true,
              shortMonth: true,
            });

            return (
              <Card
                key={item.id}
                onPress={() => handleMarkAsRead(item)}
                style={[
                  styles.notificationCard,
                  isUnread && styles.notificationCardUnread,
                ]}
                accessibilityLabel={`${item.title}. ${item.body}. ${isUnread ? "Belum dibaca." : "Sudah dibaca."}`}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeWrapper}>
                    <Badge
                      label={badgeInfo.label}
                      variant={badgeInfo.variant}
                    />
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.timestampText}>{formattedTime}</Text>
                </View>

                <Text
                  style={[
                    styles.notificationTitle,
                    isUnread && styles.notificationTitleUnread,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.notificationBody}>{item.body}</Text>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "flex-end",
  },
  markAllButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  notificationCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  notificationCardUnread: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  badgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  timestampText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  notificationTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  notificationBody: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
});
