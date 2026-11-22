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
import { Screen, Card, Badge, StateView } from "../../components/ui";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

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
        setServiceHours(res.service_hours);
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
    // Navigasi ke layar chat dengan thread id yang sesuai
    router.push(`/chat/${thread.id}` as any);
  };

  const handleBackToDashboard = () => {
    router.replace("/(staff)");
  };

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
          <Ionicons name="home-outline" size={24} color={colors.primary} />
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Banner Informasi Jam Layanan Sekolah */}
        <View style={styles.serviceBanner}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View style={styles.serviceTextCol}>
            <Text style={styles.serviceTitle}>Jam Layanan Komunikasi</Text>
            <Text style={styles.serviceBody}>{serviceHours}</Text>
          </View>
        </View>

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
          <View style={styles.threadsList}>
            {threads.map((thread) => {
              const unread = (thread.unread_count || 0) > 0;
              const formattedTime = formatTanggalId(thread.last_message_at, {
                shortMonth: true,
              });

              return (
                <Card
                  key={thread.id}
                  style={[styles.threadCard, unread && styles.threadCardUnread]}
                  onPress={() => handleOpenThread(thread)}
                  accessibilityLabel={`Buka percakapan ${thread.subject} dengan ${
                    thread.guardian_name || "Wali"
                  }`}
                >
                  <View style={styles.threadTopRow}>
                    <View style={styles.titleCol}>
                      <Text
                        style={[styles.threadSubject, unread && styles.threadSubjectBold]}
                        numberOfLines={1}
                      >
                        {thread.subject}
                      </Text>
                      <Text style={styles.studentInfo}>
                        Wali dari: {thread.student_name || "Siswa"}
                        {thread.guardian_name ? ` (${thread.guardian_name})` : ""}
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.timeText}>{formattedTime}</Text>
                      {unread && (
                        <View style={styles.unreadBadgeWrap}>
                          <Badge
                            label={`${thread.unread_count} baru`}
                            variant="danger"
                          />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Cuplikan Pesan Terakhir */}
                  <View style={styles.messageSnippetRow}>
                    <Text
                      style={[
                        styles.snippetText,
                        unread ? styles.snippetTextUnread : styles.snippetTextRead,
                      ]}
                      numberOfLines={2}
                    >
                      {thread.last_message || "Ketuk untuk melihat riwayat percakapan..."}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Card>
              );
            })}
          </View>
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  serviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  serviceTextCol: {
    marginLeft: spacing.md,
    flex: 1,
  },
  serviceTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  serviceBody: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  threadsList: {
    marginBottom: spacing.md,
  },
  threadCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  threadCardUnread: {
    borderColor: colors.borderFocus,
    backgroundColor: "#FCFDFD",
  },
  threadTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  titleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  threadSubject: {
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  threadSubjectBold: {
    fontWeight: typography.weight.bold,
  },
  studentInfo: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaCol: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  unreadBadgeWrap: {
    marginTop: spacing.xs,
  },
  messageSnippetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  snippetText: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    marginRight: spacing.sm,
  },
  snippetTextUnread: {
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
  },
  snippetTextRead: {
    color: colors.textSecondary,
  },
});
