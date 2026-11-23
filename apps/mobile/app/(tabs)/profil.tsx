import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId } from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Button,
  Avatar,
  Separator,
  SectionHeader,
} from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { shadcn, spacing, radius, typography, touchTarget } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, students, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case "GUARDIAN":
        return "Wali Murid";
      case "TEACHER":
        return "Guru / Wali Kelas";
      case "ADMIN":
        return "Admin Tata Usaha";
      default:
        return "Pengguna";
    }
  };

  return (
    <Screen
      scroll={true}
      headerShown={true}
      title="Profil & Pengaturan"
      subtitle="Informasi akun dan kontak sekolah"
      rightAction={
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke layar sebelumnya"
        >
          <Ionicons name="arrow-back" size={22} color={shadcn.foreground} />
        </TouchableOpacity>
      }
      style={styles.screen}
    >
      {/* 1. Kartu Profil Pengguna */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <Avatar name={user?.name || "Pengguna"} size="lg" />
          <View style={styles.profileInfoCol}>
            <Text style={styles.profileName}>{user?.name || "Nama Pengguna"}</Text>
            <Text style={styles.profileEmail}>{user?.email || "email@sekolah.id"}</Text>
            <View style={styles.roleBadgeRow}>
              <Badge
                label={getRoleName(user?.role)}
                variant="secondary"
              />
            </View>
          </View>
        </View>

        <Separator style={styles.cardSeparator} />

        <View style={styles.profileMetaRow}>
          <View style={styles.profileMetaItem}>
            <Text style={styles.metaLabel}>Nomor Telepon</Text>
            <Text style={styles.metaValue}>{user?.phone || "-"}</Text>
          </View>
          <View style={styles.profileMetaItem}>
            <Text style={styles.metaLabel}>ID Pengguna</Text>
            <Text style={styles.metaValue}>{user?.id || "-"}</Text>
          </View>
        </View>
      </Card>

      {/* 2. Daftar Anak Asuh (Khusus Wali Murid) */}
      {user?.role === "GUARDIAN" && (
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Daftar Anak Asuh"
            subtitle={`${students.length} siswa terhubung dengan akun ini`}
          />

          {students.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Belum ada data anak asuh yang terhubung. Hubungi Tata Usaha jika data anak Anda belum muncul.
              </Text>
            </Card>
          ) : (
            <Card style={styles.listCard}>
              {students.map((student, index) => (
                <React.Fragment key={student.id}>
                  {index > 0 && <Separator />}
                  <View style={styles.studentRow}>
                    <Avatar name={student.full_name} size="sm" />
                    <View style={styles.studentInfoCol}>
                      <View style={styles.studentNameLine}>
                        <Text style={styles.studentNameText}>{student.full_name}</Text>
                        <Badge label={student.class_name || "Kelas"} variant="outline" />
                      </View>
                      <View style={styles.studentDetailsRow}>
                        <Text style={styles.studentDetailLabel}>
                          NIS: <Text style={styles.studentDetailValue}>{student.nis}</Text>
                        </Text>
                        <Text style={styles.studentDetailDivider}>•</Text>
                        <Text style={styles.studentDetailLabel}>
                          NISN: <Text style={styles.studentDetailValue}>{student.nisn}</Text>
                        </Text>
                      </View>
                      <View style={styles.studentDetailsRow}>
                        <Text style={styles.studentDetailLabel}>
                          {student.gender === "L" ? "Laki-laki" : "Perempuan"}
                        </Text>
                        <Text style={styles.studentDetailDivider}>•</Text>
                        <Text style={styles.studentDetailLabel}>
                          Lahir: {formatTanggalId(student.birth_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          )}
        </View>
      )}

      {/* 3. Kontak Resmi Sekolah */}
      <View style={styles.sectionContainer}>
        <SectionHeader
          title="Kontak Resmi Sekolah"
          subtitle="SDN Nusantara Harapan"
        />

        <Card style={styles.listCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="call-outline" size={18} color={shadcn.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Tata Usaha & Administrasi</Text>
              <Text style={styles.contactValue}>(021) 765-4321</Text>
            </View>
          </View>

          <Separator />

          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="medkit-outline" size={18} color={shadcn.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>UKS (Unit Kesehatan Sekolah)</Text>
              <Text style={styles.contactValue}>0812-3456-7890</Text>
            </View>
          </View>

          <Separator />

          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={18} color={shadcn.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Pos Satpam & Keamanan</Text>
              <Text style={styles.contactValue}>0813-9876-5432</Text>
            </View>
          </View>

          <Separator />

          <View style={styles.contactRow}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="time-outline" size={18} color={shadcn.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Jam Layanan Kantor</Text>
              <Text style={styles.contactValue}>Senin - Jumat, 07.00 - 15.00 WIB</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* 4. Info Lingkungan Demo Sintetis */}
      <View style={styles.sectionContainer}>
        <SectionHeader
          title="Tentang Lingkungan Aplikasi"
          subtitle="NeoSchola v0.1.0"
        />

        <Card style={styles.demoNoticeCard}>
          <View style={styles.demoNoticeHeader}>
            <Ionicons name="information-circle-outline" size={20} color={shadcn.primary} />
            <Text style={styles.demoNoticeTitle}>Akun & Data Demo Sintetis</Text>
          </View>
          <Text style={styles.demoNoticeBody}>
            Aplikasi ini sedang berjalan dalam mode evaluasi dengan data sintetis aman. Tidak ada data pribadi nyata yang diproses atau disimpan ke server publik.
          </Text>
        </Card>
      </View>

      {/* 5. Tombol Keluar Akun */}
      <View style={styles.logoutContainer}>
        <Button
          title="Keluar Akun"
          onPress={handleLogout}
          loading={loggingOut}
          variant="destructive"
          leftIcon={
            <Ionicons
              name="log-out-outline"
              size={18}
              color={shadcn.destructiveForeground}
            />
          }
          style={styles.logoutBtn}
          accessibilityLabel="Keluar dari akun Anda saat ini"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: shadcn.canvas,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  profileEmail: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  roleBadgeRow: {
    marginTop: spacing.xs,
  },
  cardSeparator: {
    marginVertical: spacing.md,
  },
  profileMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileMetaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  emptyCard: {
    padding: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.sm,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
  },
  studentInfoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  studentNameLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: spacing.xs,
  },
  studentNameText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    flex: 1,
  },
  studentDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  studentDetailLabel: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  studentDetailValue: {
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  studentDetailDivider: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    marginHorizontal: spacing.xs,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  contactIconCircle: {
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
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
  },
  contactValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  demoNoticeCard: {
    padding: spacing.md,
    backgroundColor: shadcn.background,
  },
  demoNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  demoNoticeTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginLeft: spacing.xs,
  },
  demoNoticeBody: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.xs,
  },
  logoutContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoutBtn: {
    width: "100%",
  },
});
