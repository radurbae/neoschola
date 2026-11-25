import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Role,
  LeaveStatus,
  InvoiceStatus,
  formatTanggalId,
  type Announcement,
  type StaffAttendanceSummaryResponse,
} from "@neoschola/shared";
import {
  TopUtilityBar,
  PastelStatCard,
  MiniTrendChart,
  DarkActionCard,
  UrgentAnnouncementBanner,
  DarkIconRow,
  Separator,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  dismissAnnouncementId,
  getDismissedAnnouncementIds,
  pickHighlightAnnouncement,
} from "../../lib/announcements";
import {
  breakpoints,
  layout,
  radius,
  shadcn,
  spacing,
  typography,
} from "../../theme/tokens";

interface StaffMetrics {
  studentCount: number;
  pendingLeaveCount: number;
  unreadMessageCount: number;
  waitingInvoiceCount: number;
}

export function StaffDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  const { user, unreadNotificationCount } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [metrics, setMetrics] = useState<StaffMetrics>({
    studentCount: 0,
    pendingLeaveCount: 0,
    unreadMessageCount: 0,
    waitingInvoiceCount: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<string>("1M");
  const [attendanceSummary, setAttendanceSummary] =
    useState<StaffAttendanceSummaryResponse | null>(null);

  useEffect(() => {
    setDismissedIds(getDismissedAnnouncementIds(user?.id));
  }, [user?.id]);

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const [
        studentsRes,
        leaveRes,
        threadsRes,
        invoicesRes,
        announcementsRes,
        summaryRes,
      ] = await Promise.all([
        api.getStudents().catch(() => ({ students: [] })),
        api.getLeaveRequests().catch(() => ({ items: [] })),
        api.getThreads().catch(() => ({ threads: [] })),
        isAdmin
          ? api.getInvoices().catch(() => ({ invoices: [] }))
          : Promise.resolve({ invoices: [] }),
        api.getAnnouncements().catch(() => ({ announcements: [] })),
        api.getAttendanceSummary().catch(() => null),
      ]);

      const pendingLeaves = (leaveRes.items || []).filter(
        (item) => item.status === LeaveStatus.PENDING
      ).length;

      const unreadMessages = (threadsRes.threads || []).reduce(
        (acc, thread) => acc + (thread.unread_count || 0),
        0
      );

      const waitingInvoices = (invoicesRes.invoices || []).filter(
        (inv) => inv.status === InvoiceStatus.WAITING_VERIFICATION
      ).length;

      setMetrics({
        studentCount: (studentsRes.students || []).length,
        pendingLeaveCount: pendingLeaves,
        unreadMessageCount: unreadMessages,
        waitingInvoiceCount: waitingInvoices,
      });
      setAnnouncements(announcementsRes.announcements || []);
      setAttendanceSummary(summaryRes);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat ringkasan data staf. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const hariIni = formatTanggalId(new Date().toISOString(), { includeDay: true });
  const highlightAnnouncement = pickHighlightAnnouncement(
    announcements,
    dismissedIds
  );

  return (
    <View style={styles.container}>
      <ScrollView
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
            onRefresh={() => fetchMetrics(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        <TopUtilityBar
          noHorizontalPadding
          title="Ringkasan"
          subtitle={hariIni}
          profileName={user?.name || "Staf"}
          unreadCount={unreadNotificationCount}
          onPressNotifications={() => router.push("/notifications")}
          onPressAnnouncements={() => router.push("/(staff)/pengumuman" as any)}
          onPressProfile={() => router.push("/(staff)/profil" as any)}
        />
        {loading && !refreshing ? (
          <StateView type="loading" message="Memuat ringkasan metrik sekolah..." />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Kendala Memuat Metrik"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchMetrics()}
          />
        ) : (
          <View style={styles.bentoContent}>
            {highlightAnnouncement && (
              <UrgentAnnouncementBanner
                title={highlightAnnouncement.title}
                content={highlightAnnouncement.content}
                category={highlightAnnouncement.category}
                isUrgent={highlightAnnouncement.category === "DARURAT"}
                dateLabel={formatTanggalId(highlightAnnouncement.created_at, {
                  shortMonth: true,
                })}
                onPress={() => router.push("/(staff)/pengumuman" as any)}
                onDismiss={() =>
                  setDismissedIds(
                    dismissAnnouncementId(highlightAnnouncement.id, user?.id)
                  )
                }
              />
            )}

            <View style={isTablet ? styles.rowTablet1 : styles.rowMobile}>
              <View style={isTablet ? styles.colChartTablet : styles.colMobile}>
                {(() => {
                  const staffPeriodKey = (trendPeriod === "1B" ? "1B" : "1M") as "1M" | "1B";
                  const activeTrend = attendanceSummary?.periods?.[staffPeriodKey] ?? null;
                  const hasToday = (attendanceSummary?.today?.recorded ?? 0) > 0;
                  const heroValue =
                    staffPeriodKey === "1M" &&
                    hasToday &&
                    attendanceSummary?.today.percentage !== null &&
                    attendanceSummary?.today.percentage !== undefined
                      ? `${attendanceSummary.today.percentage}%`
                      : activeTrend && activeTrend.total_records > 0
                      ? `${activeTrend.percentage}%`
                      : "-";
                  const heroLabel =
                    staffPeriodKey === "1M"
                      ? hasToday
                        ? "Kehadiran Siswa Hari Ini"
                        : "Kehadiran 1 Minggu Terakhir"
                      : "Kehadiran 30 Hari Terakhir";
                  const calloutText =
                    activeTrend?.callout || "Belum ada presensi hari ini";
                  const points = activeTrend?.points ?? [];

                  return (
                    <MiniTrendChart
                      heroValue={heroValue}
                      heroLabel={heroLabel}
                      calloutText={calloutText}
                      points={points}
                      periods={[
                        { key: "1M", label: "1 Minggu" },
                        { key: "1B", label: "1 Bulan" },
                      ]}
                      activePeriod={trendPeriod}
                      onPeriodChange={setTrendPeriod}
                      style={isTablet ? styles.chartFullHeight : undefined}
                    />
                  );
                })()}
              </View>

              {isTablet ? (
                <View style={styles.colStatsTablet}>
                  <PastelStatCard
                    tone="lavender"
                    value={String(metrics.studentCount)}
                    label="Siswa Terpantau"
                    icon="people-outline"
                    trendText="Aktif di rombel"
                    style={styles.statCardItemTablet}
                  />
                  <PastelStatCard
                    tone="mint"
                    value={String(metrics.pendingLeaveCount)}
                    label="Antrean Izin"
                    icon="hourglass-outline"
                    trendText="Menunggu ditinjau"
                    onPress={() => router.push("/(staff)/izin" as any)}
                    accessibilityLabel={`Tinjau ${metrics.pendingLeaveCount} permohonan izin pending`}
                    style={styles.statCardItemTablet}
                  />
                  <PastelStatCard
                    tone="butter"
                    value={
                      isAdmin
                        ? String(metrics.waitingInvoiceCount)
                        : String(metrics.unreadMessageCount)
                    }
                    label={isAdmin ? "Verifikasi SPP" : "Pesan Wali"}
                    icon={isAdmin ? "wallet-outline" : "chatbubble-ellipses-outline"}
                    trendText={isAdmin ? "Perlu konfirmasi" : "Pesan baru"}
                    onPress={() =>
                      router.push(
                        (isAdmin ? "/(staff)/keuangan" : "/(staff)/pesan") as any
                      )
                    }
                    accessibilityLabel={
                      isAdmin
                        ? `Verifikasi ${metrics.waitingInvoiceCount} pembayaran tagihan`
                        : `Buka ${metrics.unreadMessageCount} pesan wali murid belum dibaca`
                    }
                    style={styles.statCardItemTablet}
                  />
                </View>
              ) : (
                <View style={styles.mobileStripSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={180}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    contentContainerStyle={styles.mobileStripContent}
                    style={styles.mobileStrip}
                  >
                  <PastelStatCard
                    tone="lavender"
                    value={String(metrics.studentCount)}
                    label="Siswa Terpantau"
                    icon="people-outline"
                    trendText="Aktif di rombel"
                    style={styles.statCardItemMobile}
                  />
                  <PastelStatCard
                    tone="mint"
                    value={String(metrics.pendingLeaveCount)}
                    label="Antrean Izin"
                    icon="hourglass-outline"
                    trendText="Menunggu ditinjau"
                    onPress={() => router.push("/(staff)/izin" as any)}
                    accessibilityLabel={`Tinjau ${metrics.pendingLeaveCount} permohonan izin pending`}
                    style={styles.statCardItemMobile}
                  />
                  <PastelStatCard
                    tone="butter"
                    value={
                      isAdmin
                        ? String(metrics.waitingInvoiceCount)
                        : String(metrics.unreadMessageCount)
                    }
                    label={isAdmin ? "Verifikasi SPP" : "Pesan Wali"}
                    icon={isAdmin ? "wallet-outline" : "chatbubble-ellipses-outline"}
                    trendText={isAdmin ? "Perlu konfirmasi" : "Pesan baru"}
                    onPress={() =>
                      router.push(
                        (isAdmin ? "/(staff)/keuangan" : "/(staff)/pesan") as any
                      )
                    }
                    accessibilityLabel={
                      isAdmin
                        ? `Verifikasi ${metrics.waitingInvoiceCount} pembayaran tagihan`
                        : `Buka ${metrics.unreadMessageCount} pesan wali murid belum dibaca`
                    }
                    style={styles.statCardItemMobile}
                  />
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={isTablet ? styles.rowTablet2 : styles.rowMobile}>
              <View style={isTablet ? styles.colActionsTablet : styles.colMobile}>
                <View style={styles.actionsBox}>
                  <DarkIconRow
                    icon="calendar-outline"
                    title="Input Presensi Kelas"
                    subtitle="Catat kehadiran harian siswa secara massal"
                    onPress={() => router.push("/(staff)/presensi" as any)}
                    accessibilityLabel="Menuju Input Presensi Kelas"
                  />
                  <Separator />
                  <DarkIconRow
                    icon="document-text-outline"
                    title="Tinjau Pengajuan Izin"
                    subtitle="Setujui atau tolak izin sakit dan dispensasi"
                    rightSecondary={
                      metrics.pendingLeaveCount > 0
                        ? `${metrics.pendingLeaveCount} pending`
                        : undefined
                    }
                    rightSecondaryTone={
                      metrics.pendingLeaveCount > 0 ? "warning" : "neutral"
                    }
                    onPress={() => router.push("/(staff)/izin" as any)}
                    accessibilityLabel="Menuju Tinjau Pengajuan Izin"
                  />
                  <Separator />
                  <DarkIconRow
                    icon="megaphone-outline"
                    title="Publikasi Pengumuman"
                    subtitle="Siarkan maklumat sekolah dan kegiatan belajar"
                    onPress={() => router.push("/(staff)/pengumuman" as any)}
                    accessibilityLabel="Menuju Publikasi Pengumuman"
                  />
                  <Separator />
                  <DarkIconRow
                    icon="chatbubbles-outline"
                    title="Pesan Wali Murid"
                    subtitle="Konsultasi dan koordinasi dengan orang tua"
                    rightSecondary={
                      metrics.unreadMessageCount > 0
                        ? `${metrics.unreadMessageCount} pesan`
                        : undefined
                    }
                    rightSecondaryTone={
                      metrics.unreadMessageCount > 0 ? "info" : "neutral"
                    }
                    onPress={() => router.push("/(staff)/pesan" as any)}
                    accessibilityLabel="Menuju Pesan Wali Murid"
                  />
                  <Separator />
                  <DarkIconRow
                    icon={isAdmin ? "wallet-outline" : "school-outline"}
                    title={isAdmin ? "Verifikasi SPP & Tagihan" : "Kelola Tugas & Nilai"}
                    subtitle={
                      isAdmin
                        ? "Validasi bukti bayar kuitansi keuangan sekolah"
                        : "Kelola modul PR dan catatan hasil asesmen"
                    }
                    rightSecondary={
                      isAdmin && metrics.waitingInvoiceCount > 0
                        ? `${metrics.waitingInvoiceCount} tunggu`
                        : undefined
                    }
                    rightSecondaryTone={
                      isAdmin && metrics.waitingInvoiceCount > 0
                        ? "warning"
                        : "neutral"
                    }
                    onPress={() => router.push("/(staff)/keuangan" as any)}
                    accessibilityLabel={
                      isAdmin
                        ? "Menuju Keuangan Sekolah"
                        : "Menuju Akademik Siswa"
                    }
                  />
                </View>
              </View>

              <View style={isTablet ? styles.colActionCardTablet : styles.colMobile}>
                <DarkActionCard
                  eyebrow="Harian"
                  title="Input Presensi Kelas Hari Ini"
                  description="Presensi kehadiran siswa kelas Anda untuk hari ini belum tersimpan lengkap. Segera lakukan perekaman presensi."
                  ctaLabel="Mulai Presensi"
                  compact={!isTablet}
                  onPress={() => router.push("/(staff)/presensi" as any)}
                  style={isTablet ? styles.actionCardFullHeight : undefined}
                />
              </View>
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  bentoContent: {
    gap: layout.sectionGap,
  },
  rowTablet1: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
  },
  rowTablet2: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
  },
  rowMobile: {
    flexDirection: "column",
    gap: layout.bentoGap,
  },
  colChartTablet: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
  },
  chartFullHeight: {
    flex: 1,
    alignSelf: "stretch",
  },
  colStatsTablet: {
    flex: 1.45,
    minWidth: 0,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  statCardItemTablet: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 164,
    alignSelf: "stretch",
  },
  mobileStripSection: {
    width: "100%",
  },
  mobileStrip: {
    marginHorizontal: -layout.mobilePaddingX,
    flexGrow: 0,
  },
  mobileStripContent: {
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "stretch",
    paddingHorizontal: layout.mobilePaddingX,
    gap: 12,
  },
  statCardItemMobile: {
    flex: 1,
    minWidth: 168,
    height: 164,
  },
  colActionsTablet: {
    flex: 1.55,
  },
  colActionCardTablet: {
    flex: 1,
    alignItems: "stretch",
  },
  actionCardFullHeight: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  colMobile: {
    width: "100%",
  },
  actionsBox: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: 8,
  },
});
