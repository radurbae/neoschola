import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { formatTanggalId } from "@neoschola/shared";
import type { Announcement, AnnouncementCategory } from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  DarkActionCard,
  DarkIconRow,
  Card,
  Badge,
  Chip,
  Button,
  Sheet,
  Alert,
  Separator,
  StateView,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import * as api from "../../lib/api";
import {
  bento,
  shadcn,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

type CategoryFilter = "SEMUA" | AnnouncementCategory;

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "DARURAT", label: "Darurat" },
  { key: "SEKOLAH", label: "Sekolah" },
  { key: "KELAS", label: "Kelas" },
  { key: "KEGIATAN", label: "Kegiatan" },
];

export function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("SEMUA");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Sheet state
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [acknowledging, setAcknowledging] = useState<boolean>(false);

  const fetchAnnouncements = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await api.getAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat pengumuman. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === "SEMUA") {
      return announcements;
    }
    return announcements.filter((item) => item.category === selectedCategory);
  }, [announcements, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      SEMUA: announcements.length,
      DARURAT: 0,
      SEKOLAH: 0,
      KELAS: 0,
      KEGIATAN: 0,
    };
    for (const item of announcements) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [announcements]);

  // Pisahkan pengumuman DARURAT yang disematkan untuk disorot dengan DarkActionCard
  const emergencyPinnedAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter(
      (item) => item.category === "DARURAT" && item.is_pinned
    );
  }, [filteredAnnouncements]);

  // Daftar pengumuman reguler
  const regularAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter(
      (item) => !(item.category === "DARURAT" && item.is_pinned)
    );
  }, [filteredAnnouncements]);

  const handleAcknowledge = async (item: Announcement) => {
    if (item.is_read || acknowledging) return;
    setAcknowledging(true);

    try {
      await api.ackAnnouncement(item.id);
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === item.id ? { ...ann, is_read: true } : ann))
      );
      setActiveAnnouncement((prev) =>
        prev && prev.id === item.id ? { ...prev, is_read: true } : prev
      );
    } catch {
      // Pertahankan state jika gagal
    } finally {
      setAcknowledging(false);
    }
  };

  const getCategoryBadge = (
    category: AnnouncementCategory
  ): { label: string; variant: BadgeVariant } => {
    switch (category) {
      case "DARURAT":
        return { label: "Darurat", variant: "destructive" };
      case "SEKOLAH":
        return { label: "Sekolah", variant: "secondary" };
      case "KELAS":
        return { label: "Kelas", variant: "outline" };
      case "KEGIATAN":
        return { label: "Kegiatan", variant: "secondary" };
      default:
        return { label: category, variant: "neutral" };
    }
  };

  const getCategoryIcon = (category: AnnouncementCategory): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case "DARURAT":
        return "warning-outline";
      case "SEKOLAH":
        return "megaphone-outline";
      case "KELAS":
        return "school-outline";
      case "KEGIATAN":
        return "calendar-outline";
      default:
        return "information-circle-outline";
    }
  };

  return (
    <Screen scroll={false} headerShown={false}>
      {/* TopUtilityBar dengan tombol kembali 44x44pt via leftAction */}
      <TopUtilityBar
        title="Pengumuman"
        subtitle="Agenda dan informasi resmi sekolah"
        leftAction={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke layar sebelumnya"
          >
            <Ionicons name="arrow-back" size={20} color={shadcn.foreground} />
          </TouchableOpacity>
        }
      />

      {/* Filter Kategori Chips Horizontal (Aman di 360px) */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key];
            return (
              <Chip
                key={cat.key}
                label={cat.label}
                selected={selectedCategory === cat.key}
                count={count}
                onPress={() => setSelectedCategory(cat.key)}
                accessibilityLabel={`Kategori ${cat.label}, ${count} pengumuman`}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Konten Utama */}
      {loading ? (
        <StateView type="loading" message="Memuat daftar pengumuman sekolah..." />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Pengumuman"
          message={errorMessage}
          actionLabel="Muat Ulang"
          onAction={() => fetchAnnouncements(false)}
        />
      ) : filteredAnnouncements.length === 0 ? (
        <StateView
          type="empty"
          title="Belum Ada Pengumuman"
          message={
            selectedCategory === "SEMUA"
              ? "Belum ada pengumuman yang diterbitkan oleh pihak sekolah."
              : `Belum ada pengumuman untuk kategori ${selectedCategory.toLowerCase()}.`
          }
          actionLabel="Segarkan Data"
          onAction={() => fetchAnnouncements(false)}
        />
      ) : (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAnnouncements(true)}
              tintColor={shadcn.primary}
              colors={[shadcn.primary]}
            />
          }
        >
          {/* Pengumuman DARURAT yang disematkan disorot dengan DarkActionCard */}
          {emergencyPinnedAnnouncements.map((item) => (
            <DarkActionCard
              key={item.id}
              eyebrow="Darurat"
              title={item.title}
              description={item.content}
              ctaLabel="Baca Detail"
              onPress={() => setActiveAnnouncement(item)}
              style={styles.emergencyCard}
            />
          ))}

          {/* Daftar pengumuman lain memakai DarkIconRow dipisah Separator di dalam Card rounded 20pt */}
          {regularAnnouncements.length > 0 && (
            <Card style={styles.announcementsCard}>
              {regularAnnouncements.map((item, index) => {
                const catBadge = getCategoryBadge(item.category);
                const icon = getCategoryIcon(item.category);
                const dateStr = formatTanggalId(item.created_at, { includeDay: true });
                const authorStr = item.created_by_name ? ` • ${item.created_by_name}` : "";

                return (
                  <React.Fragment key={item.id}>
                    {index > 0 && <Separator />}
                    <DarkIconRow
                      icon={icon}
                      title={item.title}
                      subtitle={`${dateStr}${authorStr}`}
                      rightPrimary={catBadge.label}
                      rightSecondary={item.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                      rightSecondaryTone={item.is_read ? "neutral" : "warning"}
                      onPress={() => setActiveAnnouncement(item)}
                      accessibilityLabel={`Pengumuman: ${item.title}. Kategori ${catBadge.label}. Status: ${
                        item.is_read ? "Sudah Dibaca" : "Belum Dibaca"
                      }`}
                    />
                  </React.Fragment>
                );
              })}
            </Card>
          )}
        </ScrollView>
      )}

      {/* Sheet Detail Lengkap Pengumuman */}
      <Sheet
        visible={Boolean(activeAnnouncement)}
        onClose={() => setActiveAnnouncement(null)}
        title="Detail Pengumuman"
      >
        {activeAnnouncement && (
          <View style={styles.sheetBody}>
            {/* Tag Kategori & Pin */}
            <View style={styles.sheetMetaBar}>
              <View style={styles.badgeGroup}>
                <Badge
                  label={getCategoryBadge(activeAnnouncement.category).label}
                  variant={getCategoryBadge(activeAnnouncement.category).variant}
                />
                {activeAnnouncement.is_pinned && (
                  <Badge label="Disematkan" variant="secondary" />
                )}
              </View>

              <Badge
                label={activeAnnouncement.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                variant={activeAnnouncement.is_read ? "secondary" : "outline"}
              />
            </View>

            {/* Judul Lengkap */}
            <Text style={styles.sheetTitle}>{activeAnnouncement.title}</Text>

            <Separator style={styles.sheetSeparator} />

            {/* Info Tanggal & Pengirim */}
            <View style={styles.sheetInfoBox}>
              <View style={styles.sheetInfoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={shadcn.mutedForeground}
                />
                <Text style={styles.sheetInfoText}>
                  {formatTanggalId(activeAnnouncement.created_at, {
                    includeDay: true,
                  })}
                </Text>
              </View>
              {Boolean(activeAnnouncement.created_by_name) && (
                <View style={styles.sheetInfoRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={shadcn.mutedForeground}
                  />
                  <Text style={styles.sheetInfoText}>
                    Diterbitkan oleh: {activeAnnouncement.created_by_name}
                  </Text>
                </View>
              )}
              {Boolean(activeAnnouncement.class_name) && (
                <View style={styles.sheetInfoRow}>
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={shadcn.mutedForeground}
                  />
                  <Text style={styles.sheetInfoText}>
                    Kelas: {activeAnnouncement.class_name}
                  </Text>
                </View>
              )}
            </View>

            <Separator style={styles.sheetSeparator} />

            {/* Isi Lengkap Pengumuman */}
            <View style={styles.sheetContentBox}>
              <Text style={styles.sheetContentText}>
                {activeAnnouncement.content}
              </Text>
            </View>

            <Separator style={styles.sheetSeparator} />

            {/* Aksi Konfirmasi Baca */}
            <View style={styles.sheetActionContainer}>
              {!activeAnnouncement.is_read ? (
                <Button
                  title="Konfirmasi Sudah Dibaca"
                  variant="default"
                  loading={acknowledging}
                  onPress={() => handleAcknowledge(activeAnnouncement)}
                  leftIcon={
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={shadcn.primaryForeground}
                    />
                  }
                  accessibilityLabel="Konfirmasi sudah membaca pengumuman"
                />
              ) : (
                <Alert
                  variant="default"
                  title="Terkonfirmasi"
                  description="Pengumuman ini telah Anda konfirmasi sudah dibaca."
                />
              )}

              <Button
                title="Tutup"
                variant="outline"
                onPress={() => setActiveAnnouncement(null)}
                style={styles.closeSheetButton}
                accessibilityLabel="Tutup dialog detail pengumuman"
              />
            </View>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  filterSection: {
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.xs,
  },
  listScrollView: {
    flex: 1,
    backgroundColor: bento.surface,
  },
  listScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emergencyCard: {
    marginBottom: spacing.md,
  },
  announcementsCard: {
    borderRadius: radius.xl,
    padding: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.card,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  // Sheet Styles
  sheetBody: {
    paddingBottom: spacing.xxl,
  },
  sheetMetaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    lineHeight: typography.lineHeight.xl,
    letterSpacing: typography.tracking.tight,
  },
  sheetSeparator: {
    marginVertical: spacing.md,
  },
  sheetInfoBox: {
    gap: spacing.xs,
  },
  sheetInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sheetInfoText: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  sheetContentBox: {
    paddingVertical: spacing.xs,
  },
  sheetContentText: {
    fontSize: typography.size.base,
    color: shadcn.foreground,
    lineHeight: typography.lineHeight.base + 2,
  },
  sheetActionContainer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  closeSheetButton: {
    minHeight: touchTarget.minHeight,
  },
});
