import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
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
  SpringPressable,
} from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import {
  getHomeRouteForRole,
  getProfileRouteForRole,
} from "../src/config/appVariant";
import * as api from "../src/lib/api";
import {
  bento,
  shadcn,
  breakpoints,
  layout,
  spacing,
  radius,
  touchTarget,
} from "../src/theme/tokens";

export default function NotificationsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const { user, refreshUnreadNotifications } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
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
        await refreshUnreadNotifications();
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Gagal memuat notifikasi. Periksa koneksi internet Anda."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshUnreadNotifications]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(getHomeRouteForRole(user?.role) as any);
    }
  };

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
      await refreshUnreadNotifications();
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
      await refreshUnreadNotifications();
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
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: isTablet
              ? layout.tabletPaddingX
              : layout.mobilePaddingX,
            paddingTop: isTablet ? 8 : 4,
            paddingBottom: layout.scrollBottomPad,
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
        {/* Top Utility Bar dengan Tombol Kembali 44x44 menyatu di aliran scroll */}
        <TopUtilityBar
          noHorizontalPadding
          title="Notifikasi"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} kabar belum dibaca`
              : "Semua kabar sudah dibaca"
          }
          profileName={user?.name || "Akun"}
          onPressProfile={() =>
            router.push(getProfileRouteForRole(user?.role) as any)
          }
          leftAction={
            <SpringPressable
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke layar sebelumnya"
            >
              <Ionicons name="arrow-back" size={22} color={shadcn.foreground} />
            </SpringPressable>
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
        )}
      </ScrollView>
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
    paddingVertical: spacing.xs,
    alignItems: "flex-end",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    gap: layout.sectionGap,
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
