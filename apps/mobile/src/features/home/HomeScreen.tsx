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
import {
  formatTanggalId,
  AttendanceStatus,
  type StudentDashboardResponse,
  type Announcement,
} from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Button,
  SectionHeader,
  ChildSwitcher,
  StateView,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const { user, students, activeStudent, activeStudentId, setActiveStudentId } = useAuth();

  const [dashboardData, setDashboardData] = useState<StudentDashboardResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (!activeStudent?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const [dashRes, annRes] = await Promise.all([
          api.getStudentDashboard(activeStudent.id),
          api.getAnnouncements({ class_id: activeStudent.class_id }),
        ]);

        setDashboardData(dashRes);
        setAnnouncements(annRes.announcements || []);
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Gagal memuat ringkasan beranda. Periksa koneksi internet Anda."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStudent?.id, activeStudent?.class_id]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "Selamat Datang";
    if (hour >= 4 && hour < 11) timeGreeting = "Selamat Pagi";
    else if (hour >= 11 && hour < 15) timeGreeting = "Selamat Siang";
    else if (hour >= 15 && hour < 18) timeGreeting = "Selamat Sore";
    else timeGreeting = "Selamat Malam";

    const name = user?.name ? user.name.split(" ")[0] : "Wali Murid";
    return `${timeGreeting}, ${name}`;
  };

  const getAttendanceBadge = (
    status?: AttendanceStatus | null
  ): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return { label: "Hadir", variant: "success" };
      case AttendanceStatus.SAKIT:
        return { label: "Sakit", variant: "warning" };
      case AttendanceStatus.IZIN:
        return { label: "Izin", variant: "info" };
      case AttendanceStatus.ALPA:
        return { label: "Alpa", variant: "danger" };
      default:
        return { label: "Belum Ada Catatan", variant: "neutral" };
    }
  };

  const hariIni = formatTanggalId(new Date().toISOString(), { includeDay: true });

  return (
    <Screen
      scroll={false}
      headerShown={false}
    >
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerInfoCol}>
          <Text style={styles.schoolBadgeText}>SDN Nusantara Harapan</Text>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {getGreeting()}
          </Text>
          <Text style={styles.dateSubtitle}>{hariIni}</Text>
        </View>

        <View style={styles.headerActionsRow}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka pusat notifikasi"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            {Boolean(dashboardData?.unread_announcements_count && dashboardData.unread_announcements_count > 0) && (
              <View style={styles.notificationBadgeDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push("/(tabs)/profil")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka profil dan pengaturan akun"
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Child Switcher Component */}
      {students.length > 0 && (
        <View style={styles.childSwitcherWrapper}>
          <ChildSwitcher
            students={students}
            activeStudentId={activeStudentId}
            onSelectStudent={(id) => setActiveStudentId(id)}
          />
        </View>
      )}

      {/* Main Content Body */}
      {loading ? (
        <StateView
          type="loading"
          message="Memuat data beranda sekolah..."
        />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Beranda"
          message={errorMessage}
          actionLabel="Coba Lagi"
          onAction={() => fetchDashboard()}
        />
      ) : !activeStudent ? (
        <StateView
          type="empty"
          title="Tidak Ada Siswa Terhubung"
          message="Akun Anda belum terhubung dengan data peserta didik aktif. Silakan hubungi Tata Usaha sekolah."
          actionLabel="Muat Ulang"
          onAction={() => fetchDashboard()}
        />
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDashboard(true)}
              tintColor={colors.primary}
            />
          }
        >
          {/* 1. Status Presensi Hari Ini */}
          <Card style={styles.attendanceCard}>
            <View style={styles.attendanceHeaderRow}>
              <View style={styles.attendanceIconCircle}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.attendanceTitleCol}>
                <Text style={styles.attendanceTitle}>Presensi Hari Ini</Text>
                <Text style={styles.attendanceSubtitle}>
                  {activeStudent.full_name} ({activeStudent.class_name || "Kelas"})
                </Text>
              </View>
              <Badge
                label={getAttendanceBadge(dashboardData?.attendance_today?.status).label}
                variant={getAttendanceBadge(dashboardData?.attendance_today?.status).variant}
              />
            </View>

            <View style={styles.attendanceTimeDivider} />

            <View style={styles.attendanceTimeRow}>
              <View style={styles.attendanceTimeItem}>
                <Text style={styles.attendanceTimeLabel}>Jam Masuk</Text>
                <Text style={styles.attendanceTimeValue}>
                  {dashboardData?.attendance_today?.check_in_time
                    ? `${dashboardData.attendance_today.check_in_time} WIB`
                    : "—"}
                </Text>
              </View>

              <View style={styles.attendanceTimeItem}>
                <Text style={styles.attendanceTimeLabel}>Jam Pulang</Text>
                <Text style={styles.attendanceTimeValue}>
                  {dashboardData?.attendance_today?.check_out_time
                    ? `${dashboardData.attendance_today.check_out_time} WIB`
                    : "—"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.attendanceDetailButton}
                onPress={() => router.push("/(tabs)/presensi")}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Lihat rincian riwayat presensi"
              >
                <Text style={styles.attendanceDetailButtonText}>Rincian</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* 2. Grid Ringkasan Cepat & Aksi Cepat */}
          <View style={styles.quickStatsRow}>
            {/* Tagihan Aktif */}
            <TouchableOpacity
              style={styles.quickStatCard}
              onPress={() => router.push("/(tabs)/keuangan")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${dashboardData?.unpaid_invoices_count || 0} tagihan belum dibayar. Tekan untuk melihat rincian.`}
            >
              <View style={styles.statIconBadgeDanger}>
                <Ionicons name="wallet-outline" size={20} color={colors.badge.danger.text} />
              </View>
              <Text style={styles.quickStatValue}>
                {dashboardData?.unpaid_invoices_count || 0}
              </Text>
              <Text style={styles.quickStatLabel}>Tagihan Aktif</Text>
              <Text style={styles.quickStatActionHint}>Buka Keuangan →</Text>
            </TouchableOpacity>

            {/* Pengumuman Belum Dibaca */}
            <TouchableOpacity
              style={styles.quickStatCard}
              onPress={() => router.push("/pengumuman")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${dashboardData?.unread_announcements_count || 0} pengumuman sekolah belum dibaca. Tekan untuk membuka.`}
            >
              <View style={styles.statIconBadgeInfo}>
                <Ionicons name="megaphone-outline" size={20} color={colors.badge.info.text} />
              </View>
              <Text style={styles.quickStatValue}>
                {dashboardData?.unread_announcements_count || 0}
              </Text>
              <Text style={styles.quickStatLabel}>Kabar Belum Dibaca</Text>
              <Text style={styles.quickStatActionHint}>Pengumuman →</Text>
            </TouchableOpacity>
          </View>

          {/* Tombol Aksi Cepat */}
          <View style={styles.quickActionsRow}>
            <Button
              title="Ajukan Izin / Sakit"
              onPress={() => router.push("/(tabs)/presensi")}
              variant="secondary"
              leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
              style={styles.quickActionButton}
              accessibilityLabel="Buka formulir pengajuan izin atau sakit anak"
            />
            <Button
              title="Semua Pengumuman"
              onPress={() => router.push("/pengumuman")}
              variant="outline"
              leftIcon={<Ionicons name="newspaper-outline" size={18} color={colors.primary} />}
              style={styles.quickActionButton}
              accessibilityLabel="Lihat seluruh pengumuman sekolah"
            />
          </View>

          {/* 3. Jadwal Hari Ini */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Jadwal Pelajaran Hari Ini"
              subtitle={
                dashboardData?.schedules_today && dashboardData.schedules_today.length > 0
                  ? `${dashboardData.schedules_today.length} mata pelajaran dijadwalkan`
                  : "Tidak ada jadwal kelas aktif hari ini"
              }
              rightAction={
                <TouchableOpacity
                  style={styles.sectionLinkButton}
                  onPress={() => router.push("/(tabs)/akademik")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat jadwal pelajaran mingguan lengkap"
                >
                  <Text style={styles.sectionLinkText}>Lihat Semua</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            {!dashboardData?.schedules_today || dashboardData.schedules_today.length === 0 ? (
              <Card style={styles.emptyInlineCard}>
                <Ionicons name="sunny-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.emptyInlineText}>
                  Tidak ada jadwal kegiatan belajar di kelas untuk hari ini.
                </Text>
              </Card>
            ) : (
              dashboardData.schedules_today.map((schedule) => (
                <Card key={schedule.id} style={styles.scheduleItemCard}>
                  <View style={styles.scheduleTimeCol}>
                    <Text style={styles.scheduleTimeText}>{schedule.start_time}</Text>
                    <Text style={styles.scheduleTimeDivider}>s/d</Text>
                    <Text style={styles.scheduleTimeText}>{schedule.end_time}</Text>
                  </View>
                  <View style={styles.scheduleDividerLine} />
                  <View style={styles.scheduleDetailCol}>
                    <Text style={styles.scheduleSubjectText}>{schedule.subject}</Text>
                    <Text style={styles.scheduleTeacherText}>
                      <Ionicons name="person-outline" size={12} color={colors.textSecondary} />{" "}
                      {schedule.teacher_name}
                    </Text>
                    <Text style={styles.scheduleRoomText}>
                      <Ionicons name="location-outline" size={12} color={colors.textSecondary} />{" "}
                      {schedule.room}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </View>

          {/* 4. Tugas / PR Aktif */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Tugas & PR Aktif"
              subtitle={
                dashboardData?.assignments_active && dashboardData.assignments_active.length > 0
                  ? `${dashboardData.assignments_active.length} tugas memerlukan perhatian`
                  : "Semua tugas telah terselesaikan"
              }
              rightAction={
                <TouchableOpacity
                  style={styles.sectionLinkButton}
                  onPress={() => router.push("/(tabs)/akademik")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Buka tab tugas dan pekerjaan rumah"
                >
                  <Text style={styles.sectionLinkText}>Semua Tugas</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            {!dashboardData?.assignments_active || dashboardData.assignments_active.length === 0 ? (
              <Card style={styles.emptyInlineCard}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.emptyInlineText}>
                  Bagus! Belum ada tugas atau pekerjaan rumah baru yang perlu dikumpulkan.
                </Text>
              </Card>
            ) : (
              dashboardData.assignments_active.map((assignment) => (
                <Card key={assignment.id} style={styles.assignmentItemCard}>
                  <View style={styles.assignmentHeaderRow}>
                    <Badge label={assignment.subject} variant="info" />
                    <View style={styles.dueDateBadge}>
                      <Ionicons name="time-outline" size={13} color={colors.badge.danger.text} />
                      <Text style={styles.dueDateText}>
                        Tenggat: {formatTanggalId(assignment.due_date, { shortMonth: true })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.assignmentTitleText}>{assignment.title}</Text>
                  {Boolean(assignment.description) && (
                    <Text style={styles.assignmentDescText} numberOfLines={2}>
                      {assignment.description}
                    </Text>
                  )}
                </Card>
              ))
            )}
          </View>

          {/* 5. 2 Pengumuman Terbaru */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Pengumuman Terbaru"
              subtitle="Informasi resmi dari pihak sekolah dan wali kelas"
              rightAction={
                <TouchableOpacity
                  style={styles.sectionLinkButton}
                  onPress={() => router.push("/pengumuman")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat seluruh daftar pengumuman sekolah"
                >
                  <Text style={styles.sectionLinkText}>Lihat Semua</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              }
            />

            {announcements.length === 0 ? (
              <Card style={styles.emptyInlineCard}>
                <Ionicons name="newspaper-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.emptyInlineText}>Belum ada pengumuman baru dari sekolah.</Text>
              </Card>
            ) : (
              announcements.slice(0, 2).map((item) => (
                <Card
                  key={item.id}
                  style={styles.announcementCard}
                  onPress={() => router.push("/pengumuman")}
                  accessibilityLabel={`Pengumuman: ${item.title}. ${item.content}`}
                >
                  <View style={styles.announcementHeaderRow}>
                    <Badge
                      label={item.category}
                      variant={item.category === "DARURAT" ? "danger" : "neutral"}
                    />
                    <Text style={styles.announcementDateText}>
                      {formatTanggalId(item.created_at, { shortMonth: true })}
                    </Text>
                  </View>
                  <Text style={styles.announcementTitleText}>{item.title}</Text>
                  <Text style={styles.announcementContentText} numberOfLines={2}>
                    {item.content}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  schoolBadgeText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  dateSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
    position: "relative",
  },
  notificationBadgeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: colors.badge.danger.text,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  childSwitcherWrapper: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Attendance Today Card
  attendanceCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  attendanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendanceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  attendanceTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  attendanceTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  attendanceSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  attendanceTimeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  attendanceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attendanceTimeItem: {
    flex: 1,
  },
  attendanceTimeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  attendanceTimeValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  attendanceDetailButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
  },
  attendanceDetailButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginRight: 2,
  },
  // Quick Stats Grid
  quickStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  statIconBadgeDanger: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.badge.danger.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statIconBadgeInfo: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.badge.info.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  quickStatValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.heavy,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  quickStatLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },
  quickStatActionHint: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  // Quick Actions Buttons Row
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
  },
  // Sections
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.xs,
  },
  sectionLinkText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginRight: 2,
  },
  emptyInlineCard: {
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  emptyInlineText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.xs,
  },
  // Schedule Items
  scheduleItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  scheduleTimeCol: {
    width: 68,
    alignItems: "center",
  },
  scheduleTimeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  scheduleTimeDivider: {
    fontSize: 10,
    color: colors.textMuted,
    marginVertical: 1,
  },
  scheduleDividerLine: {
    width: 1,
    height: "100%",
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  scheduleDetailCol: {
    flex: 1,
  },
  scheduleSubjectText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  scheduleTeacherText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleRoomText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  // Assignment Items
  assignmentItemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  dueDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.badge.danger.text,
    marginLeft: 3,
  },
  assignmentTitleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  assignmentDescText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: typography.lineHeight.xs,
  },
  // Announcement Items
  announcementCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  announcementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  announcementDateText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  announcementTitleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  announcementContentText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: typography.lineHeight.xs,
  },
});
