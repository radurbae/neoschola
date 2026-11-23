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
import {
  Screen,
  Card,
  Badge,
  Button,
  StateView,
  Separator,
} from "../src/components/ui";
import type { BadgeVariant } from "../src/components/ui";
import * as api from "../src/lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../src/theme/tokens";

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
        return { label: "Tagihan", variant: "destructive" };
      case "AKADEMIK":
        return { label: "Akademik", variant: "neutral" };
      default:
        return { label: type, variant: "neutral" };
    }
  };

  return (
    <Screen scroll={false} headerShown={false} style={styles.screen}>
      {/* Hairline Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke layar sebelumnya"
        >
          <Ionicons name="arrow-back" size={22} color={shadcn.foreground} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Pusat Notifikasi</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : "Semua notifikasi sudah dibaca"}
          </Text>
        </View>

        {unreadCount > 0 ? (
          <Button
            title="Tandai Semua"
            onPress={handleMarkAllRead}
            variant="ghost"
            size="sm"
            loading={markingAll}
            style={styles.markAllButton}
            accessibilityLabel="Tandai semua notifikasi sudah dibaca"
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Main Content Body */}
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
              tintColor={shadcn.primary}
            />
          }
        >
          <Card style={styles.notificationsCard}>
            {notifications.map((item, index) => {
              const badgeInfo = getCategoryBadge(item.type);
              const isUnread = !item.is_read;
              const formattedTime = formatTanggalId(item.created_at, {
                includeDay: true,
                shortMonth: true,
              });

              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <Separator />}
                  <TouchableOpacity
                    onPress={() => handleMarkAsRead(item)}
                    style={[
                      styles.notificationItem,
                      isUnread && styles.notificationItemUnread,
                    ]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${item.body}. ${
                      isUnread ? "Belum dibaca." : "Sudah dibaca."
                    }`}
                  >
                    <View style={styles.itemHeaderRow}>
                      <View style={styles.badgeRow}>
                        {isUnread && <View style={styles.unreadDot} />}
                        <Badge
                          label={badgeInfo.label}
                          variant={badgeInfo.variant}
                        />
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
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: shadcn.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
    minHeight: 56,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  headerSubtitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 1,
  },
  markAllButton: {
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  headerSpacer: {
    width: touchTarget.minWidth,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  notificationsCard: {
    padding: 0,
    overflow: "hidden",
  },
  notificationItem: {
    padding: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  notificationItemUnread: {
    backgroundColor: shadcn.accent,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: shadcn.primary,
    marginRight: spacing.xs,
  },
  timestampText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  notificationTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginTop: 2,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
  },
  notificationBody: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.sm,
  },
});
