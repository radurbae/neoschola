import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Role, LeaveStatus, InvoiceStatus, formatTanggalId } from "@neoschola/shared";
import {
  TopUtilityBar,
  PastelStatCard,
  MiniTrendChart,
  DarkActionCard,
  DarkIconRow,
  Separator,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  breakpoints,
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

  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [metrics, setMetrics] = useState<StaffMetrics>({
    studentCount: 0,
    pendingLeaveCount: 0,
    unreadMessageCount: 0,
    waitingInvoiceCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<string>("1M");

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const [studentsRes, leaveRes, threadsRes, invoicesRes] = await Promise.all([
        api.getStudents().catch(() => ({ students: [] })),
        api.getLeaveRequests().catch(() => ({ items: [] })),
        api.getThreads().catch(() => ({ threads: [] })),
        isAdmin ? api.getInvoices().catch(() => ({ invoices: [] })) : Promise.resolve({ invoices: [] }),
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

  return (
    <View style={styles.container}>
      <TopUtilityBar
        title="Ringkasan"
        subtitle={hariIni}
        profileName={user?.name || "Staf"}
        unreadCount={metrics.unreadMessageCount}
        onPressNotifications={() => router.push("/notifications")}
        onPressAnnouncements={() => router.push("/(staff)/pesan" as any)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMetrics(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
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
            {/* Bento Row 1: MiniTrendChart + 3 PastelStatCard */}
            <View style={isTablet ? styles.rowTablet : styles.rowMobile}>
              <View style={isTablet ? styles.colChartTablet : styles.colMobile}>
                <MiniTrendChart
                  heroValue="96%"
                  heroLabel="Kehadiran Siswa Hari Ini"
                  calloutText="+2.4% stabilitas"
                  points={[
                    { label: "Sen", value: 34 },
                    { label: "Sel", value: 35 },
                    { label: "Rab", value: 33 },
                    { label: "Kam", value: 36 },
                    { label: "Jum", value: 35 },
                  ]}
                  periods={[
                    { key: "1M", label: "1 Minggu" },
                    { key: "1B", label: "1 Bulan" },
                  ]}
                  activePeriod={trendPeriod}
                  onPeriodChange={setTrendPeriod}
                />
              </View>

              <View style={isTablet ? styles.colStatsTablet : styles.colStatsMobile}>
                <PastelStatCard
                  tone="lavender"
                  value={String(metrics.studentCount)}
                  label="Siswa Terpantau"
                  icon="people-outline"
                  trendText="Aktif di rombel"
                  style={styles.statCardItem}
                />
                <PastelStatCard
                  tone="mint"
                  value={String(metrics.pendingLeaveCount)}
                  label="Antrean Izin"
                  icon="hourglass-outline"
                  trendText="Menunggu ditinjau"
                  onPress={() => router.push("/(staff)/izin" as any)}
                  accessibilityLabel={`Tinjau ${metrics.pendingLeaveCount} permohonan izin pending`}
                  style={styles.statCardItem}
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
                  style={styles.statCardItem}
                />
              </View>
            </View>

            {/* Bento Row 2: Daftar Aksi Cepat (DarkIconRow) + DarkActionCard */}
            <View style={isTablet ? styles.rowTablet : styles.rowMobile}>
              <View style={isTablet ? styles.colFlexTablet : styles.colMobile}>
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

              <View style={isTablet ? styles.colFlexTablet : styles.colMobile}>
                <DarkActionCard
                  eyebrow="Harian"
                  title="Input Presensi Kelas Hari Ini"
                  description="Presensi kehadiran siswa kelas Anda untuk hari ini belum tersimpan lengkap. Segera lakukan perekaman presensi."
                  ctaLabel="Mulai Presensi"
                  onPress={() => router.push("/(staff)/presensi" as any)}
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
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  bentoContent: {
    gap: spacing.lg,
  },
  rowTablet: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "stretch",
  },
  rowMobile: {
    flexDirection: "column",
    gap: spacing.lg,
  },
  colChartTablet: {
    flex: 1.2,
  },
  colStatsTablet: {
    flex: 1,
    gap: spacing.md,
  },
  colStatsMobile: {
    flexDirection: "column",
    gap: spacing.md,
  },
  colFlexTablet: {
    flex: 1,
  },
  colMobile: {
    width: "100%",
  },
  statCardItem: {
    flex: 1,
  },
  actionsBox: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
