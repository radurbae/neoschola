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
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  SectionHeader,
  ChildSwitcher,
  StateView,
  Separator,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../../theme/tokens";

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
        return { label: "Alpa", variant: "destructive" };
      default:
        return { label: "Belum Ada Catatan", variant: "neutral" };
    }
  };

  const hariIni = formatTanggalId(new Date().toISOString(), { includeDay: true });

  return (
    <Screen scroll={false} headerShown={false} style={styles.screen}>
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
            <Ionicons name="notifications-outline" size={22} color={shadcn.foreground} />
            {Boolean(
              dashboardData?.unread_announcements_count &&
                dashboardData.unread_announcements_count > 0
            )}
            {dashboardData?.unread_announcements_count ? (
              <View style={styles.notificationBadgeDot} />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push("/(tabs)/profil")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka profil dan pengaturan akun"
          >
            <Ionicons name="person-outline" size={22} color={shadcn.foreground} />
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
              tintColor={shadcn.primary}
            />
          }
        >
          {/* 1. Status Presensi Hari Ini (Monokrom Tenang, tanpa blok hijau tebal) */}
          <Card style={styles.attendanceCard}>
            <View style={styles.attendanceHeaderRow}>
              <View style={styles.attendanceIconBox}>
                <Ionicons name="calendar-outline" size={20} color={shadcn.foreground} />
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

            <Separator style={styles.attendanceSeparator} />

            <View style={styles.attendanceTimeRow}>
              <View style={styles.attendanceTimeItem}>
                <Text style={styles.attendanceTimeLabel}>Jam Masuk</Text>
                <Text style={styles.attendanceTimeValue}>
                  {dashboardData?.attendance_today?.check_in_time
                    ? `${dashboardData.attendance_today.check_in_time} WIB`
                    : "-"}
                </Text>
              </View>

              <View style={styles.attendanceTimeItem}>
                <Text style={styles.attendanceTimeLabel}>Jam Pulang</Text>
                <Text style={styles.attendanceTimeValue}>
                  {dashboardData?.attendance_today?.check_out_time
                    ? `${dashboardData.attendance_today.check_out_time} WIB`
                    : "-"}
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
                <Ionicons name="chevron-forward" size={14} color={shadcn.foreground} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* 2. Grid Ringkasan Cepat 2 Metrik Bersih */}
          <View style={styles.quickStatsRow}>
            {/* Tagihan Aktif */}
            <TouchableOpacity
              style={styles.quickStatCard}
              onPress={() => router.push("/(tabs)/keuangan")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${dashboardData?.unpaid_invoices_count || 0} tagihan belum dibayar. Tekan untuk melihat rincian.`}
            >
              <View style={styles.statIconBox}>
                <Ionicons name="wallet-outline" size={18} color={shadcn.foreground} />
              </View>
              <Text style={styles.quickStatValue}>
                {dashboardData?.unpaid_invoices_count || 0}
              </Text>
              <Text style={styles.quickStatLabel}>Tagihan Aktif</Text>
              <View style={styles.statActionRow}>
                <Text style={styles.quickStatActionHint}>Buka Keuangan</Text>
                <Ionicons name="arrow-forward" size={12} color={shadcn.foreground} />
              </View>
            </TouchableOpacity>

            {/* Pengumuman Sekolah */}
            <TouchableOpacity
              style={styles.quickStatCard}
              onPress={() => router.push("/pengumuman")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${dashboardData?.unread_announcements_count || 0} pengumuman sekolah belum dibaca. Tekan untuk membuka.`}
            >
              <View style={styles.statIconBox}>
                <Ionicons name="megaphone-outline" size={18} color={shadcn.foreground} />
              </View>
              <Text style={styles.quickStatValue}>
                {dashboardData?.unread_announcements_count || 0}
              </Text>
              <Text style={styles.quickStatLabel}>Pengumuman</Text>
              <View style={styles.statActionRow}>
                <Text style={styles.quickStatActionHint}>Lihat Semua</Text>
                <Ionicons name="arrow-forward" size={12} color={shadcn.foreground} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Tombol Aksi Cepat */}
          <View style={styles.quickActionsRow}>
            <Button
              title="Ajukan Izin / Sakit"
              onPress={() => router.push("/(tabs)/presensi")}
              variant="default"
              leftIcon={<Ionicons name="document-text-outline" size={18} color={shadcn.primaryForeground} />}
              style={styles.quickActionButton}
              accessibilityLabel="Buka formulir pengajuan izin atau sakit anak"
            />
            <Button
              title="Semua Pengumuman"
              onPress={() => router.push("/pengumuman")}
              variant="outline"
              leftIcon={<Ionicons name="newspaper-outline" size={18} color={shadcn.foreground} />}
              style={styles.quickActionButton}
              accessibilityLabel="Lihat seluruh pengumuman sekolah"
            />
          </View>

          {/* 3. Jadwal Hari Ini (1 Card Rapi Tanpa Bersarang) */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Jadwal Pelajaran Hari Ini"
              subtitle={
                dashboardData?.schedules_today && dashboardData.schedules_today.length > 0
                  ? `${dashboardData.schedules_today.length} mata pelajaran`
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
                  <Ionicons name="chevron-forward" size={14} color={shadcn.foreground} />
                </TouchableOpacity>
              }
            />

            <Card style={styles.groupedListCard}>
              {!dashboardData?.schedules_today || dashboardData.schedules_today.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Tidak ada jadwal kegiatan belajar di kelas untuk hari ini.
                  </Text>
                </View>
              ) : (
                dashboardData.schedules_today.map((schedule, idx) => (
                  <React.Fragment key={schedule.id}>
                    {idx > 0 && <Separator />}
                    <View style={styles.scheduleRow}>
                      <View style={styles.scheduleTimeCol}>
                        <Text style={styles.scheduleTimeText}>{schedule.start_time}</Text>
                        <Text style={styles.scheduleTimeSubText}>{schedule.end_time}</Text>
                      </View>
                      <View style={styles.scheduleDividerLine} />
                      <View style={styles.scheduleDetailCol}>
                        <Text style={styles.scheduleSubjectText}>{schedule.subject}</Text>
                        <View style={styles.scheduleMetaRow}>
                          <Text style={styles.scheduleTeacherText}>
                            {schedule.teacher_name}
                          </Text>
                          <Text style={styles.scheduleMetaDot}>•</Text>
                          <Text style={styles.scheduleRoomText}>{schedule.room}</Text>
                        </View>
                      </View>
                    </View>
                  </React.Fragment>
                ))
              )}
            </Card>
          </View>

          {/* 4. Tugas / PR Aktif (1 Card Rapi Tanpa Bersarang) */}
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
                  <Ionicons name="chevron-forward" size={14} color={shadcn.foreground} />
                </TouchableOpacity>
              }
            />

            <Card style={styles.groupedListCard}>
              {!dashboardData?.assignments_active || dashboardData.assignments_active.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Belum ada tugas atau pekerjaan rumah baru yang perlu dikumpulkan.
                  </Text>
                </View>
              ) : (
                dashboardData.assignments_active.map((assignment, idx) => (
                  <React.Fragment key={assignment.id}>
                    {idx > 0 && <Separator />}
                    <View style={styles.assignmentRow}>
                      <View style={styles.assignmentHeaderLine}>
                        <Badge label={assignment.subject} variant="secondary" />
                        <Text style={styles.dueDateText}>
                          Tenggat: {formatTanggalId(assignment.due_date, { shortMonth: true })}
                        </Text>
                      </View>
                      <Text style={styles.assignmentTitleText}>{assignment.title}</Text>
                      {Boolean(assignment.description) && (
                        <Text style={styles.assignmentDescText} numberOfLines={2}>
                          {assignment.description}
                        </Text>
                      )}
                    </View>
                  </React.Fragment>
                ))
              )}
            </Card>
          </View>

          {/* 5. 2 Pengumuman Terbaru (1 Card Rapi Tanpa Bersarang) */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Pengumuman Terbaru"
              subtitle="Informasi resmi dari pihak sekolah"
              rightAction={
                <TouchableOpacity
                  style={styles.sectionLinkButton}
                  onPress={() => router.push("/pengumuman")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat seluruh daftar pengumuman sekolah"
                >
                  <Text style={styles.sectionLinkText}>Lihat Semua</Text>
                  <Ionicons name="chevron-forward" size={14} color={shadcn.foreground} />
                </TouchableOpacity>
              }
            />

            <Card style={styles.groupedListCard}>
              {announcements.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Belum ada pengumuman baru dari sekolah.
                  </Text>
                </View>
              ) : (
                announcements.slice(0, 2).map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <Separator />}
                    <TouchableOpacity
                      style={styles.announcementRow}
                      onPress={() => router.push("/pengumuman")}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Pengumuman: ${item.title}. ${item.content}`}
                    >
                      <View style={styles.announcementHeaderLine}>
                        <Badge
                          label={item.category}
                          variant={item.category === "DARURAT" ? "destructive" : "outline"}
                        />
                        <Text style={styles.announcementDateText}>
                          {formatTanggalId(item.created_at, { shortMonth: true })}
                        </Text>
                      </View>
                      <Text style={styles.announcementTitleText}>{item.title}</Text>
                      <Text style={styles.announcementContentText} numberOfLines={2}>
                        {item.content}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))
              )}
            </Card>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: shadcn.canvas,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
  },
  headerInfoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  schoolBadgeText: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: shadcn.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    marginTop: 2,
    letterSpacing: typography.tracking.snug,
  },
  dateSubtitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 1,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.background,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
    position: "relative",
  },
  notificationBadgeDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: shadcn.destructive,
  },
  childSwitcherWrapper: {
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Attendance Card
  attendanceCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  attendanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendanceIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: shadcn.secondary,
    borderWidth: 1,
    borderColor: shadcn.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  attendanceTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  attendanceTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  attendanceSubtitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 1,
  },
  attendanceSeparator: {
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
    color: shadcn.mutedForeground,
  },
  attendanceTimeValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
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
    color: shadcn.foreground,
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
    backgroundColor: shadcn.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: shadcn.secondary,
    borderWidth: 1,
    borderColor: shadcn.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  quickStatValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    letterSpacing: typography.tracking.snug,
  },
  quickStatLabel: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },
  statActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: 2,
  },
  quickStatActionHint: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  // Quick Action Buttons
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
  },
  // Section Headers & Common List Cards
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
    color: shadcn.foreground,
    marginRight: 2,
  },
  groupedListCard: {
    padding: 0,
    overflow: "hidden",
  },
  emptyInlineRow: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInlineText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    textAlign: "center",
  },
  // Schedule Rows
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  scheduleTimeCol: {
    width: 58,
    alignItems: "flex-start",
  },
  scheduleTimeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  scheduleTimeSubText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  scheduleDividerLine: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: shadcn.border,
    marginHorizontal: spacing.md,
  },
  scheduleDetailCol: {
    flex: 1,
  },
  scheduleSubjectText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  scheduleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  scheduleTeacherText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  scheduleMetaDot: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    marginHorizontal: spacing.xs,
  },
  scheduleRoomText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  // Assignment Rows
  assignmentRow: {
    padding: spacing.md,
  },
  assignmentHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  assignmentTitleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  assignmentDescText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
  // Announcement Rows
  announcementRow: {
    padding: spacing.md,
  },
  announcementHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  announcementDateText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  announcementTitleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  announcementContentText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
});
