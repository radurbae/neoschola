import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Role, LeaveStatus, InvoiceStatus, formatTanggalId } from "@neoschola/shared";
import { Screen, Card, Badge, Button, StateView, SectionHeader } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

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
            style={styles.iconButton}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun staf"
          >
            <Ionicons name="log-out-outline" size={24} color={colors.badge.danger.text} />
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Salam & Profil Staf */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarCircle}>
              <Ionicons
                name={isAdmin ? "briefcase" : "school"}
                size={26}
                color={colors.primary}
              />
            </View>
            <View style={styles.welcomeTextCol}>
              <View style={styles.badgeRow}>
                <Badge
                  label={roleLabel}
                  variant={isAdmin ? "warning" : "success"}
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
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
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
                    metrics.pendingLeaveCount > 0 && styles.metricCardHighlightWarning,
                  ]}
                  onPress={() => router.push("/(staff)/izin" as any)}
                  accessibilityLabel={`Tinjau ${metrics.pendingLeaveCount} permohonan izin pending`}
                >
                  <View style={styles.metricTopRow}>
                    <Text style={styles.metricLabel}>Antrean Izin</Text>
                    <Ionicons
                      name="hourglass-outline"
                      size={20}
                      color={
                        metrics.pendingLeaveCount > 0
                          ? colors.badge.warning.text
                          : colors.textSecondary
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
                    metrics.unreadMessageCount > 0 && styles.metricCardHighlightInfo,
                  ]}
                  onPress={() => router.push("/(staff)/pesan" as any)}
                  accessibilityLabel={`Buka ${metrics.unreadMessageCount} pesan wali murid belum dibaca`}
                >
                  <View style={styles.metricTopRow}>
                    <Text style={styles.metricLabel}>Pesan Wali</Text>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color={
                        metrics.unreadMessageCount > 0
                          ? colors.badge.info.text
                          : colors.textSecondary
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
                      metrics.waitingInvoiceCount > 0 && styles.metricCardHighlightWarning,
                    ]}
                    onPress={() => router.push("/(staff)/keuangan" as any)}
                    accessibilityLabel={`Verifikasi ${metrics.waitingInvoiceCount} pembayaran tagihan`}
                  >
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Verifikasi SPP</Text>
                      <Ionicons
                        name="wallet-outline"
                        size={20}
                        color={
                          metrics.waitingInvoiceCount > 0
                            ? colors.badge.warning.text
                            : colors.textSecondary
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

            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/(staff)/presensi" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Input Presensi Kelas"
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="calendar" size={22} color="#166534" />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Input Presensi Kelas</Text>
                  <Text style={styles.actionDescription}>
                    Catat kehadiran siswa secara cepat dan massal
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/(staff)/izin" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Tinjau Pengajuan Izin"
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#FEF9C3" }]}>
                  <Ionicons name="document-text" size={22} color="#854D0E" />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Tinjau Pengajuan Izin</Text>
                  <Text style={styles.actionDescription}>
                    Setujui atau tolak izin sakit / dispensasi dari wali
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/(staff)/pengumuman" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Publikasi Pengumuman"
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="megaphone" size={22} color="#1E40AF" />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Publikasi Pengumuman</Text>
                  <Text style={styles.actionDescription}>
                    Buat dan siarkan pengumuman sekolah atau kelas
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/(staff)/pesan" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Menuju Pesan Wali Murid"
              >
                <View style={[styles.actionIconBox, { backgroundColor: "#F3E8FF" }]}>
                  <Ionicons name="chatbubbles" size={22} color="#6B21A8" />
                </View>
                <View style={styles.actionTextBox}>
                  <Text style={styles.actionTitle}>Pesan Wali Murid</Text>
                  <Text style={styles.actionDescription}>
                    Konsultasi langsung dengan wali murid binaan
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/(staff)/keuangan" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isAdmin
                    ? "Menuju Verifikasi Tagihan & Keuangan"
                    : "Menuju Tugas & Catatan Akademik"
                }
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: isAdmin ? "#FEF3C7" : "#E0E7FF" },
                  ]}
                >
                  <Ionicons
                    name={isAdmin ? "card" : "school"}
                    size={22}
                    color={isAdmin ? "#92400E" : "#3730A3"}
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
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
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
  iconButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  welcomeTextCol: {
    flex: 1,
  },
  badgeRow: {
    marginBottom: spacing.xs,
  },
  welcomeName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  welcomeEmail: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
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
  },
  metricCardHighlightWarning: {
    borderColor: colors.badge.warning.border,
    backgroundColor: "#FFFBEB",
  },
  metricCardHighlightInfo: {
    borderColor: colors.badge.info.border,
    backgroundColor: "#F0F9FF",
  },
  metricTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    flex: 1,
  },
  metricNumber: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.heavy,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    marginVertical: spacing.xs,
  },
  metricNumberWarning: {
    color: colors.badge.warning.text,
  },
  metricNumberInfo: {
    color: colors.badge.info.text,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionsList: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  actionDescription: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
