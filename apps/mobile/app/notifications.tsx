import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId } from "@neoschola/shared";
import type { Notification, NotificationType } from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  DarkIconRow,
  Separator,
  StateView,
  Button,
} from "../src/components/ui";
import * as api from "../src/lib/api";
import {
  bento,
  shadcn,
  breakpoints,
  layout,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../src/theme/tokens";

export default function NotificationsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

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

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.markNotificationRead(notification.id);
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await api.markAllNotificationsRead();
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (
    type: NotificationType
  ): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "PRESENSI":
        return "calendar-outline";
      case "IZIN":
        return "medkit-outline";
      case "PENGUMUMAN":
        return "megaphone-outline";
      case "PESAN":
        return "chatbubbles-outline";
      case "TAGIHAN":
        return "wallet-outline";
      case "AKADEMIK":
        return "book-outline";
      default:
        return "notifications-outline";
    }
  };

  return (
    <Screen scroll={false} headerShown={false} style={styles.screen}>
      {/* Top Utility Bar dengan Tombol Kembali 44x44 */}
      <TopUtilityBar
        title="Notifikasi"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} kabar belum dibaca`
            : "Semua kabar sudah dibaca"
        }
        leftAction={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke layar sebelumnya"
          >
            <Ionicons name="arrow-back" size={22} color={shadcn.foreground} />
          </TouchableOpacity>
        }
      />

      {/* Baris Tombol Tandai Semua jika ada notifikasi belum dibaca */}
      {unreadCount > 0 && (
        <View style={styles.actionToolbar}>
          <Button
            title="Tandai Semua Sudah Dibaca"
            onPress={handleMarkAllRead}
            variant="ghost"
            size="sm"
            loading={markingAll}
            accessibilityLabel="Tandai semua notifikasi sudah dibaca"
          />
        </View>
      )}

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
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: isTablet
                ? layout.tabletPaddingX
                : layout.mobilePaddingX,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={shadcn.primary}
            />
          }
        >
          <View style={styles.notificationsCard}>
            {notifications.map((item, index) => {
              const formattedTime = formatTanggalId(item.created_at, {
                includeDay: true,
                shortMonth: true,
              });

              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <Separator />}
                  <DarkIconRow
                    icon={getNotificationIcon(item.type)}
                    title={item.title}
                    subtitle={`${item.body} • ${formattedTime}`}
                    rightPrimary={item.type}
                    rightSecondary={item.is_read ? "Dibaca" : "Baru"}
                    rightSecondaryTone={item.is_read ? "neutral" : "info"}
                    onPress={() => handleMarkAsRead(item)}
                    accessibilityLabel={`${item.title}. ${item.body}. ${
                      item.is_read ? "Sudah dibaca." : "Belum dibaca."
                    }`}
                  />
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: bento.surface,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    borderRadius: radius.full,
    backgroundColor: bento.pillSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionToolbar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: "flex-end",
    backgroundColor: bento.surface,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: layout.scrollBottomPad,
  },
  notificationsCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
});
