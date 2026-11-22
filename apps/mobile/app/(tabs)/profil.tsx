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
import { Screen, Card, Badge, Button, SectionHeader } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { colors, spacing, radius, typography, touchTarget } from "../../src/theme/tokens";

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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      }
    >
      {/* Kartu Profil Pengguna */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
            </Text>
          </View>
          <View style={styles.profileInfoCol}>
            <Text style={styles.profileName}>{user?.name || "Nama Pengguna"}</Text>
            <Text style={styles.profileEmail}>{user?.email || "email@sekolah.id"}</Text>
            <View style={styles.roleBadgeRow}>
              <Badge
                label={getRoleName(user?.role)}
                variant="success"
              />
            </View>
          </View>
        </View>

        <View style={styles.profileDivider} />

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

      {/* Daftar Anak Asuh (Khusus Wali Murid) */}
      {user?.role === "GUARDIAN" && (
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Daftar Anak Asuh"
            subtitle={`${students.length} siswa terhubung dengan akun ini`}
          />

          {students.length === 0 ? (
            <Card style={styles.emptyChildCard}>
              <Text style={styles.emptyChildText}>
                Belum ada data anak asuh yang terhubung. Hubungi Tata Usaha jika data anak Anda belum muncul.
              </Text>
            </Card>
          ) : (
            students.map((student) => (
              <Card key={student.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.childAvatarBadge}>
                    <Ionicons name="school-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.childTitleCol}>
                    <Text style={styles.childName}>{student.full_name}</Text>
                    <Text style={styles.childClass}>
                      {student.class_name || "Kelas"}
                    </Text>
                  </View>
                </View>

                <View style={styles.childDetailsGrid}>
                  <View style={styles.childDetailItem}>
                    <Text style={styles.childDetailLabel}>NIS</Text>
                    <Text style={styles.childDetailValue}>{student.nis}</Text>
                  </View>
                  <View style={styles.childDetailItem}>
                    <Text style={styles.childDetailLabel}>NISN</Text>
                    <Text style={styles.childDetailValue}>{student.nisn}</Text>
                  </View>
                  <View style={styles.childDetailItem}>
                    <Text style={styles.childDetailLabel}>Jenis Kelamin</Text>
                    <Text style={styles.childDetailValue}>
                      {student.gender === "L" ? "Laki-laki" : "Perempuan"}
                    </Text>
                  </View>
                  <View style={styles.childDetailItem}>
                    <Text style={styles.childDetailLabel}>Tanggal Lahir</Text>
                    <Text style={styles.childDetailValue}>
                      {formatTanggalId(student.birth_date)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {/* Kontak Darurat Sekolah */}
      <View style={styles.sectionContainer}>
        <SectionHeader
          title="Kontak Resmi Sekolah"
          subtitle="SDN Nusantara Harapan"
        />

        <Card style={styles.contactCard}>
          <View style={styles.contactItem}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Tata Usaha & Administrasi</Text>
              <Text style={styles.contactValue}>(021) 765-4321</Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          <View style={styles.contactItem}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="medkit-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>UKS (Unit Kesehatan Sekolah)</Text>
              <Text style={styles.contactValue}>0812-3456-7890</Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          <View style={styles.contactItem}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Pos Satpam & Keamanan</Text>
              <Text style={styles.contactValue}>0813-9876-5432</Text>
            </View>
          </View>

          <View style={styles.contactDivider} />

          <View style={styles.contactItem}>
            <View style={styles.contactIconCircle}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactLabel}>Jam Layanan Kantor</Text>
              <Text style={styles.contactValue}>Senin–Jumat 07.00–15.00 WIB</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Info Lingkungan Demo Sintetis */}
      <View style={styles.sectionContainer}>
        <SectionHeader
          title="Tentang Lingkungan Aplikasi"
          subtitle="NeoSchola v0.1.0"
        />

        <Card style={styles.demoNoticeCard}>
          <View style={styles.demoNoticeHeader}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.demoNoticeTitle}>Akun & Data Demo Sintetis</Text>
          </View>
          <Text style={styles.demoNoticeBody}>
            Aplikasi ini sedang berjalan dalam mode evaluasi dengan data sintetis aman. Tidak ada data pribadi nyata yang diproses atau disimpan ke server publik.
          </Text>
        </Card>
      </View>

      {/* Tombol Keluar Akun */}
      <View style={styles.logoutContainer}>
        <Button
          title="Keluar Akun"
          onPress={handleLogout}
          loading={loggingOut}
          variant="danger"
          leftIcon={
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.badge.danger.text}
            />
          }
          accessibilityLabel="Keluar dari akun Anda saat ini"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadgeRow: {
    marginTop: spacing.xs,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.border,
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
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  emptyChildCard: {
    padding: spacing.md,
  },
  emptyChildText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  childCard: {
    marginBottom: spacing.md,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  childAvatarBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  childTitleCol: {
    flex: 1,
  },
  childName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  childClass: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  childDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  childDetailItem: {
    width: "50%",
    marginBottom: spacing.xs,
  },
  childDetailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  childDetailValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  contactCard: {
    padding: spacing.md,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minHeight,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  contactValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  demoNoticeCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    padding: spacing.md,
  },
  demoNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  demoNoticeTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  demoNoticeBody: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.xs,
  },
  logoutContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
