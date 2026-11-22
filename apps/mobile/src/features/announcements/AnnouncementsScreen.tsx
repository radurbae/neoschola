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
  ModalSheet,
  StateView,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import * as api from "../../lib/api";
import {
  colors,
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

  // Detail Modal Sheet state
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
    } catch (err: any) {
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
        return { label: "Darurat", variant: "danger" };
      case "SEKOLAH":
        return { label: "Sekolah", variant: "info" };
      case "KELAS":
        return { label: "Kelas", variant: "success" };
      case "KEGIATAN":
        return { label: "Kegiatan", variant: "warning" };
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {filteredAnnouncements.map((item) => {
            const catBadge = getCategoryBadge(item.category);
            return (
              <Card
                key={item.id}
                style={[
                  styles.announcementCard,
                  item.is_pinned && styles.announcementCardPinned,
                ]}
                onPress={() => setActiveAnnouncement(item)}
                accessibilityLabel={`Pengumuman: ${item.title}. Kategori ${catBadge.label}. Status: ${
                  item.is_read ? "Sudah Dibaca" : "Belum Dibaca"
                }`}
              >
                {/* Header Kartu: Kategori & Pin */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeGroup}>
                    <Badge
                      label={catBadge.label}
                      variant={catBadge.variant}
                    />
                    {item.is_pinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={14} color={colors.primary} />
                        <Text style={styles.pinnedText}>Disematkan</Text>
                      </View>
                    )}
                  </View>

                  {/* Status Baca */}
                  {item.is_read ? (
                    <Badge label="Sudah Dibaca" variant="neutral" />
                  ) : (
                    <Badge label="Belum Dibaca" variant="warning" />
                  )}
                </View>

                {/* Judul Pengumuman */}
                <Text style={styles.announcementTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Cuplikan Isi */}
                <Text style={styles.announcementPreview} numberOfLines={2}>
                  {item.content}
                </Text>

                {/* Footer Kartu: Tanggal & Penerbit */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.metaInfoRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textSecondary}
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

      {/* ModalSheet Detail Lengkap Pengumuman */}
      <ModalSheet
        visible={Boolean(activeAnnouncement)}
        onClose={() => setActiveAnnouncement(null)}
        title="Detail Pengumuman"
      >
        {activeAnnouncement && (
          <View style={styles.modalBody}>
            {/* Tag Kategori & Pin */}
            <View style={styles.modalMetaBar}>
              <View style={styles.badgeGroup}>
                <Badge
                  label={getCategoryBadge(activeAnnouncement.category).label}
                  variant={getCategoryBadge(activeAnnouncement.category).variant}
                />
                {activeAnnouncement.is_pinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={14} color={colors.primary} />
                    <Text style={styles.pinnedText}>Disematkan</Text>
                  </View>
                )}
              </View>

              <Badge
                label={activeAnnouncement.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                variant={activeAnnouncement.is_read ? "neutral" : "warning"}
              />
            </View>

            {/* Judul Lengkap */}
            <Text style={styles.modalTitle}>{activeAnnouncement.title}</Text>

            {/* Info Tanggal & Pengirim */}
            <View style={styles.modalInfoBox}>
              <View style={styles.modalInfoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.modalInfoText}>
                  {formatTanggalId(activeAnnouncement.created_at, {
                    includeDay: true,
                  })}
                </Text>
              </View>
              {Boolean(activeAnnouncement.created_by_name) && (
                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.modalInfoText}>
                    Diterbitkan oleh: {activeAnnouncement.created_by_name}
                  </Text>
                </View>
              )}
              {Boolean(activeAnnouncement.class_name) && (
                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.modalInfoText}>
                    Kelas: {activeAnnouncement.class_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Isi Lengkap Pengumuman */}
            <View style={styles.modalContentCard}>
              <Text style={styles.modalContentText}>
                {activeAnnouncement.content}
              </Text>
            </View>

            {/* Aksi Konfirmasi Baca */}
            <View style={styles.modalActionContainer}>
              {!activeAnnouncement.is_read ? (
                <Button
                  title="Konfirmasi Sudah Dibaca"
                  variant="primary"
                  loading={acknowledging}
                  onPress={() => handleAcknowledge(activeAnnouncement)}
                  leftIcon={
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={colors.textInverse}
                    />
                  }
                  accessibilityLabel="Tombol konfirmasi bahwa Anda telah membaca pengumuman ini"
                />
              ) : (
                <View style={styles.alreadyReadNotice}>
                  <Ionicons
                    name="checkmark-done"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.alreadyReadText}>
                    Pengumuman ini telah Anda konfirmasi dibaca.
                  </Text>
                </View>
              )}

              <Button
                title="Tutup"
                variant="secondary"
                onPress={() => setActiveAnnouncement(null)}
                style={styles.closeSheetButton}
                accessibilityLabel="Tutup dialog pengumuman"
              />
            </View>
          </View>
        )}
      </ModalSheet>
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
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  announcementCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  announcementCardPinned: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
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
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  pinnedText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  announcementTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.base,
    marginBottom: spacing.xs,
  },
  announcementPreview: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
    marginBottom: spacing.md,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaDateText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  metaAuthorText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    maxWidth: 150,
  },

  // Modal Sheet Styles
  modalBody: {
    paddingBottom: spacing.xxl,
  },
  modalMetaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.xl,
    marginBottom: spacing.md,
  },
  modalInfoBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalInfoText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  modalContentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  modalContentText: {
    fontSize: typography.size.base,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.base + 2,
  },
  modalActionContainer: {
    gap: spacing.md,
  },
  alreadyReadNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  alreadyReadText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  closeSheetButton: {
    minHeight: touchTarget.minHeight,
  },
});
