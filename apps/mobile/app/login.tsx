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
import {
  Screen,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Badge,
  Avatar,
  Separator,
  Alert,
} from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { shadcn, spacing, radius, typography, touchTarget } from "../src/theme/tokens";

interface DemoAccount {
  name: string;
  roleTitle: string;
  roleBadge: string;
  email: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Budi Santoso",
    roleTitle: "Wali Murid (2 Anak: Raka 4A & Nadia 2B)",
    roleBadge: "Wali Murid",
    email: "wali.budi@neoschola.demo",
    description: "Memantau presensi, SPP, dan pengumuman untuk 2 siswa.",
  },
  {
    name: "Siti Rahmawati",
    roleTitle: "Wali Murid (1 Anak: Dimas 4A)",
    roleBadge: "Wali Murid",
    email: "wali.siti@neoschola.demo",
    description: "Memantau presensi harian Dimas di kelas 4A.",
  },
  {
    name: "Ibu Ani Wijayanti, S.Pd.",
    roleTitle: "Wali Kelas 4A",
    roleBadge: "Wali Kelas",
    email: "guru.ani@neoschola.demo",
    description: "Input presensi massal, review izin, dan buat pengumuman.",
  },
  {
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
    <Screen scroll={true} headerShown={false} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Monogram & Identitas Sekolah */}
          <View style={styles.brandHeader}>
            <View style={styles.monogramBox}>
              <Text style={styles.monogramText}>NS</Text>
            </View>
            <Text style={styles.brandTitle}>NeoSchola</Text>
            <Text style={styles.brandSubtitle}>SDN Nusantara Harapan</Text>
          </View>

          {/* Form Masuk Utama */}
          <Card style={styles.formCard}>
            <CardHeader>
              <CardTitle>Masuk ke Akun Anda</CardTitle>
              <CardDescription>
                Silakan gunakan email terdaftar dan kata sandi Anda.
              </CardDescription>
            </CardHeader>

            <CardContent>
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
                        showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
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
            </CardContent>

            <CardFooter>
              <Button
                title="Masuk Sekarang"
                onPress={() => handleLogin()}
                loading={isLoading}
                variant="default"
                style={styles.loginBtn}
                accessibilityLabel="Tombol Masuk Sekarang"
              />
            </CardFooter>
          </Card>

          {/* Pemisah Masuk Cepat Akun Demo */}
          <View style={styles.separatorRow}>
            <Separator style={styles.separatorFlex} />
            <Text style={styles.separatorText}>Masuk Cepat Akun Demo</Text>
            <Separator style={styles.separatorFlex} />
          </View>

          {/* Daftar Akun Demo dalam 1 Card Bersih */}
          <Card style={styles.demoCard}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <React.Fragment key={account.email}>
                {index > 0 && <Separator />}
                <TouchableOpacity
                  onPress={() => handleQuickLogin(account.email)}
                  style={styles.demoAccountRow}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Masuk cepat sebagai ${account.name}, ${account.roleTitle}`}
                >
                  <Avatar name={account.name} size="md" />
                  <View style={styles.demoInfoCol}>
                    <View style={styles.demoNameRow}>
                      <Text style={styles.demoNameText}>{account.name}</Text>
                      <Badge label={account.roleBadge} variant="outline" />
                    </View>
                    <Text style={styles.demoEmailText}>{account.email}</Text>
                    <Text style={styles.demoDescText}>{account.description}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={shadcn.mutedForeground}
                    style={styles.demoChevron}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: shadcn.canvas,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.max,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  monogramBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: shadcn.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  monogramText: {
    color: shadcn.primaryForeground,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.snug,
  },
  brandTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.tight,
  },
  brandSubtitle: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  formCard: {
    marginBottom: spacing.xl,
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
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  separatorFlex: {
    flex: 1,
  },
  separatorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    marginHorizontal: spacing.sm,
  },
  demoCard: {
    padding: 0,
    overflow: "hidden",
  },
  demoAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  demoInfoCol: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
  },
  demoNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    gap: spacing.xs,
  },
  demoNameText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    flex: 1,
  },
  demoEmailText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  demoDescText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    lineHeight: 15,
  },
  demoChevron: {
    marginLeft: spacing.xs,
  },
});
