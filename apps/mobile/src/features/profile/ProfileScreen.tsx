import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId } from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  Avatar,
  Badge,
  Button,
  DarkIconRow,
  Separator,
  SpringPressable,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import { getHomeRouteForRole } from "../../config/appVariant";
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

export function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const { user, students, logout, unreadNotificationCount } = useAuth();
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(getHomeRouteForRole(user?.role) as any);
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
      >
        {/* Top Utility Bar menyatu di aliran scroll */}
        <TopUtilityBar
          noHorizontalPadding
          title="Profil"
          subtitle="Informasi akun dan kontak sekolah"
          unreadCount={unreadNotificationCount}
          onPressNotifications={() => router.push("/notifications")}
          leftAction={
            <SpringPressable
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke layar sebelumnya"
            >
              <Ionicons name="arrow-back" size={22} color={shadcn.foreground} />
            </SpringPressable>
          }
        />

        {/* 1. Kartu Profil Soft Ice Blue */}
        <View style={styles.profileCardIceBlue}>
          <View style={styles.profileHeaderRow}>
            <Avatar name={user?.name || "Pengguna"} size="lg" />
            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName}>
                {user?.name || "Nama Pengguna"}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || "email@sekolah.id"}
              </Text>
              <View style={styles.roleBadgeRow}>
                <Badge label={getRoleName(user?.role)} variant="secondary" />
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
        </View>

        {/* 2. Daftar Anak Asuh (Khusus Wali Murid) memakai DarkIconRow */}
        {user?.role === "GUARDIAN" && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Daftar Anak Asuh</Text>
              <Text style={styles.sectionSubheading}>
                {students.length} siswa terhubung dengan akun ini
              </Text>
            </View>

            <View style={styles.listCard}>
              {students.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Belum ada data anak asuh yang terhubung. Hubungi Tata Usaha
                    jika data anak Anda belum muncul.
                  </Text>
                </View>
              ) : (
                students.map((student, index) => (
                  <React.Fragment key={student.id}>
                    {index > 0 && <Separator />}
                    <DarkIconRow
                      icon="person-outline"
                      title={student.full_name}
                      subtitle={`Kelas ${
                        student.class_name || "Peserta Didik"
                      } • NIS ${student.nis} • NISN ${
                        student.nisn
                      } • Lahir ${formatTanggalId(student.birth_date)}`}
                      rightPrimary="Siswa"
                      rightSecondary={
                        student.gender === "L" ? "Laki-laki" : "Perempuan"
                      }
                      accessibilityLabel={`Data anak: ${student.full_name}, NIS ${student.nis}`}
                    />
                  </React.Fragment>
                ))
              )}
            </View>
          </View>
        )}

        {/* 3. Kontak Resmi Sekolah memakai DarkIconRow */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Kontak Resmi Sekolah</Text>
            <Text style={styles.sectionSubheading}>SDN Nusantara Harapan</Text>
          </View>

          <View style={styles.listCard}>
            <DarkIconRow
              icon="call-outline"
              title="Tata Usaha & Administrasi"
              subtitle="Layanan surat & administrasi sekolah"
              rightPrimary="(021) 765-4321"
              rightSecondary="Aktif"
              accessibilityLabel="Telepon Tata Usaha: (021) 765-4321"
            />
            <Separator />
            <DarkIconRow
              icon="medkit-outline"
              title="UKS (Unit Kesehatan Sekolah)"
              subtitle="Layanan kesehatan peserta didik"
              rightPrimary="0812-3456-7890"
              rightSecondary="Darurat"
              rightSecondaryTone="danger"
              accessibilityLabel="Telepon UKS: 0812-3456-7890"
            />
            <Separator />
            <DarkIconRow
              icon="shield-checkmark-outline"
              title="Pos Satpam & Keamanan"
              subtitle="Keamanan gerbang dan penjemputan"
              rightPrimary="0813-9876-5432"
              rightSecondary="24 Jam"
              accessibilityLabel="Telepon Satpam: 0813-9876-5432"
            />
            <Separator />
            <DarkIconRow
              icon="time-outline"
              title="Jam Layanan Kantor"
              subtitle="Senin sampai Jumat"
              rightPrimary="07.00 - 15.00 WIB"
              rightSecondary="Hari Kerja"
              accessibilityLabel="Jam layanan kantor: 07.00 sampai 15.00 WIB"
            />
          </View>
        </View>

        {/* 4. Tombol Keluar Akun */}
        <View style={styles.logoutContainer}>
          <Button
            title="Keluar Akun"
            onPress={handleLogout}
            loading={loggingOut}
            variant="destructive"
            size="lg"
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
      </ScrollView>
    </Screen>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: bento.surface,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    borderRadius: radius.full,
    backgroundColor: bento.pillSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: layout.sectionGap,
  },
  profileCardIceBlue: {
    backgroundColor: bento.iceBlue,
    borderRadius: radius.xxl,
    padding: layout.heroPadding,
    borderWidth: 0,
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
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  profileEmail: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  roleBadgeRow: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
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
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  sectionSubheading: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  listCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  logoutContainer: {
    marginTop: spacing.xs,
  },
  logoutBtn: {
    width: "100%",
  },
});
