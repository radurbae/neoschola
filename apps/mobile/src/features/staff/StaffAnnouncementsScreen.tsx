import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Announcement,
  AnnouncementCategory,
  Role,
  formatTanggalId,
} from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Chip,
  Button,
  Input,
  StateView,
  ModalSheet,
  SectionHeader,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

export function StaffAnnouncementsScreen() {
  const { user, classes } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter Kategori
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Modal Buat Pengumuman
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<AnnouncementCategory>(AnnouncementCategory.SEKOLAH);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Kategori yang tersedia untuk dipilih
  const availableCategories: AnnouncementCategory[] = isAdmin
    ? [
        AnnouncementCategory.SEKOLAH,
        AnnouncementCategory.KELAS,
        AnnouncementCategory.KEGIATAN,
        AnnouncementCategory.DARURAT,
      ]
    : [
        AnnouncementCategory.SEKOLAH,
        AnnouncementCategory.KELAS,
        AnnouncementCategory.KEGIATAN,
      ];

  const availableClasses =
    classes && classes.length > 0
      ? classes
      : isAdmin
      ? [
          { id: "cls_4a", name: "Kelas 4A" },
          { id: "cls_2b", name: "Kelas 2B" },
        ]
      : [{ id: "cls_4a", name: "Kelas 4A" }];

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
        err?.message || "Gagal memuat pengumuman sekolah. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenCreateModal = () => {
    setTitle("");
    setContent("");
    setCategory(AnnouncementCategory.SEKOLAH);
    setTargetClassId(null);
    setIsPinned(false);
    setFormError(null);
    setModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    setModalVisible(false);
    setFormError(null);
  };

  const handleCreateAnnouncement = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 3) {
      setFormError("Judul pengumuman minimal 3 karakter.");
      return;
    }
    if (trimmedContent.length < 5) {
      setFormError("Isi pengumuman minimal 5 karakter.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createAnnouncement({
        title: trimmedTitle,
        content: trimmedContent,
        category,
        target_role: "ALL",
        class_id: targetClassId || null,
        is_pinned: isPinned,
      });

      Alert.alert("Berhasil", "Pengumuman berhasil diterbitkan.");
      handleCloseCreateModal();
      await fetchAnnouncements(true);
    } catch (err: any) {
      setFormError(err?.message || "Gagal membuat pengumuman. Mohon periksa kembali formulir.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter pengumuman
  const filteredAnnouncements = announcements.filter((item) => {
    if (selectedCategory === "ALL") return true;
    return item.category === selectedCategory;
  });

  const getCategoryBadgeVariant = (cat: AnnouncementCategory) => {
    switch (cat) {
      case AnnouncementCategory.DARURAT:
        return "danger";
      case AnnouncementCategory.KEGIATAN:
        return "warning";
      case AnnouncementCategory.KELAS:
        return "info";
      case AnnouncementCategory.SEKOLAH:
      default:
        return "success";
    }
  };

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Info & Pengumuman"
      subtitle="Publikasi maklumat penting bagi warga sekolah"
      rightAction={
        <TouchableOpacity
          style={styles.createHeaderButton}
          onPress={handleOpenCreateModal}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Buat pengumuman baru"
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnnouncements(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Tombol Buat Pengumuman Utama */}
        <Button
          title="Buat Pengumuman Baru"
          onPress={handleOpenCreateModal}
          variant="primary"
          accessibilityLabel="Buat Pengumuman Baru Sekolah"
          leftIcon={<Ionicons name="megaphone" size={18} color={colors.textInverse} />}
          style={styles.topCreateButton}
        />

        {/* Filter Chip Kategori */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Chip
            label="Semua"
            selected={selectedCategory === "ALL"}
            onPress={() => setSelectedCategory("ALL")}
            count={announcements.length}
            accessibilityLabel={`Semua pengumuman, ${announcements.length} item`}
          />
          <Chip
            label="Sekolah"
            selected={selectedCategory === AnnouncementCategory.SEKOLAH}
            onPress={() => setSelectedCategory(AnnouncementCategory.SEKOLAH)}
            accessibilityLabel="Filter pengumuman kategori sekolah"
          />
          <Chip
            label="Kelas"
            selected={selectedCategory === AnnouncementCategory.KELAS}
            onPress={() => setSelectedCategory(AnnouncementCategory.KELAS)}
            accessibilityLabel="Filter pengumuman kategori kelas"
          />
          <Chip
            label="Kegiatan"
            selected={selectedCategory === AnnouncementCategory.KEGIATAN}
            onPress={() => setSelectedCategory(AnnouncementCategory.KEGIATAN)}
            accessibilityLabel="Filter pengumuman kategori kegiatan"
          />
          {isAdmin && (
            <Chip
              label="Darurat"
              selected={selectedCategory === AnnouncementCategory.DARURAT}
              onPress={() => setSelectedCategory(AnnouncementCategory.DARURAT)}
              accessibilityLabel="Filter pengumuman kategori darurat"
            />
          )}
        </ScrollView>

        {/* State Loading / Error / Empty */}
        {loading && !refreshing ? (
          <StateView type="loading" message="Memuat daftar pengumuman..." />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Gagal Memuat Pengumuman"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchAnnouncements()}
          />
        ) : filteredAnnouncements.length === 0 ? (
          <StateView
            type="empty"
            title="Belum Ada Pengumuman"
            message="Belum ada pengumuman yang diterbitkan untuk kategori ini."
          />
        ) : (
          <View style={styles.announcementsList}>
            {filteredAnnouncements.map((item) => (
              <Card key={item.id} style={styles.announcementCard}>
                {/* Header Kartu Pengumuman */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeGroup}>
                    {item.is_pinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color="#854D0E" />
                        <Text style={styles.pinnedText}>Disematkan</Text>
                      </View>
                    )}
                    <Badge
                      label={item.category}
                      variant={getCategoryBadgeVariant(item.category)}
                    />
                    {Boolean(item.class_name) && (
                      <Badge
                        label={`Kelas ${item.class_name}`}
                        variant="neutral"
                        style={styles.classBadge}
                      />
                    )}
                  </View>
                  <Text style={styles.dateText}>
                    {formatTanggalId(item.created_at, { shortMonth: true })}
                  </Text>
                </View>

                {/* Judul & Isi */}
                <Text style={styles.announcementTitle}>{item.title}</Text>
                <Text style={styles.announcementContent}>{item.content}</Text>

                {/* Footer Pembuat */}
                <View style={styles.cardFooter}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.authorText}>
                    Oleh: {item.created_by_name || "Staf Sekolah"}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Modal Form Buat Pengumuman */}
        <ModalSheet
          visible={modalVisible}
          onClose={handleCloseCreateModal}
          title="Terbitkan Pengumuman Baru"
        >
          <View style={styles.modalBody}>
            {Boolean(formError) && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={colors.badge.danger.text} />
                <Text style={styles.errorAlertText}>{formError}</Text>
              </View>
            )}

            <Input
              label="Judul Pengumuman"
              placeholder="Contoh: Pemberitahuan Libur Hari Nasional"
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Input judul pengumuman"
            />

            <Input
              label="Isi Pengumuman"
              placeholder="Tuliskan isi pengumuman lengkap secara jelas..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              accessibilityLabel="Input isi pengumuman"
            />

            {/* Pilihan Kategori */}
            <Text style={styles.fieldLabel}>Kategori Pengumuman:</Text>
            <View style={styles.optionsWrap}>
              {availableCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.choiceChip,
                      isSelected ? styles.choiceChipSelected : styles.choiceChipUnselected,
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Pilih kategori ${cat}`}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        isSelected
                          ? styles.choiceChipTextSelected
                          : styles.choiceChipTextUnselected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pilihan Sasaran Kelas */}
            <Text style={styles.fieldLabel}>Sasaran Penerima:</Text>
            <View style={styles.optionsWrap}>
              <TouchableOpacity
                style={[
                  styles.choiceChip,
                  targetClassId === null
                    ? styles.choiceChipSelected
                    : styles.choiceChipUnselected,
                ]}
                onPress={() => setTargetClassId(null)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Sasaran seluruh sekolah"
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    targetClassId === null
                      ? styles.choiceChipTextSelected
                      : styles.choiceChipTextUnselected,
                  ]}
                >
                  Semua Kelas (Global)
                </Text>
              </TouchableOpacity>

              {availableClasses.map((cls) => {
                const isSelected = targetClassId === cls.id;
                return (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.choiceChip,
                      isSelected ? styles.choiceChipSelected : styles.choiceChipUnselected,
                    ]}
                    onPress={() => setTargetClassId(cls.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Sasaran rombel ${cls.name}`}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        isSelected
                          ? styles.choiceChipTextSelected
                          : styles.choiceChipTextUnselected,
                      ]}
                    >
                      {cls.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggle Sematkan (Pinned) */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Sematkan Pengumuman</Text>
                <Text style={styles.switchSubtitle}>
                  Tampilkan di posisi teratas halaman pengumuman
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: "#CBD5E1", true: colors.primarySoft }}
                thumbColor={isPinned ? colors.primary : "#F1F5F9"}
                accessibilityLabel="Toggle sematkan pengumuman di atas"
              />
            </View>

            {/* Tombol Simpan */}
            <Button
              title={submitting ? "Menerbitkan..." : "Terbitkan Pengumuman"}
              onPress={handleCreateAnnouncement}
              variant="primary"
              loading={submitting}
              accessibilityLabel="Konfirmasi terbitkan pengumuman"
              style={styles.modalSubmitButton}
            />
          </View>
        </ModalSheet>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createHeaderButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  topCreateButton: {
    marginBottom: spacing.md,
  },
  filterScroll: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  announcementsList: {
    marginBottom: spacing.md,
  },
  announcementCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.warning.bg,
    borderWidth: 1,
    borderColor: colors.badge.warning.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginRight: spacing.xs,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.badge.warning.text,
    marginLeft: 2,
  },
  classBadge: {
    marginLeft: spacing.xs,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  announcementTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  announcementContent: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.base,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  authorText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  modalBody: {
    paddingVertical: spacing.xs,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorAlertText: {
    fontSize: typography.size.xs,
    color: colors.badge.danger.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  choiceChip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  choiceChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  choiceChipUnselected: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  choiceChipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  choiceChipTextSelected: {
    color: colors.primary,
  },
  choiceChipTextUnselected: {
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  switchTextCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  switchSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSubmitButton: {
    marginTop: spacing.sm,
    width: "100%",
  },
});
