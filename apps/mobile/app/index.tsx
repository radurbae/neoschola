import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { formatTanggalId, formatRupiah } from "@neoschola/shared";
import { colors, spacing, radius, typography, touchTarget } from "../src/theme/tokens";

export default function HomeScreen() {
  const hariIni = formatTanggalId(new Date().toISOString(), { includeDay: true });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View style={styles.header}>
          <View style={styles.badgeSchool}>
            <Text style={styles.badgeSchoolText}>SDN Nusantara Harapan</Text>
          </View>
          <Text style={styles.title}>Selamat Datang di NeoSchola</Text>
          <Text style={styles.subtitle}>{hariIni}</Text>
        </View>

        {/* Demo Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Fondasi Sistem Siap</Text>
            <View style={styles.statusSuccess}>
              <Text style={styles.statusSuccessText}>Wave 0 Valid</Text>
            </View>
          </View>
          <Text style={styles.cardBody}>
            Monorepo terkonfigurasi lengkap dengan Bun SQLite backend, shared Zod
            contract, dan Expo Mobile Shell.
          </Text>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Contoh SPP</Text>
              <Text style={styles.statValue}>{formatRupiah(250000)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Akun Demo</Text>
              <Text style={styles.statValue}>4 Pengguna</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Siswa Demo</Text>
              <Text style={styles.statValue}>3 Anak</Text>
            </View>
          </View>
        </View>

        {/* Demo Accounts List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Akun Masuk Demo</Text>
          <Text style={styles.sectionSubtitle}>
            Gunakan kata sandi: neoschola123
          </Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>WALI MURID</Text>
          </View>
          <Text style={styles.accountName}>Budi Santoso</Text>
          <Text style={styles.accountEmail}>wali.budi@neoschola.demo</Text>
          <Text style={styles.accountMeta}>
            Siswa: Raka Pratama (4A), Nadia Putri (2B)
          </Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>WALI MURID</Text>
          </View>
          <Text style={styles.accountName}>Siti Rahmawati</Text>
          <Text style={styles.accountEmail}>wali.siti@neoschola.demo</Text>
          <Text style={styles.accountMeta}>Siswa: Dimas Mahendra (4A)</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.roleTagTeacher}>
            <Text style={styles.roleTagTeacherText}>GURU / WALI KELAS</Text>
          </View>
          <Text style={styles.accountName}>Ani Wijayanti, S.Pd.</Text>
          <Text style={styles.accountEmail}>guru.ani@neoschola.demo</Text>
          <Text style={styles.accountMeta}>Wali Kelas 4A</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.roleTagAdmin}>
            <Text style={styles.roleTagAdminText}>ADMIN TATA USAHA</Text>
          </View>
          <Text style={styles.accountName}>Hendra Setiawan</Text>
          <Text style={styles.accountEmail}>admin.tu@neoschola.demo</Text>
          <Text style={styles.accountMeta}>Pengelola Administrasi & SPP</Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Mulai Masuk Akun"
        >
          <Text style={styles.ctaButtonText}>Masuk ke Akun Anda</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  badgeSchool: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  badgeSchoolText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.xxl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  statusSuccess: {
    backgroundColor: colors.badge.success.bg,
    borderColor: colors.badge.success.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusSuccessText: {
    color: colors.badge.success.text,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  cardBody: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.badge.info.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  roleTagText: {
    color: colors.badge.info.text,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  roleTagTeacher: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  roleTagTeacherText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  roleTagAdmin: {
    alignSelf: "flex-start",
    backgroundColor: colors.badge.warning.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  roleTagAdminText: {
    color: colors.badge.warning.text,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  accountName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  accountEmail: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountMeta: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ctaButtonText: {
    color: colors.textInverse,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
});
