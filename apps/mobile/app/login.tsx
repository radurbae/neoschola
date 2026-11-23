import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Role } from "@neoschola/shared";
import {
  Screen,
  Button,
  Input,
  Label,
  Separator,
  Alert,
  DarkIconRow,
} from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import {
  getActiveVariantConfig,
  isRoleAllowedInCurrentVariant,
} from "../src/config/appVariant";
import {
  bento,
  shadcn,
  breakpoints,
  layout,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../src/theme/tokens";

interface DemoAccount {
  role: Role;
  name: string;
  roleTitle: string;
  roleBadge: string;
  email: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: Role.GUARDIAN,
    name: "Budi Santoso",
    roleTitle: "Wali Murid (2 Anak: Raka 4A dan Nadia 2B)",
    roleBadge: "Wali Murid",
    email: "wali.budi@neoschola.demo",
    description: "Memantau presensi, SPP, dan pengumuman untuk 2 siswa.",
  },
  {
    role: Role.GUARDIAN,
    name: "Siti Rahmawati",
    roleTitle: "Wali Murid (1 Anak: Dimas 4A)",
    roleBadge: "Wali Murid",
    email: "wali.siti@neoschola.demo",
    description: "Memantau presensi harian Dimas di kelas 4A.",
  },
  {
    role: Role.TEACHER,
    name: "Ibu Ani Wijayanti, S.Pd.",
    roleTitle: "Wali Kelas 4A",
    roleBadge: "Wali Kelas",
    email: "guru.ani@neoschola.demo",
    description: "Input presensi massal, review izin, dan buat pengumuman.",
  },
  {
    role: Role.ADMIN,
    name: "Pak Hendra Setiawan",
    roleTitle: "Admin Tata Usaha",
    roleBadge: "Admin TU",
    email: "admin.tu@neoschola.demo",
    description: "Verifikasi pembayaran SPP dan kelola tagihan sekolah.",
  },
];

const DEFAULT_DEMO_PASSWORD = "neoschola123";

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const { login, isLoading } = useAuth();
  const variantConfig = getActiveVariantConfig();
  const visibleDemoAccounts = DEMO_ACCOUNTS.filter((account) =>
    isRoleAllowedInCurrentVariant(account.role)
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const targetEmail = (loginEmail ?? email).trim();
    const targetPassword = loginPassword ?? password;

    if (!targetEmail) {
      setErrorMessage("Silakan masukkan alamat email Anda.");
      return;
    }
    if (!targetPassword) {
      setErrorMessage("Silakan masukkan kata sandi Anda.");
      return;
    }

    setErrorMessage(null);
    try {
      await login(targetEmail, targetPassword);
      router.replace("/");
    } catch (err: any) {
      const msg =
        err?.message ||
        "Gagal masuk ke sistem. Pastikan email dan kata sandi Anda benar.";
      setErrorMessage(msg);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEFAULT_DEMO_PASSWORD);
    handleLogin(demoEmail, DEFAULT_DEMO_PASSWORD);
  };

  return (
    <Screen scroll={true} headerShown={false} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: isTablet
                ? layout.tabletPaddingX
                : layout.mobilePaddingX,
              paddingVertical: 32,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="normal"
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginCardWrapper}>
            {/* Header Monogram Krem & Identitas Sekolah */}
            <View style={styles.brandHeader}>
              <View style={styles.monogramBox}>
                <Text style={styles.monogramText}>NS</Text>
              </View>
              <Text style={styles.brandTitle}>{variantConfig.appName}</Text>
              <Text style={styles.brandSubtitle}>{variantConfig.subtitle}</Text>
            </View>

            {/* Form Masuk Utama */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Masuk ke Akun Anda</Text>
                <Text style={styles.formDescription}>
                  Gunakan email terdaftar dan kata sandi Anda untuk melanjutkan.
                </Text>
              </View>

              {Boolean(errorMessage) && (
                <Alert
                  variant="destructive"
                  description={errorMessage!}
                  style={styles.alertSpacing}
                />
              )}

              <View style={styles.fieldGroup}>
                <Label required>Alamat Email</Label>
                <Input
                  placeholder="nama@contoh.id"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftAddon={
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={shadcn.mutedForeground}
                    />
                  }
                  accessibilityLabel="Kolom input alamat email"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Label required>Kata Sandi</Label>
                <Input
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  leftAddon={
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={shadcn.mutedForeground}
                    />
                  }
                  rightAddon={
                    <TouchableOpacity
                      style={styles.showPasswordBtn}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={shadcn.mutedForeground}
                      />
                    </TouchableOpacity>
                  }
                  accessibilityLabel="Kolom input kata sandi"
                />
              </View>

              <Button
                title="Masuk Sekarang"
                onPress={() => handleLogin()}
                loading={isLoading}
                variant="default"
                size="lg"
                style={styles.loginBtn}
                accessibilityLabel="Tombol Masuk Sekarang"
              />
            </View>

            {/* Pemisah Masuk Cepat Akun Demo */}
            <View style={styles.separatorRow}>
              <Separator style={styles.separatorFlex} />
              <Text style={styles.separatorText}>Masuk Cepat Akun Demo</Text>
              <Separator style={styles.separatorFlex} />
            </View>

            {/* Daftar Akun Demo memakai DarkIconRow dipisah Separator */}
            <View style={styles.demoListCard}>
              {visibleDemoAccounts.map((account, index) => (
                <React.Fragment key={account.email}>
                  {index > 0 && <Separator />}
                  <DarkIconRow
                    icon="person-outline"
                    title={account.name}
                    subtitle={`${account.roleBadge} • ${account.description}`}
                    rightPrimary="Masuk"
                    rightSecondary={account.email}
                    rightSecondaryTone="neutral"
                    onPress={() => handleQuickLogin(account.email)}
                    accessibilityLabel={`Masuk cepat sebagai ${account.name}, ${account.roleTitle}`}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: bento.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: layout.scrollBottomPad,
    alignItems: "center",
  },
  loginCardWrapper: {
    width: "100%",
    maxWidth: 480,
    gap: 20,
  },
  brandHeader: {
    alignItems: "center",
  },
  monogramBox: {
    width: 52,
    height: 52,
    borderRadius: radius.xxl,
    backgroundColor: bento.creamBadge,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  monogramText: {
    color: bento.obsidian,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    letterSpacing: typography.tracking.snug,
  },
  brandTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.tight,
  },
  brandSubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.xl,
  },
  formHeader: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  formDescription: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginTop: 4,
  },
  alertSpacing: {
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  showPasswordBtn: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    width: "100%",
    marginTop: spacing.sm,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  separatorFlex: {
    flex: 1,
  },
  separatorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
    color: bento.pastelMutedText,
    marginHorizontal: spacing.sm,
  },
  demoListCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
});
