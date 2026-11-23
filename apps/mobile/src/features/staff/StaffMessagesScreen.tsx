import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MessageThread, formatTanggalId } from "@neoschola/shared";
import {
  TopUtilityBar,
  Card,
  StateView,
  Alert,
  Separator,
  DarkIconRow,
  SpringPressable,
} from "../../components/ui";
import * as api from "../../lib/api";
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

export function StaffMessagesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [serviceHours, setServiceHours] = useState<string>(
    "Jam Layanan: Senin - Jumat, 07:00 - 15:00 WIB"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchThreads = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await api.getThreads();
      setThreads(res.threads || []);
      if (res.service_hours) {
        // Normalisasi tanda hubung: 0 em-dash / en-dash
        setServiceHours(res.service_hours.replace(/[\u2013\u2014]/g, "-"));
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat pesan wali murid. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleOpenThread = (thread: MessageThread) => {
    router.push(`/chat/${thread.id}` as any);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(staff)");
    }
  };

  const cleanServiceHours = serviceHours.replace(/[\u2013\u2014]/g, "-");

  return (
    <View style={styles.container}>
      <TopUtilityBar
        title="Pesan Wali"
        subtitle="Komunikasi dan konsultasi dengan wali siswa"
        leftAction={
          <SpringPressable
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Dasbor Staf"
          >
            <Ionicons name="arrow-back" size={20} color={shadcn.foreground} />
          </SpringPressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isTablet
              ? layout.tabletPaddingX
              : layout.mobilePaddingX,
            gap: layout.sectionGap,
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
            onRefresh={() => fetchThreads(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        <Alert
          variant="default"
          title="Jam Layanan Komunikasi"
          description={cleanServiceHours}
          icon={<Ionicons name="time-outline" size={20} color={shadcn.foreground} />}
          style={styles.serviceAlert}
        />

        {loading && !refreshing ? (
          <StateView type="loading" message="Memuat percakapan wali murid..." />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Gagal Memuat Percakapan"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchThreads()}
          />
        ) : threads.length === 0 ? (
          <StateView
            type="empty"
            title="Belum Ada Pesan"
            message="Saat ini belum ada percakapan aktif dari wali murid binaan."
          />
        ) : (
          <Card style={styles.threadsCard}>
            {threads.map((thread, index) => {
              const unread = (thread.unread_count || 0) > 0;
              const formattedTime = formatTanggalId(thread.last_message_at, {
                shortMonth: true,
              });
              const contactName = thread.guardian_name || thread.student_name || "Wali";
              const subtext = `Wali dari ${thread.student_name || "Siswa"} • ${
                thread.last_message || "Riwayat percakapan"
              }`;

              return (
                <View key={thread.id}>
                  {index > 0 && <Separator />}
                  <DarkIconRow
                    icon="chatbubble-ellipses-outline"
                    title={thread.subject}
                    subtitle={subtext}
                    rightPrimary={unread ? `${thread.unread_count} baru` : undefined}
                    rightSecondary={formattedTime}
                    rightSecondaryTone={unread ? "info" : "neutral"}
                    onPress={() => handleOpenThread(thread)}
                    accessibilityLabel={`Buka percakapan ${thread.subject} dengan ${contactName}`}
                  />
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: shadcn.background,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    borderRadius: radius.full,
    backgroundColor: bento.pillSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  serviceAlert: {
    marginBottom: spacing.md,
  },
  threadsCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: shadcn.card,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
});
