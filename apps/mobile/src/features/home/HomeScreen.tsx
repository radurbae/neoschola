import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  formatTanggalId,
  AttendanceStatus,
  type StudentDashboardResponse,
  type Announcement,
} from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  ChildSwitcher,
  PastelStatCard,
  MiniTrendChart,
  DarkActionCard,
  DarkIconRow,
  Separator,
  Chip,
  StateView,
  type TrendPoint,
  type PeriodOption,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  bento,
  shadcn,
  breakpoints,
  layout,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

const PERIODS: PeriodOption[] = [
  { key: "7H", label: "7H" },
  { key: "30H", label: "30H" },
  { key: "Sem", label: "Sem" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  const { user, students, activeStudent, activeStudentId, setActiveStudentId } =
    useAuth();

  const [dashboardData, setDashboardData] =
    useState<StudentDashboardResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activePeriod, setActivePeriod] = useState<string>("30H");
  const [activityFilter, setActivityFilter] = useState<"Jadwal" | "Tugas" | "Info">(
    "Jadwal"
  );

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
          err?.message ||
            "Gagal memuat ringkasan beranda. Periksa koneksi internet Anda."
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

  const hariIni = formatTanggalId(new Date().toISOString(), {
    includeDay: true,
  });

  const getAttendanceCallout = () => {
    if (!dashboardData?.attendance_today) {
      return "Belum Tercatat";
    }
    const att = dashboardData.attendance_today;
    switch (att.status) {
      case AttendanceStatus.HADIR:
        return att.check_in_time ? `Hadir ${att.check_in_time}` : "Hadir";
      case AttendanceStatus.SAKIT:
        return "Sakit";
      case AttendanceStatus.IZIN:
        return "Izin";
      case AttendanceStatus.ALPA:
        return "Alpa";
      default:
        return "Belum Tercatat";
    }
  };

  const attendancePercentage =
    dashboardData?.attendance_summary?.percentage ?? 100;

  const attendancePoints: TrendPoint[] = [
    { label: "Sen", value: 92 },
    { label: "Sel", value: 95 },
    { label: "Rab", value: 98 },
    { label: "Kam", value: 94 },
    { label: "Jum", value: 100 },
    { label: "Sab", value: 90 },
    { label: "Hari", value: attendancePercentage },
  ];

  const daruratAnnouncement = announcements.find((a) => a.category === "DARURAT");

  return (
    <Screen scroll={false} headerShown={false} style={styles.screen}>
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isTablet
              ? layout.tabletPaddingX
              : layout.mobilePaddingX,
            paddingTop: isTablet ? 8 : 4,
            paddingBottom: isTablet
              ? layout.scrollBottomPad
              : layout.mobileDockClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            tintColor={shadcn.primary}
          />
        }
      >
        <View style={styles.headerBlock}>
          <TopUtilityBar
            noHorizontalPadding
            title="Beranda"
            subtitle={hariIni}
            onPressAnnouncements={() => router.push("/pengumuman")}
            onPressNotifications={() => router.push("/notifications")}
            unreadCount={dashboardData?.unread_announcements_count || 0}
            profileName={user?.name || "Wali Murid"}
            onPressProfile={() => router.push("/(tabs)/profil")}
          />

          {students.length > 0 && (
            <ChildSwitcher
              students={students}
              activeStudentId={activeStudentId}
              onSelectStudent={(id) => setActiveStudentId(id)}
            />
          )}
        </View>

        {loading ? (
          <StateView
            type="loading"
            message="Memuat ringkasan beranda sekolah..."
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
          <>
            <View
              style={[
                styles.bentoRow,
                isTablet ? styles.bentoRowHorizontal : styles.bentoRowVertical,
              ]}
            >
              <View
                style={
                  isTablet ? styles.bentoRow1LeftColumn : styles.bentoFullColumn
                }
              >
                <MiniTrendChart
                  heroValue={`${attendancePercentage}%`}
                  heroLabel="Kehadiran Bulan Ini"
                  calloutText={getAttendanceCallout()}
                  points={attendancePoints}
                  periods={PERIODS}
                  activePeriod={activePeriod}
                  onPeriodChange={(key) => setActivePeriod(key)}
                  style={isTablet ? styles.trendChartFill : undefined}
                />
              </View>

              <View
                style={
                  isTablet ? styles.bentoRow1RightColumn : styles.bentoFullColumn
                }
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Ringkasan Anak</Text>
                </View>

                {isTablet ? (
                  <View style={styles.statCardsGridTablet}>
                    <PastelStatCard
                      tone="lavender"
                      value={`${dashboardData?.assignments_active?.length ?? 0} Tugas`}
                      label="Tugas Aktif"
                      trendText="Akademik"
                      icon="book-outline"
                      onPress={() => router.push("/(tabs)/akademik")}
                      accessibilityLabel="Buka modul akademik dan tugas"
                      style={styles.statCardItemTablet}
                    />
                    <PastelStatCard
                      tone="mint"
                      value={`${dashboardData?.attendance_summary?.hadir ?? 0} Hari`}
                      label="Kehadiran Hadir"
                      trendText="Tepat Waktu"
                      icon="checkmark-circle-outline"
                      onPress={() => router.push("/(tabs)/presensi")}
                      accessibilityLabel="Buka catatan presensi dan riwayat"
                      style={styles.statCardItemTablet}
                    />
                    <PastelStatCard
                      tone="butter"
                      value={`${dashboardData?.unpaid_invoices_count ?? 0} Tagihan`}
                      label="Tagihan SPP"
                      trendText={
                        dashboardData?.unpaid_invoices_count
                          ? "Perlu Pelunasan"
                          : "Lunas Semua"
                      }
                      icon="wallet-outline"
                      onPress={() => router.push("/(tabs)/keuangan")}
                      accessibilityLabel="Buka menu keuangan dan pembayaran SPP"
                      style={styles.statCardItemTablet}
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={188}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    style={styles.statCardsMobileStrip}
                    contentContainerStyle={styles.statCardsScrollMobile}
                  >
                    <PastelStatCard
                      tone="lavender"
                      value={`${dashboardData?.assignments_active?.length ?? 0} Tugas`}
                      label="Tugas Aktif"
                      trendText="Akademik"
                      icon="book-outline"
                      onPress={() => router.push("/(tabs)/akademik")}
                      accessibilityLabel="Buka modul akademik dan tugas"
                      style={styles.statCardItemMobile}
                    />
                    <PastelStatCard
                      tone="mint"
                      value={`${dashboardData?.attendance_summary?.hadir ?? 0} Hari`}
                      label="Kehadiran Hadir"
                      trendText="Tepat Waktu"
                      icon="checkmark-circle-outline"
                      onPress={() => router.push("/(tabs)/presensi")}
                      accessibilityLabel="Buka catatan presensi dan riwayat"
                      style={styles.statCardItemMobile}
                    />
                    <PastelStatCard
                      tone="butter"
                      value={`${dashboardData?.unpaid_invoices_count ?? 0} Tagihan`}
                      label="Tagihan SPP"
                      trendText={
                        dashboardData?.unpaid_invoices_count
                          ? "Perlu Pelunasan"
                          : "Lunas Semua"
                      }
                      icon="wallet-outline"
                      onPress={() => router.push("/(tabs)/keuangan")}
                      accessibilityLabel="Buka menu keuangan dan pembayaran SPP"
                      style={styles.statCardItemMobile}
                    />
                  </ScrollView>
                )}
              </View>
            </View>

            {/* BENTO ROW 2: Aktivitas Hari Ini (Kiri) & DarkActionCard (Kanan) */}
            <View
              style={[
                styles.bentoRow,
                isTablet ? styles.bentoRowHorizontal : styles.bentoRowVertical,
              ]}
            >
              {/* Kiri: Aktivitas Hari Ini dengan Filter Chip */}
              <View
                style={
                  isTablet ? styles.bentoRow2LeftColumn : styles.bentoFullColumn
                }
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Aktivitas Hari Ini</Text>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterChipRow}>
                  <Chip
                    label="Jadwal"
                    selected={activityFilter === "Jadwal"}
                    count={dashboardData?.schedules_today?.length}
                    onPress={() => setActivityFilter("Jadwal")}
                    accessibilityLabel="Tampilkan jadwal hari ini"
                  />
                  <Chip
                    label="Tugas"
                    selected={activityFilter === "Tugas"}
                    count={dashboardData?.assignments_active?.length}
                    onPress={() => setActivityFilter("Tugas")}
                    accessibilityLabel="Tampilkan tugas aktif"
                  />
                  <Chip
                    label="Info"
                    selected={activityFilter === "Info"}
                    count={announcements.length}
                    onPress={() => setActivityFilter("Info")}
                    accessibilityLabel="Tampilkan pengumuman sekolah"
                  />
                </View>

                {/* Daftar Konten DarkIconRow dipisah Separator */}
                <View style={styles.activityListCard}>
                  {activityFilter === "Jadwal" && (
                    <>
                      {!dashboardData?.schedules_today ||
                      dashboardData.schedules_today.length === 0 ? (
                        <View style={styles.emptyInlineRow}>
                          <Text style={styles.emptyInlineText}>
                            Tidak ada jadwal kegiatan belajar di kelas hari ini.
                          </Text>
                        </View>
                      ) : (
                        dashboardData.schedules_today.map((schedule, idx) => (
                          <React.Fragment key={schedule.id}>
                            {idx > 0 && <Separator />}
                            <DarkIconRow
                              icon="time-outline"
                              title={schedule.subject}
                              subtitle={`${schedule.teacher_name} • Ruang ${schedule.room}`}
                              rightPrimary={`${schedule.start_time} - ${schedule.end_time}`}
                              rightSecondary="WIB"
                              onPress={() => router.push("/(tabs)/akademik")}
                              accessibilityLabel={`Jadwal: ${schedule.subject}, waktu ${schedule.start_time} sampai ${schedule.end_time}`}
                            />
                          </React.Fragment>
                        ))
                      )}
                    </>
                  )}

                  {activityFilter === "Tugas" && (
                    <>
                      {!dashboardData?.assignments_active ||
                      dashboardData.assignments_active.length === 0 ? (
                        <View style={styles.emptyInlineRow}>
                          <Text style={styles.emptyInlineText}>
                            Belum ada tugas atau pekerjaan rumah baru yang perlu
                            dikumpulkan.
                          </Text>
                        </View>
                      ) : (
                        dashboardData.assignments_active.map(
                          (assignment, idx) => (
                            <React.Fragment key={assignment.id}>
                              {idx > 0 && <Separator />}
                              <DarkIconRow
                                icon="document-text-outline"
                                title={assignment.title}
                                subtitle={`${assignment.subject} • ${
                                  assignment.description || "Tugas Belajar"
                                }`}
                                rightPrimary={formatTanggalId(
                                  assignment.due_date,
                                  { shortMonth: true }
                                )}
                                rightSecondary="Tenggat"
                                rightSecondaryTone="warning"
                                onPress={() => router.push("/(tabs)/akademik")}
                                accessibilityLabel={`Tugas: ${assignment.title}, mata pelajaran ${assignment.subject}`}
                              />
                            </React.Fragment>
                          )
                        )
                      )}
                    </>
                  )}

                  {activityFilter === "Info" && (
                    <>
                      {announcements.length === 0 ? (
                        <View style={styles.emptyInlineRow}>
                          <Text style={styles.emptyInlineText}>
                            Belum ada pengumuman sekolah baru.
                          </Text>
                        </View>
                      ) : (
                        announcements.slice(0, 4).map((ann, idx) => (
                          <React.Fragment key={ann.id}>
                            {idx > 0 && <Separator />}
                            <DarkIconRow
                              icon={
                                ann.category === "DARURAT"
                                  ? "alert-circle-outline"
                                  : "megaphone-outline"
                              }
                              title={ann.title}
                              subtitle={ann.content}
                              rightPrimary={formatTanggalId(ann.created_at, {
                                shortMonth: true,
                              })}
                              rightSecondary={ann.category}
                              rightSecondaryTone={
                                ann.category === "DARURAT" ? "danger" : "info"
                              }
                              onPress={() => router.push("/pengumuman")}
                              accessibilityLabel={`Pengumuman: ${ann.title}`}
                            />
                          </React.Fragment>
                        ))
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* Kanan: DarkActionCard */}
              <View
                style={
                  isTablet ? styles.bentoRow2RightColumn : styles.bentoFullColumn
                }
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Aksi & Layanan</Text>
                </View>

                {daruratAnnouncement ? (
                  <DarkActionCard
                    eyebrow="Darurat"
                    title={daruratAnnouncement.title}
                    description={daruratAnnouncement.content}
                    ctaLabel="Baca Info"
                    onPress={() => router.push("/pengumuman")}
                    style={isTablet ? styles.actionCardFill : undefined}
                  />
                ) : (
                  <DarkActionCard
                    eyebrow="Cepat"
                    title="Ajukan Izin Lebih Cepat"
                    description="Beritahukan ketidakhadiran atau kondisi kesehatan ananda langsung kepada wali kelas melalui formulir digital."
                    ctaLabel="Ajukan Izin"
                    onPress={() => router.push("/(tabs)/presensi")}
                    style={isTablet ? styles.actionCardFill : undefined}
                  />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: bento.surface,
  },
  headerBlock: {
    gap: 12,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: layout.sectionGap,
  },
  bentoRow: {
    gap: spacing.lg,
  },
  bentoRowHorizontal: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
  },
  bentoRowVertical: {
    flexDirection: "column",
  },
  bentoRow1LeftColumn: {
    flex: 1.05,
    alignSelf: "stretch",
  },
  bentoRow1RightColumn: {
    flex: 1.35,
    alignSelf: "stretch",
  },
  bentoRow2LeftColumn: {
    flex: 1.55,
  },
  bentoRow2RightColumn: {
    flex: 1,
    alignSelf: "stretch",
  },
  bentoFullColumn: {
    width: "100%",
  },
  trendChartFill: {
    flex: 1,
    alignSelf: "stretch",
  },
  actionCardFill: {
    alignItems: "stretch",
  },
  sectionHeaderRow: {
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  statCardsGridTablet: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    flex: 1,
  },
  statCardItemTablet: {
    flex: 1,
    alignSelf: "stretch",
  },
  statCardsMobileStrip: {
    marginHorizontal: -layout.mobilePaddingX,
  },
  statCardsScrollMobile: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: layout.mobilePaddingX,
    paddingVertical: spacing.xs,
  },
  statCardItemMobile: {
    width: 176,
    minHeight: 164,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  activityListCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
    overflow: "hidden",
  },
  emptyInlineRow: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.minHeight,
  },
  emptyInlineText: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    textAlign: "center",
  },
});
