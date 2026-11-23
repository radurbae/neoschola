import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId } from "@neoschola/shared";
import type { MessageThread } from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  DarkActionCard,
  Card,
  Badge,
  Chip,
  Button,
  Input,
  Label,
  Sheet,
  Alert,
  Avatar,
  Separator,
  StateView,
  SpringPressable,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  bento,
  breakpoints,
  layout,
  shadcn,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

const DEFAULT_TEACHER_ID = "usr_ani";
const DEFAULT_TEACHER_NAME = "Ibu Ani Wijayanti, S.Pd. (Wali Kelas)";

export function ThreadsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const responsiveHorizontalPadding = isTablet
    ? layout.tabletPaddingX
    : layout.mobilePaddingX;

  const { user, students, unreadNotificationCount } = useAuth();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [serviceHours, setServiceHours] = useState<string>(
    "Senin - Jumat, 07.00 - 15.00 WIB"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sheet Pesan Baru
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
        // Bersihkan tanda hubung dash en/em menjadi hyphen biasa
        setServiceHours(res.service_hours.replace(/[\u2013\u2014]/g, " - "));
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

  const totalUnreadCount = useMemo(() => {
    return threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);
  }, [threads]);

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
      router.push(`/chat/${res.thread.id}`);
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
    <Screen scroll={false} headerShown={false}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsiveHorizontalPadding,
            paddingTop: isTablet ? 8 : 4,
            paddingBottom: isTablet
              ? layout.scrollBottomPad
              : layout.mobileDockClearance,
            gap: layout.sectionGap,
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
            tintColor={shadcn.primary}
            colors={[shadcn.primary]}
          />
        }
      >
        {/* TopUtilityBar ("Pesan", tombol notif/profil) menyatu di aliran scroll */}
        <TopUtilityBar
          noHorizontalPadding
          title="Pesan"
          subtitle="Komunikasi langsung wali murid dan sekolah"
          unreadCount={unreadNotificationCount}
          profileName={user?.name || "Wali Murid"}
          onPressAnnouncements={() => router.push("/pengumuman")}
          onPressNotifications={() => router.push("/notifications")}
          onPressProfile={() => router.push("/(tabs)/profil")}
        />
        {/* Alert jam layanan bersih (pakai - bukan en-dash) */}
        <Alert
          variant="default"
          title="Jam Layanan Guru"
          description={`Layanan konsultasi guru aktif: ${serviceHours}. Pesan di luar jam tersebut akan ditanggapi pada hari kerja berikutnya.`}
          icon={
            <Ionicons
              name="time-outline"
              size={20}
              color={shadcn.foreground}
            />
          }
          style={styles.serviceAlert}
        />

        {/* DarkActionCard ringkas untuk mulai pesan baru */}
        <DarkActionCard
          eyebrow="Konsultasi Guru"
          title="Mulai Pesan Baru"
          description="Sampaikan pertanyaan atau konsultasi langsung kepada wali kelas mengenai perkembangan belajar anak."
          ctaLabel="Tulis Pesan Baru"
          compact
          onPress={handleOpenNewThreadModal}
          style={styles.actionCard}
        />

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
            message="Anda belum memiliki pesan aktif dengan pihak sekolah. Mulai percakapan baru dengan menekan tombol Tulis Pesan Baru di atas."
            actionLabel="Mulai Pesan Baru"
            onAction={handleOpenNewThreadModal}
          />
        ) : (
          <Card style={styles.threadsCard}>
            {threads.map((thread, index) => {
              const hasUnread = Boolean(thread.unread_count && thread.unread_count > 0);
              const teacherName = thread.teacher_name || DEFAULT_TEACHER_NAME;
              const studentName = thread.student_name || "Siswa Asuh";

              return (
                <React.Fragment key={thread.id}>
                  {index > 0 && <Separator />}
                  <SpringPressable
                    style={[
                      styles.threadRow,
                      hasUnread && styles.threadRowUnread,
                    ]}
                    onPress={() => router.push(`/chat/${thread.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Percakapan dengan ${teacherName}, terkait siswa ${studentName}, subjek ${thread.subject}. ${
                      hasUnread ? `${thread.unread_count} pesan belum dibaca.` : ""
                    }`}
                  >
                    <Avatar name={teacherName} size="md" />

                    <View style={styles.threadContentCol}>
                      <View style={styles.threadTopRow}>
                        <Text style={styles.threadTeacherName} numberOfLines={1}>
                          {teacherName}
                        </Text>
                        <Text style={styles.threadTimeText}>
                          {formatTanggalId(thread.last_message_at || thread.created_at, {
                            shortMonth: true,
                          })}
                        </Text>
                      </View>

                      <View style={styles.threadSubjectRow}>
                        <Badge
                          label={studentName}
                          variant="outline"
                          style={styles.studentBadge}
                        />
                        <Text style={styles.threadSubject} numberOfLines={1}>
                          {thread.subject}
                        </Text>
                      </View>

                      <View style={styles.threadBottomRow}>
                        <Text
                          style={[
                            styles.threadSnippet,
                            hasUnread && styles.threadSnippetUnread,
                          ]}
                          numberOfLines={2}
                        >
                          {thread.last_message || "Belum ada pesan."}
                        </Text>
                        {hasUnread && (
                          <View style={styles.unreadPill}>
                            <Text style={styles.unreadPillText}>
                              {thread.unread_count}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </SpringPressable>
                </React.Fragment>
              );
            })}
          </Card>
        )}
      </ScrollView>

      {/* Sheet Form Buat Pesan Baru */}
      <Sheet
        visible={newThreadModalVisible}
        onClose={() => setNewThreadModalVisible(false)}
        title="Mulai Pesan Baru"
      >
        <View style={styles.newThreadForm}>
          {/* Penerima Tetap: Wali Kelas */}
          <Label>Penerima Pesan</Label>
          <View style={styles.recipientRow}>
            <Avatar name={DEFAULT_TEACHER_NAME} size="md" />
            <View style={styles.recipientTextCol}>
              <Text style={styles.recipientName}>{DEFAULT_TEACHER_NAME}</Text>
              <Text style={styles.recipientRole}>
                Wali Kelas SDN Nusantara Harapan
              </Text>
            </View>
          </View>

          <Separator style={styles.formSeparator} />

          {/* Pemilihan Anak Asuh via Chip */}
          {students.length > 0 && (
            <View style={styles.formGroup}>
              <Label required>Pilih Siswa Terkait</Label>
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
                    accessibilityLabel={`Pilih siswa ${student.full_name}`}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Subjek Percakapan */}
          <View style={styles.formGroup}>
            <Label required>Subjek Percakapan</Label>
            <Input
              placeholder="Contoh: Konsultasi Nilai Matematika"
              value={subject}
              onChangeText={setSubject}
              accessibilityLabel="Input subjek percakapan"
            />
          </View>

          {/* Pesan Awal */}
          <View style={styles.formGroup}>
            <Label required>Pesan Awal</Label>
            <Input
              placeholder="Tuliskan pertanyaan atau hal yang ingin Anda sampaikan kepada wali kelas..."
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              numberOfLines={4}
              accessibilityLabel="Input isi pesan awal"
            />
          </View>

          {/* Alert Error jika ada kendala validasi / API */}
          {Boolean(formError) && (
            <Alert
              variant="destructive"
              title="Perhatian"
              description={formError || ""}
              style={styles.formAlert}
            />
          )}

          <Separator style={styles.formSeparator} />

          {/* Tombol Aksi Kirim */}
          <View style={styles.formButtonRow}>
            <Button
              title="Kirim Pesan"
              variant="default"
              loading={creatingThread}
              onPress={handleCreateThread}
              leftIcon={
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color={shadcn.primaryForeground}
                />
              }
              accessibilityLabel="Kirim pesan baru dan buka ruang percakapan"
            />
            <Button
              title="Batal"
              variant="outline"
              onPress={() => setNewThreadModalVisible(false)}
              accessibilityLabel="Batal membuat pesan baru"
            />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bento.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },
  serviceAlert: {},
  actionCard: {},
  threadsCard: {
    borderRadius: radius.xl,
    padding: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.card,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.lg,
    minHeight: touchTarget.minHeight,
    gap: spacing.md,
    backgroundColor: shadcn.card,
  },
  threadRowUnread: {
    backgroundColor: shadcn.background,
  },
  threadContentCol: {
    flex: 1,
  },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  threadTeacherName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  threadTimeText: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  threadSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginVertical: 4,
  },
  studentBadge: {
    paddingVertical: 2,
  },
  threadSubject: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
    color: shadcn.foreground,
    flex: 1,
  },
  threadBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    gap: spacing.sm,
  },
  threadSnippet: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.xs + 2,
    flex: 1,
  },
  threadSnippetUnread: {
    color: shadcn.foreground,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
  },
  unreadPill: {
    backgroundColor: bento.obsidian,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadPillText: {
    color: bento.obsidianForeground,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    fontVariant: ["tabular-nums"],
  },

  // Sheet Form Styles
  newThreadForm: {
    paddingBottom: spacing.xxl,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.secondary,
    marginBottom: spacing.xs,
    minHeight: touchTarget.minHeight,
  },
  recipientTextCol: {
    flex: 1,
  },
  recipientName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
  },
  recipientRole: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  studentChipsScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  formSeparator: {
    marginVertical: spacing.md,
  },
  formAlert: {
    marginBottom: spacing.md,
  },
  formButtonRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
