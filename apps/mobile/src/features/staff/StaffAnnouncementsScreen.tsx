import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Announcement,
  AnnouncementCategory,
  Role,
  formatTanggalId,
} from "@neoschola/shared";
import { useRouter } from "expo-router";
import {
  TopUtilityBar,
  DarkActionCard,
  DarkIconRow,
  Card,
  Chip,
  Button,
  Input,
  Label,
  StateView,
  Sheet,
  Alert,
  Separator,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";

export function StaffAnnouncementsScreen() {
  const router = useRouter();
  const { user, classes } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<AnnouncementCategory>(AnnouncementCategory.SEKOLAH);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

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

      NativeAlert.alert("Berhasil", "Pengumuman berhasil diterbitkan.");
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

  const getCategoryIcon = (cat: AnnouncementCategory): keyof typeof Ionicons.glyphMap => {
    switch (cat) {
      case AnnouncementCategory.DARURAT:
        return "alert-circle-outline";
      case AnnouncementCategory.KEGIATAN:
        return "calendar-outline";
      case AnnouncementCategory.KELAS:
        return "book-outline";
      case AnnouncementCategory.SEKOLAH:
      default:
        return "megaphone-outline";
    }
  };

  const getCategoryTone = (
    cat: AnnouncementCategory
  ): "danger" | "warning" | "info" | "neutral" => {
    switch (cat) {
      case AnnouncementCategory.DARURAT:
        return "danger";
      case AnnouncementCategory.KEGIATAN:
        return "warning";
      case AnnouncementCategory.KELAS:
        return "info";
      case AnnouncementCategory.SEKOLAH:
      default:
        return "neutral";
    }
  };

  return (
    <View style={styles.container}>
      <TopUtilityBar
        title="Pengumuman"
        subtitle="Publikasi maklumat penting bagi warga sekolah"
        profileName={user?.name || "Staf"}
        onPressNotifications={() => router.push("/notifications")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnnouncements(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        {/* DarkActionCard CTA Buat Pengumuman */}
        <DarkActionCard
          eyebrow="Publikasi"
          title="Buat Pengumuman Baru"
          description="Siarkan informasi kegiatan, libur, atau maklumat darurat kepada seluruh wali murid dan siswa binaan."
          ctaLabel="Tulis Pengumuman"
          onPress={handleOpenCreateModal}
          style={styles.actionCardMargin}
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
          <Card style={styles.announcementsContainer}>
            {filteredAnnouncements.map((item, index) => {
              const formattedDate = formatTanggalId(item.created_at, { shortMonth: true });
              const subtext = `${item.created_by_name || "Staf Sekolah"}${
                item.class_name ? ` • Kelas ${item.class_name}` : ""
              } • ${item.content}`;

              return (
                <View key={item.id}>
                  {index > 0 && <Separator />}
                  <DarkIconRow
                    icon={getCategoryIcon(item.category)}
                    title={item.title}
                    subtitle={subtext}
                    rightPrimary={item.category}
                    rightSecondary={formattedDate}
                    rightSecondaryTone={getCategoryTone(item.category)}
                    onPress={() => setSelectedAnnouncement(item)}
                    accessibilityLabel={`Baca detail pengumuman ${item.title}`}
                  />
                </View>
              );
            })}
          </Card>
        )}

        {/* Sheet Detail Pengumuman */}
        <Sheet
          visible={Boolean(selectedAnnouncement)}
          onClose={() => setSelectedAnnouncement(null)}
          title="Rincian Pengumuman"
        >
          {selectedAnnouncement && (
            <View style={styles.sheetDetailBody}>
              <View style={styles.sheetDetailMetaRow}>
                <Text style={styles.sheetDetailCategory}>
                  {selectedAnnouncement.category}
                  {selectedAnnouncement.class_name ? ` • Kelas ${selectedAnnouncement.class_name}` : ""}
                </Text>
                <Text style={styles.sheetDetailDate}>
                  {formatTanggalId(selectedAnnouncement.created_at, { includeDay: true })}
                </Text>
              </View>

              <Text style={styles.sheetDetailTitle}>
                {selectedAnnouncement.title}
              </Text>

              <Separator style={styles.sheetDivider} />

              <Text style={styles.sheetDetailContent}>
                {selectedAnnouncement.content}
              </Text>

              <View style={styles.sheetDetailFooter}>
                <Ionicons name="person-circle-outline" size={16} color={shadcn.mutedForeground} />
                <Text style={styles.sheetDetailAuthor}>
                  Diterbitkan oleh: {selectedAnnouncement.created_by_name || "Staf Sekolah"}
                </Text>
              </View>

              <Button
                title="Tutup"
                onPress={() => setSelectedAnnouncement(null)}
                variant="outline"
                accessibilityLabel="Tutup dialog rincian pengumuman"
                style={styles.sheetCloseBtn}
              />
            </View>
          )}
        </Sheet>

        {/* Sheet Form Buat Pengumuman */}
        <Sheet
          visible={modalVisible}
          onClose={handleCloseCreateModal}
          title="Terbitkan Pengumuman Baru"
        >
          <View style={styles.sheetBody}>
            {Boolean(formError) && (
              <Alert
                variant="destructive"
                title="Kendala Formulir"
                description={formError!}
                style={styles.sheetErrorAlert}
              />
            )}

            <Label required>Judul Pengumuman</Label>
            <Input
              placeholder="Contoh: Pemberitahuan Libur Hari Nasional"
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Input judul pengumuman"
            />

            <Label required>Isi Pengumuman</Label>
            <Input
              placeholder="Tuliskan isi pengumuman lengkap secara jelas..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              accessibilityLabel="Input isi pengumuman"
            />

            {/* Pilihan Kategori */}
            <Label>Kategori Pengumuman</Label>
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
                        isSelected ? styles.choiceChipTextSelected : styles.choiceChipTextUnselected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Target Kelas Khusus Kategori KELAS */}
            {category === AnnouncementCategory.KELAS && (
              <View style={styles.classTargetSection}>
                <Label>Pilih Rombongan Belajar (Target Kelas)</Label>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.classChipsScroll}
                >
                  {availableClasses.map((cls) => {
                    const isSelected = targetClassId === cls.id;
                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={[
                          styles.choiceChip,
                          isSelected ? styles.choiceChipSelected : styles.choiceChipUnselected,
                        ]}
                        onPress={() => setTargetClassId(isSelected ? null : cls.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Target rombel ${cls.name}`}
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
                </ScrollView>
              </View>
            )}

            {/* Opsi Sematkan / Pin Pengumuman */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Sematkan di Atas (Pin)</Text>
                <Text style={styles.switchDescription}>
                  Tampilkan pengumuman ini di posisi paling atas
                </Text>
              </View>
              <Switch
                value={isPinned}
                onValueChange={setIsPinned}
                trackColor={{ false: shadcn.secondary, true: shadcn.primary }}
                thumbColor={shadcn.primaryForeground}
                accessibilityLabel="Opsi sematkan pengumuman"
              />
            </View>

            <Button
              title={submitting ? "Menerbitkan..." : "Terbitkan Pengumuman"}
              onPress={handleCreateAnnouncement}
              variant="default"
              loading={submitting}
              accessibilityLabel="Konfirmasi terbitkan pengumuman baru"
              style={styles.sheetSubmitButton}
            />
          </View>
        </Sheet>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: shadcn.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  actionCardMargin: {
    marginBottom: spacing.md,
  },
  filterScroll: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  announcementsContainer: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sheetDetailBody: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  sheetDetailMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetDetailCategory: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: shadcn.status.info.text,
  },
  sheetDetailDate: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  sheetDetailTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
  },
  sheetDivider: {
    marginVertical: spacing.xs,
  },
  sheetDetailContent: {
    fontSize: typography.size.sm,
    color: shadcn.foreground,
    lineHeight: 22,
  },
  sheetDetailFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sheetDetailAuthor: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  sheetCloseBtn: {
    marginTop: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  sheetBody: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  sheetErrorAlert: {
    marginBottom: spacing.xs,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  choiceChip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  choiceChipSelected: {
    backgroundColor: shadcn.primary,
    borderColor: shadcn.primary,
  },
  choiceChipUnselected: {
    backgroundColor: shadcn.background,
    borderColor: shadcn.border,
  },
  choiceChipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  choiceChipTextSelected: {
    color: shadcn.primaryForeground,
  },
  choiceChipTextUnselected: {
    color: shadcn.foreground,
  },
  classTargetSection: {
    marginTop: spacing.xs,
  },
  classChipsScroll: {
    paddingVertical: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  switchTextCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
  },
  switchDescription: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
  },
  sheetSubmitButton: {
    marginTop: spacing.md,
    minHeight: touchTarget.minHeight,
  },
});
