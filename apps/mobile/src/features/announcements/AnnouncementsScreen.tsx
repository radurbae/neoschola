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

  const handleAcknowledge = async (item: Announcement) => {
    if (item.is_read || acknowledging) return;
    setAcknowledging(true);

    try {
      await api.ackAnnouncement(item.id);
      // Perbarui state lokal daftar pengumuman & active announcement
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === item.id ? { ...ann, is_read: true } : ann))
      );
      setActiveAnnouncement((prev) =>
        prev && prev.id === item.id ? { ...prev, is_read: true } : prev
      );
    } catch {
      // Jika gagal, pertahankan state lama
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

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Pengumuman Sekolah"
      subtitle="Agenda & informasi resmi SDN Nusantara Harapan"
      rightAction={
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
    >
      {/* Filter Kategori Chips */}
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
          {filteredAnnouncements.map((item) => {
            const isEmergencyPinned = item.category === "DARURAT" && item.is_pinned;
            const catBadge = getCategoryBadge(item.category);

            // Pengumuman DARURAT yang disematkan tampil menonjol dengan Alert variant="destructive"
            if (isEmergencyPinned) {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.emergencyTouchable}
                  onPress={() => setActiveAnnouncement(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Pengumuman darurat disematkan: ${item.title}. Status: ${
                    item.is_read ? "Sudah Dibaca" : "Belum Dibaca"
                  }`}
                >
                  <Alert
                    variant="destructive"
                    title={`PENGUMUMAN DARURAT: ${item.title}`}
                    description={item.content}
                    style={styles.emergencyAlert}
                  />
                  <View style={styles.emergencyMetaRow}>
                    <View style={styles.badgeGroup}>
                      <Badge label="Disematkan" variant="destructive" />
                      <Badge
                        label={item.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                        variant={item.is_read ? "secondary" : "outline"}
                      />
                    </View>
                    <View style={styles.metaInfoRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={shadcn.status.danger.text}
                      />
                      <Text style={styles.emergencyDateText}>
                        {formatTanggalId(item.created_at, { includeDay: true })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

            // Pengumuman lain dalam Card hairline rapi
            return (
              <Card
                key={item.id}
                style={styles.announcementCard}
                onPress={() => setActiveAnnouncement(item)}
                accessibilityLabel={`Pengumuman: ${item.title}. Kategori ${catBadge.label}. Status: ${
                  item.is_read ? "Sudah Dibaca" : "Belum Dibaca"
                }`}
              >
                {/* Header Kartu: Kategori, Pin & Status Baca */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeGroup}>
                    <Badge
                      label={catBadge.label}
                      variant={catBadge.variant}
                    />
                    {item.is_pinned && (
                      <Badge label="Disematkan" variant="secondary" />
                    )}
                  </View>

                  <Badge
                    label={item.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                    variant={item.is_read ? "secondary" : "outline"}
                  />
                </View>

                {/* Judul Pengumuman */}
                <Text style={styles.announcementTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Cuplikan Isi */}
                <Text style={styles.announcementPreview} numberOfLines={2}>
                  {item.content}
                </Text>

                <Separator style={styles.cardSeparator} />

                {/* Footer Kartu: Tanggal & Penerbit */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.metaInfoRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={shadcn.mutedForeground}
                    />
                    <Text style={styles.metaDateText}>
                      {formatTanggalId(item.created_at, { includeDay: true })}
                    </Text>
                  </View>
                  {Boolean(item.created_by_name) && (
                    <Text style={styles.metaAuthorText} numberOfLines={1}>
                      {item.created_by_name}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
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
  },
  listScrollView: {
    flex: 1,
  },
  listScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emergencyTouchable: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.status.danger.border,
    backgroundColor: shadcn.status.danger.bg,
    padding: spacing.md,
  },
  emergencyAlert: {
    marginBottom: spacing.sm,
  },
  emergencyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  emergencyDateText: {
    fontSize: typography.size.xs,
    color: shadcn.status.danger.text,
    fontVariant: ["tabular-nums"],
  },
  announcementCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  announcementTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    lineHeight: typography.lineHeight.base,
    marginBottom: spacing.xs,
    letterSpacing: typography.tracking.snug,
  },
  announcementPreview: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    lineHeight: typography.lineHeight.sm,
    marginBottom: spacing.sm,
  },
  cardSeparator: {
    marginVertical: spacing.sm,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaDateText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  metaAuthorText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
    maxWidth: 150,
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
