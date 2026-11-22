import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, Input } from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { colors, spacing, radius, typography, touchTarget } from "../src/theme/tokens";

interface DemoAccount {
  name: string;
  roleTitle: string;
  email: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Budi Santoso",
    roleTitle: "Wali Murid (2 Anak: Raka 4A & Nadia 2B)",
    email: "wali.budi@neoschola.demo",
    description: "Memantau presensi, SPP, dan pengumuman untuk 2 siswa.",
  },
  {
    name: "Siti Rahmawati",
    roleTitle: "Wali Murid (1 Anak: Dimas 4A)",
    email: "wali.siti@neoschola.demo",
    description: "Memantau presensi harian Dimas di kelas 4A.",
  },
  {
    name: "Ibu Ani Wijayanti, S.Pd.",
    roleTitle: "Wali Kelas 4A",
    email: "guru.ani@neoschola.demo",
    description: "Input presensi massal, review izin, dan buat pengumuman.",
  },
  {
    name: "Pak Hendra Setiawan",
    roleTitle: "Admin Tata Usaha",
    email: "admin.tu@neoschola.demo",
    description: "Verifikasi pembayaran SPP dan kelola tagihan sekolah.",
  },
];

const DEFAULT_DEMO_PASSWORD = "neoschola123";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

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
    <Screen scroll={true} headerShown={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Identitas Sekolah */}
          <View style={styles.header}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>SDN Nusantara Harapan</Text>
            </View>
            <Text style={styles.appTitle}>NeoSchola</Text>
            <Text style={styles.appSubtitle}>
              Sistem Informasi Sekolah & Komunikasi Terpadu
            </Text>
          </View>

          {/* Form Masuk Utama */}
          <Card style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Masuk ke Akun Anda</Text>
            <Text style={styles.cardHeaderDesc}>
              Silakan gunakan email terdaftar dan kata sandi Anda.
            </Text>

            {Boolean(errorMessage) && (
              <View style={styles.errorAlert}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={colors.badge.danger.text}
                  style={styles.errorAlertIcon}
                />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            )}

            <Input
              label="Alamat Email"
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
                  size={20}
                  color={colors.textSecondary}
                />
              }
            />

            <Input
              label="Kata Sandi"
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
                  size={20}
                  color={colors.textSecondary}
                />
              }
              rightAddon={
                <TouchableOpacity
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title="Masuk Sekarang"
              onPress={() => handleLogin()}
              loading={isLoading}
              variant="primary"
              style={styles.loginBtn}
              accessibilityLabel="Tombol Masuk Sekarang"
            />
          </Card>

          {/* Bagian Masuk Cepat Akun Demo */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoSectionTitle}>
                Masuk Cepat (Akun Demo Sintetis)
              </Text>
              <Text style={styles.demoSectionSubtitle}>
                Ketuk salah satu kartu di bawah untuk langsung masuk tanpa mengetik:
              </Text>
            </View>

            {DEMO_ACCOUNTS.map((account, index) => (
              <Card
                key={account.email}
                onPress={() => handleQuickLogin(account.email)}
                style={styles.demoAccountCard}
                accessibilityLabel={`Masuk sebagai ${account.name}, ${account.roleTitle}`}
              >
                <View style={styles.demoAccountRow}>
                  <View style={styles.demoAvatarCircle}>
                    <Text style={styles.demoAvatarText}>{index + 1}</Text>
                  </View>
                  <View style={styles.demoInfoCol}>
                    <Text style={styles.demoNameText}>{account.name}</Text>
                    <Text style={styles.demoRoleText}>{account.roleTitle}</Text>
                    <Text style={styles.demoEmailText}>{account.email}</Text>
                    <Text style={styles.demoDescText}>{account.description}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.primary}
                    style={styles.demoChevron}
                  />
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.max,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  badgeContainer: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  appTitle: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  formCard: {
    marginBottom: spacing.xl,
  },
  cardHeaderTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardHeaderDesc: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    borderColor: colors.badge.danger.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorAlertIcon: {
    marginRight: spacing.sm,
  },
  errorAlertText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.badge.danger.text,
    lineHeight: typography.lineHeight.sm,
  },
  showPasswordBtn: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    marginTop: spacing.md,
  },
  demoSection: {
    marginTop: spacing.sm,
  },
  demoHeader: {
    marginBottom: spacing.md,
  },
  demoSectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  demoSectionSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.xs,
  },
  demoAccountCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  demoAccountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  demoAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  demoAvatarText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  demoInfoCol: {
    flex: 1,
  },
  demoNameText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  demoRoleText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginTop: 1,
  },
  demoEmailText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  demoDescText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  demoChevron: {
    marginLeft: spacing.sm,
  },
});
