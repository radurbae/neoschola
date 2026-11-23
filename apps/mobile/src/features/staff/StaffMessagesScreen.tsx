import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MessageThread, formatTanggalId } from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  StateView,
  Alert,
  Avatar,
  Separator,
} from "../../components/ui";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../../theme/tokens";

export function StaffMessagesScreen() {
  const router = useRouter();
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
        // Normalisasi tanda hubung
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

  const handleBackToDashboard = () => {
    router.replace("/(staff)");
  };

  const cleanServiceHours = serviceHours.replace(/[\u2013\u2014]/g, "-");

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Pesan Wali Murid"
      subtitle="Komunikasi dan konsultasi dengan wali siswa"
      rightAction={
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToDashboard}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Dasbor Staf"
        >
          <Ionicons name="home-outline" size={20} color={shadcn.foreground} />
        </TouchableOpacity>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchThreads(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        {/* Banner Informasi Jam Layanan Sekolah (Menggunakan Alert variant default) */}
        <Alert
          variant="default"
          title="Jam Layanan Komunikasi"
          description={cleanServiceHours}
          icon={<Ionicons name="time-outline" size={20} color={shadcn.foreground} />}
          style={styles.serviceAlert}
        />

        {/* State Loading / Error / Empty */}
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

              return (
                <View key={thread.id}>
                  {index > 0 && <Separator />}
                  <TouchableOpacity
                    style={[styles.threadRow, unread && styles.threadRowUnread]}
                    onPress={() => handleOpenThread(thread)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Buka percakapan ${thread.subject} dengan ${contactName}`}
                  >
                    <Avatar name={contactName} size="md" style={styles.threadAvatar} />

                    <View style={styles.threadBody}>
                      <View style={styles.threadTopRow}>
                        <Text
                          style={[styles.threadSubject, unread && styles.threadSubjectBold]}
                          numberOfLines={1}
                        >
                          {thread.subject}
                        </Text>
                        <Text style={styles.timeText}>{formattedTime}</Text>
                      </View>

                      <Text style={styles.studentInfo} numberOfLines={1}>
                        Wali dari: {thread.student_name || "Siswa"}
                        {thread.guardian_name ? ` (${thread.guardian_name})` : ""}
                      </Text>

                      <View style={styles.threadBottomRow}>
                        <Text
                          style={[
                            styles.snippetText,
                            unread ? styles.snippetTextUnread : styles.snippetTextRead,
                          ]}
                          numberOfLines={1}
                        >
                          {thread.last_message || "Ketuk untuk melihat riwayat percakapan..."}
                        </Text>
                        {unread && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {thread.unread_count}
                            </Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={shadcn.mutedForeground}
                          style={styles.chevronIcon}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  serviceAlert: {
    marginBottom: spacing.md,
  },
  threadsCard: {
    padding: 0,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  threadRowUnread: {
    backgroundColor: shadcn.secondary,
  },
  threadAvatar: {
    marginRight: spacing.md,
  },
  threadBody: {
    flex: 1,
  },
  threadTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  threadSubject: {
    fontSize: typography.size.sm,
    color: shadcn.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  threadSubjectBold: {
    fontWeight: typography.weight.semibold,
  },
  studentInfo: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginBottom: 4,
  },
  threadBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  snippetText: {
    flex: 1,
    fontSize: typography.size.xs,
    marginRight: spacing.sm,
  },
  snippetTextUnread: {
    color: shadcn.foreground,
    fontWeight: typography.weight.medium,
  },
  snippetTextRead: {
    color: shadcn.mutedForeground,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: shadcn.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: spacing.xs,
  },
  unreadBadgeText: {
    color: shadcn.primaryForeground,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
  },
  chevronIcon: {
    marginLeft: 2,
  },
});
