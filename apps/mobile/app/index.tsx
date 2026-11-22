import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Role } from "@neoschola/shared";
import { useAuth } from "../src/store/auth";
import { colors, spacing, typography } from "../src/theme/tokens";

export default function IndexScreen() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Memuat NeoSchola...</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === Role.GUARDIAN) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(staff)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    gap: spacing.md,
  },
  text: {
    fontSize: typography.size.base,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
});
