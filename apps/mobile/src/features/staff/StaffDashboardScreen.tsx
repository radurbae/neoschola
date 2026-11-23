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
import { Role, LeaveStatus, InvoiceStatus, formatTanggalId } from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Button,
  StateView,
  SectionHeader,
  Avatar,
  Separator,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget, shadows } from "../../theme/tokens";

interface StaffMetrics {
  studentCount: number;
  pendingLeaveCount: number;
  unreadMessageCount: number;
  waitingInvoiceCount: number;
}

export function StaffDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const roleLabel = isAdmin ? "Admin Tata Usaha" : "Wali Kelas";
  const hariIni = formatTanggalId(new Date().toISOString(), { includeDay: true });

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Dasbor Staf"
      subtitle={hariIni}
      rightAction={
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
          >
            <Ionicons name="notifications-outline" size={20} color={shadcn.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerLogoutButton]}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun staf"
          >
            <Ionicons name="log-out-outline" size={20} color={shadcn.destructive} />
          </TouchableOpacity>
        </View>
      }
    >
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
        {/* Salam & Profil Staf */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <Avatar
              name={user?.name || "Staf"}
              size="lg"
              style={styles.staffAvatar}
            />
            <View style={styles.welcomeTextCol}>
              <View style={styles.badgeRow}>
                <Badge
                  label={roleLabel}
                  variant="secondary"
                />
              </View>
              <Text style={styles.welcomeName}>
                {user?.name || "Bapak/Ibu Pendidik"}
              </Text>
              <Text style={styles.welcomeEmail}>
                {user?.email || "staf@neoschola.demo"}
              </Text>
            </View>
          </View>
        </Card>

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
          <>
            {/* Metrik Terpantau */}
            <SectionHeader
              title="Ringkasan Operasional"
              subtitle="Data terkini terpantau di sistem sekolah"
            />
            <View style={styles.metricsGrid}>
              {/* Siswa Terpantau */}
              <View style={styles.metricCardWrapper}>
                <Card style={styles.metricCard}>
                  <View style={styles.metricTopRow}>
                    <Text style={styles.metricLabel}>Siswa Terpantau</Text>
                    <Ionicons name="people-outline" size={18} color={shadcn.mutedForeground} />
                  </View>
                  <Text style={styles.metricNumber}>{metrics.studentCount}</Text>
                  <Text style={styles.metricSub}>Siswa aktif</Text>
                </Card>
              </View>

              {/* Antrean Izin */}
              <View style={styles.metricCardWrapper}>
                <Card
                  style={[
                    styles.metricCard,
                    metrics.pendingLeaveCount > 0 && styles.metricCardHighlight,
                  ]}
                  onPress={() => router.push("/(staff)/izin" as any)}
                  accessibilityLabel={`Tinjau ${metrics.pendingLeaveCount} permohonan izin pending`}
                >
                  <View style={styles.metricTopRow}>
                    <Text style={styles.metricLabel}>Antrean Izin</Text>
                    <Ionicons
                      name="hourglass-outline"
                      size={18}
                      color={
                        metrics.pendingLeaveCount > 0
                          ? shadcn.status.warning.text
                          : shadcn.mutedForeground
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.metricNumber,
                      metrics.pendingLeaveCount > 0 && styles.metricNumberWarning,
                    ]}
                  >
                    {metrics.pendingLeaveCount}
                  </Text>
                  <Text style={styles.metricSub}>Menunggu persetujuan</Text>
                </Card>
              </View>

              {/* Pesan Belum Dibaca */}
              <View style={styles.metricCardWrapper}>
                <Card
                  style={[
                    styles.metricCard,
                    metrics.unreadMessageCount > 0 && styles.metricCardHighlight,
                  ]}
                  onPress={() => router.push("/(staff)/pesan" as any)}
                  accessibilityLabel={`Buka ${metrics.unreadMessageCount} pesan wali murid belum dibaca`}
                >
                  <View style={styles.metricTopRow}>
                    <Text style={styles.metricLabel}>Pesan Wali</Text>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={
                        metrics.unreadMessageCount > 0
                          ? shadcn.status.info.text
                          : shadcn.mutedForeground
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.metricNumber,
                      metrics.unreadMessageCount > 0 && styles.metricNumberInfo,
                    ]}
                  >
                    {metrics.unreadMessageCount}
                  </Text>
                  <Text style={styles.metricSub}>Pesan belum dibaca</Text>
                </Card>
              </View>

              {/* Khusus Admin: Verifikasi Tagihan */}
              {isAdmin && (
                <View style={styles.metricCardWrapper}>
                  <Card
                    style={[
                      styles.metricCard,
                      metrics.waitingInvoiceCount > 0 && styles.metricCardHighlight,
                    ]}
                    onPress={() => router.push("/(staff)/keuangan" as any)}
                    accessibilityLabel={`Verifikasi ${metrics.waitingInvoiceCount} pembayaran tagihan`}
                  >
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Verifikasi SPP</Text>
                      <Ionicons
                        name="wallet-outline"
                        size={18}
                        color={
                          metrics.waitingInvoiceCount > 0
                            ? shadcn.status.warning.text
                            : shadcn.mutedForeground
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricNumber,
                        metrics.waitingInvoiceCount > 0 && styles.metricNumberWarning,
                      ]}
                    >
                      {metrics.waitingInvoiceCount}
                    </Text>
                    <Text style={styles.metricSub}>Menunggu verifikasi</Text>
                  </Card>
                </View>
              )}
            </View>

            {/* Aksi Cepat Staf */}
            <SectionHeader
              title="Aksi Cepat Staf"
              subtitle="Pintas navigasi ke modul tugas harian"
            />

            <Card style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/(staff)/presensi" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Input Presensi Kelas"
              >
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="calendar-outline" size={20} color={shadcn.foreground} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Input Presensi Kelas</Text>
                  <Text style={styles.actionDescription}>
                    Catat kehadiran siswa secara cepat dan massal
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={shadcn.mutedForeground} />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/(staff)/izin" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Tinjau Pengajuan Izin"
              >
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="document-text-outline" size={20} color={shadcn.foreground} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Tinjau Pengajuan Izin</Text>
                  <Text style={styles.actionDescription}>
                    Setujui atau tolak permohonan izin dari wali murid
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={shadcn.mutedForeground} />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/(staff)/pengumuman" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Publikasi Pengumuman"
              >
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="megaphone-outline" size={20} color={shadcn.foreground} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Publikasi Pengumuman</Text>
                  <Text style={styles.actionDescription}>
                    Buat dan siarkan pengumuman sekolah atau kelas
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={shadcn.mutedForeground} />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/(staff)/pesan" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Pesan Wali Murid"
              >
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="chatbubbles-outline" size={20} color={shadcn.foreground} />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Pesan Wali Murid</Text>
                  <Text style={styles.actionDescription}>
                    Konsultasi langsung dengan orang tua murid
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={shadcn.mutedForeground} />
              </TouchableOpacity>

              <Separator />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push("/(staff)/keuangan" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isAdmin
                    ? "Menuju Verifikasi Tagihan & Keuangan"
                    : "Menuju Tugas & Catatan Akademik"
                }
              >
                <View style={styles.actionIconWrapper}>
                  <Ionicons
                    name={isAdmin ? "wallet-outline" : "school-outline"}
                    size={20}
                    color={shadcn.foreground}
                  />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>
                    {isAdmin ? "Verifikasi Tagihan & SPP" : "Tugas & Nilai Akademik"}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {isAdmin
                      ? "Verifikasi bukti bayar dan terbitkan kuitansi resmi"
                      : "Kelola tugas PR kelas serta catatan nilai peserta didik"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={shadcn.mutedForeground} />
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.background,
    marginLeft: spacing.xs,
  },
  headerLogoutButton: {
    borderColor: shadcn.border,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  staffAvatar: {
    marginRight: spacing.md,
  },
  welcomeTextCol: {
    flex: 1,
  },
  badgeRow: {
    marginBottom: spacing.xs,
  },
  welcomeName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  welcomeEmail: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  metricCardWrapper: {
    width: "50%",
    paddingHorizontal: spacing.xs,
  },
  metricCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 104,
    justifyContent: "space-between",
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
  },
  metricCardHighlight: {
    borderColor: shadcn.border,
  },
  metricTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    flex: 1,
  },
  metricNumber: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginVertical: spacing.xs,
  },
  metricNumberWarning: {
    color: shadcn.status.warning.text,
  },
  metricNumberInfo: {
    color: shadcn.status.info.text,
  },
  metricSub: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  actionsCard: {
    padding: 0,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  actionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: shadcn.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionTextBox: {
    flex: 1,
    marginRight: spacing.sm,
  },
  actionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  actionDescription: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
});
