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
import type { MessageThread } from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Chip,
  Button,
  Input,
  ModalSheet,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  colors,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

const DEFAULT_TEACHER_ID = "usr_ani";
const DEFAULT_TEACHER_NAME = "Ibu Ani Wijayanti, S.Pd. (Wali Kelas)";

export function ThreadsScreen() {
  const router = useRouter();
  const { students } = useAuth();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [serviceHours, setServiceHours] = useState<string>(
    "Senin–Jumat, 07.00–15.00 WIB"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Sheet Pesan Baru
  const [newThreadModalVisible, setNewThreadModalVisible] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [initialMessage, setInitialMessage] = useState<string>("");
  const [creatingThread, setCreatingThread] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        err?.message || "Gagal memuat percakapan. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Siapkan default student saat membuka modal
  const handleOpenNewThreadModal = () => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
    setSubject("");
    setInitialMessage("");
    setFormError(null);
    setNewThreadModalVisible(true);
  };

  const handleCreateThread = async () => {
    if (!selectedStudentId) {
      setFormError("Mohon pilih anak yang terkait dengan pesan ini.");
      return;
    }
    if (!subject.trim()) {
      setFormError("Subjek pesan wajib diisi (minimal 3 karakter).");
      return;
    }
    if (!initialMessage.trim()) {
      setFormError("Pesan awal tidak boleh kosong.");
      return;
    }

    setFormError(null);
    setCreatingThread(true);

    try {
      const res = await api.createThread({
        student_id: selectedStudentId,
        teacher_id: DEFAULT_TEACHER_ID,
        subject: subject.trim(),
        initial_message: initialMessage.trim(),
      });

      setNewThreadModalVisible(false);
      // Navigasi langsung ke ruang percakapan baru
      router.push(`/chat/${res.thread.id}`);
      // Refresh daftar di belakang layar
      fetchThreads(false);
    } catch (err: any) {
      setFormError(
        err?.message || "Gagal mengirim pesan baru. Silakan coba lagi."
      );
    } finally {
      setCreatingThread(false);
    }
  };

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Pesan Guru"
      subtitle="Komunikasi langsung wali murid & sekolah"
      rightAction={
        <Button
          title="+ Pesan Baru"
          variant="primary"
          size="sm"
          onPress={handleOpenNewThreadModal}
          accessibilityLabel="Buka formulir pesan baru ke wali kelas"
        />
      }
    >
      {/* Banner Informasi Jam Layanan */}
      <View style={styles.serviceBanner}>
        <View style={styles.serviceIconCircle}>
          <Ionicons
            name="time-outline"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.serviceTextCol}>
          <Text style={styles.serviceTitle}>Jam Layanan Guru:</Text>
          <Text style={styles.serviceSubtitle}>{serviceHours}</Text>
        </View>
      </View>

      {/* Konten Daftar Percakapan */}
      {loading ? (
        <StateView type="loading" message="Memuat daftar percakapan..." />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Pesan"
          message={errorMessage}
          actionLabel="Muat Ulang"
          onAction={() => fetchThreads(false)}
        />
      ) : threads.length === 0 ? (
        <StateView
          type="empty"
          title="Belum Ada Percakapan"
          message="Anda belum memiliki pesan aktif dengan pihak sekolah. Mulai percakapan baru dengan menekan tombol di bawah."
          actionLabel="Mulai Pesan Baru"
          onAction={handleOpenNewThreadModal}
        />
      ) : (
        <ScrollView
          style={styles.threadsScrollView}
          contentContainerStyle={styles.threadsScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchThreads(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {threads.map((thread) => {
            const hasUnread = Boolean(thread.unread_count && thread.unread_count > 0);
            return (
              <Card
                key={thread.id}
                style={[
                  styles.threadCard,
                  hasUnread && styles.threadCardUnread,
                ]}
                onPress={() => router.push(`/chat/${thread.id}`)}
                accessibilityLabel={`Percakapan subjek ${thread.subject}, terkait siswa ${
                  thread.student_name || "Siswa"
                }. ${hasUnread ? `${thread.unread_count} pesan baru.` : ""}`}
              >
                <View style={styles.threadCardHeader}>
                  <View style={styles.threadPartnerInfo}>
                    <View style={styles.teacherAvatar}>
                      <Ionicons
                        name="person"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.threadHeaderTitles}>
                      <Text style={styles.threadTeacherName}>
                        {thread.teacher_name || DEFAULT_TEACHER_NAME}
                      </Text>
                      <Text style={styles.threadStudentBadge}>
                        Terkait: {thread.student_name || "Siswa Asuh"}
                      </Text>
                    </View>
                  </View>

                  {/* Waktu & Badge Unread */}
                  <View style={styles.threadHeaderMeta}>
                    <Text style={styles.threadTimeText}>
                      {formatTanggalId(thread.last_message_at || thread.created_at, {
                        shortMonth: true,
                      })}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {thread.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Subjek Percakapan */}
                <Text style={styles.threadSubject} numberOfLines={1}>
                  {thread.subject}
                </Text>

                {/* Cuplikan Pesan Terakhir */}
                <Text
                  style={[
                    styles.threadSnippet,
                    hasUnread && styles.threadSnippetUnread,
                  ]}
                  numberOfLines={2}
                >
                  {thread.last_message || "Belum ada pesan."}
                </Text>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* ModalSheet Buat Pesan Baru */}
      <ModalSheet
        visible={newThreadModalVisible}
        onClose={() => setNewThreadModalVisible(false)}
        title="Mulai Pesan Baru"
      >
        <View style={styles.newThreadForm}>
          {/* Penerima Tetap: Wali Kelas */}
          <View style={styles.recipientCard}>
            <Text style={styles.fieldLabel}>Penerima Pesan:</Text>
            <View style={styles.recipientRow}>
              <View style={styles.recipientIconCircle}>
                <Ionicons name="school" size={20} color={colors.primary} />
              </View>
              <View style={styles.recipientTextCol}>
                <Text style={styles.recipientName}>{DEFAULT_TEACHER_NAME}</Text>
                <Text style={styles.recipientRole}>
                  Wali Kelas SDN Nusantara Harapan
                </Text>
              </View>
            </View>
          </View>

          {/* Pemilihan Anak Asuh */}
          {students.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Pilih Siswa Terkait:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentChipsScroll}
              >
                {students.map((student) => (
                  <Chip
                    key={student.id}
                    label={`${student.nickname || student.full_name} (${student.class_name || "Siswa"})`}
                    selected={selectedStudentId === student.id}
                    onPress={() => setSelectedStudentId(student.id)}
                    accessibilityLabel={`Pilih anak: ${student.full_name}`}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Subjek Percakapan */}
          <Input
            label="Subjek Percakapan"
            placeholder="Contoh: Konsultasi Nilai Matematika"
            value={subject}
            onChangeText={setSubject}
            containerStyle={styles.formGroup}
            accessibilityLabel="Input subjek percakapan"
          />

          {/* Pesan Awal */}
          <Input
            label="Pesan Awal"
            placeholder="Tuliskan pertanyaan atau hal yang ingin Anda sampaikan kepada wali kelas..."
            value={initialMessage}
            onChangeText={setInitialMessage}
            multiline
            numberOfLines={4}
            containerStyle={styles.formGroup}
            inputStyle={styles.textAreaField}
            accessibilityLabel="Input isi pesan awal"
          />

          {/* Error Message jika ada */}
          {Boolean(formError) && (
            <View style={styles.formErrorBox}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={colors.badge.danger.text}
              />
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          {/* Tombol Aksi Kirim */}
          <View style={styles.formButtonRow}>
            <Button
              title="Kirim Pesan"
              variant="primary"
              loading={creatingThread}
              onPress={handleCreateThread}
              leftIcon={
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color={colors.textInverse}
                />
              }
              accessibilityLabel="Kirim pesan baru dan buka percakapan"
            />
            <Button
              title="Batal"
              variant="secondary"
              onPress={() => setNewThreadModalVisible(false)}
              accessibilityLabel="Batal membuat pesan baru"
            />
          </View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  serviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTextCol: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  serviceSubtitle: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  threadsScrollView: {
    flex: 1,
  },
  threadsScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  threadCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  threadCardUnread: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: "#FDFDFD",
  },
  threadCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  threadPartnerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  threadHeaderTitles: {
    flex: 1,
  },
  threadTeacherName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  threadStudentBadge: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  threadHeaderMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  threadTimeText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
  },
  threadSubject: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  threadSnippet: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  threadSnippetUnread: {
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
  },

  // Form Modal Styles
  newThreadForm: {
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recipientCard: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  recipientIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  recipientTextCol: {
    flex: 1,
  },
  recipientName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  recipientRole: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  studentChipsScroll: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
  },
  textAreaField: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    borderColor: colors.badge.danger.border,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  formErrorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.badge.danger.text,
    fontWeight: typography.weight.medium,
  },
  formButtonRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
