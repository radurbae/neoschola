import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AttendanceStatus,
  Role,
  formatTanggalId,
} from "@neoschola/shared";
import { useRouter } from "expo-router";
import {
  TopUtilityBar,
  PastelStatCard,
  Card,
  Button,
  Input,
  StateView,
  Avatar,
  Alert,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import type { ClassAttendanceItem } from "../../lib/api";
import {
  bento,
  breakpoints,
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";

interface ClassOption {
  id: string;
  name: string;
}

export function StaffAttendanceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  const { user, classes } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const availableClasses: ClassOption[] =
    classes && classes.length > 0
      ? classes.map((c) => ({ id: c.id, name: c.name }))
      : isAdmin
      ? [
          { id: "cls_4a", name: "Kelas 4A" },
          { id: "cls_2b", name: "Kelas 2B" },
        ]
      : [{ id: "cls_4a", name: "Kelas 4A" }];

  const [selectedClassId, setSelectedClassId] = useState<string>(
    availableClasses[0]?.id || "cls_4a"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [items, setItems] = useState<ClassAttendanceItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchAttendance = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);
      setSuccessBanner(null);

      try {
        const res = await api.getClassAttendance({
          class_id: selectedClassId,
          date: selectedDate,
        });
        const fetchedItems = res.items || [];
        setItems(fetchedItems);

        const initialMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
        for (const it of fetchedItems) {
          initialMap[it.student_id] = {
            status: it.status || AttendanceStatus.HADIR,
            notes: it.notes || "",
          };
        }
        setAttendanceMap(initialMap);
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Gagal memuat daftar presensi kelas. Silakan coba kembali."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedClassId, selectedDate]
  );

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || "",
      },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || AttendanceStatus.HADIR,
        notes,
      },
    }));
  };

  const handleMarkAllHadir = () => {
    setAttendanceMap((prev) => {
      const next: Record<string, { status: AttendanceStatus; notes: string }> = {};
      for (const it of items) {
        next[it.student_id] = {
          status: AttendanceStatus.HADIR,
          notes: prev[it.student_id]?.notes || "",
        };
      }
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (items.length === 0) return;

    setSaving(true);
    setSuccessBanner(null);
    setErrorMessage(null);

    const attendancesPayload = items.map((it) => ({
      student_id: it.student_id,
      status: attendanceMap[it.student_id]?.status || AttendanceStatus.HADIR,
      notes: attendanceMap[it.student_id]?.notes || "",
    }));

    try {
      const res = await api.bulkAttendance({
        class_id: selectedClassId,
        date: selectedDate,
        attendances: attendancesPayload,
      });

      const message = `Presensi berhasil disimpan (${res.recorded_count} siswa tercatat).`;
      setSuccessBanner(message);
      NativeAlert.alert("Berhasil", message);
      await fetchAttendance(true);
    } catch (err: any) {
      const errorMsg =
        err?.message || "Gagal menyimpan presensi kelas. Mohon coba beberapa saat lagi.";
      setErrorMessage(errorMsg);
      NativeAlert.alert("Kendala", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const summaryCounts = items.reduce(
    (acc, it) => {
      const st = attendanceMap[it.student_id]?.status || AttendanceStatus.HADIR;
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {
      [AttendanceStatus.HADIR]: 0,
      [AttendanceStatus.SAKIT]: 0,
      [AttendanceStatus.IZIN]: 0,
      [AttendanceStatus.ALPA]: 0,
    } as Record<AttendanceStatus, number>
  );

  return (
    <View style={styles.container}>
      <TopUtilityBar
        title="Presensi Kelas"
        subtitle="Input dan perbarui kehadiran peserta didik"
        profileName={user?.name || "Staf"}
        onPressNotifications={() => router.push("/notifications")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAttendance(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        {/* Strip 3 PastelStatCard Ringkas */}
        <View style={isTablet ? styles.statsRowTablet : styles.statsRowMobile}>
          <PastelStatCard
            tone="mint"
            value={String(summaryCounts[AttendanceStatus.HADIR])}
            label="Hadir"
            icon="checkmark-circle-outline"
            trendText="Tepat waktu"
            style={styles.statCardItem}
          />
          <PastelStatCard
            tone="butter"
            value={String(summaryCounts[AttendanceStatus.SAKIT])}
            label="Sakit"
            icon="medkit-outline"
            trendText="Perlu istirahat"
            style={styles.statCardItem}
          />
          <PastelStatCard
            tone="iceBlue"
            value={String(
              summaryCounts[AttendanceStatus.IZIN] +
                summaryCounts[AttendanceStatus.ALPA]
            )}
            label="Izin & Alpa"
            icon="alert-circle-outline"
            trendText={`${summaryCounts[AttendanceStatus.IZIN]} Izin / ${summaryCounts[AttendanceStatus.ALPA]} Alpa`}
            style={styles.statCardItem}
          />
        </View>

        {/* Kontrol Kelas & Tanggal */}
        <Card style={styles.controlCard}>
          <Text style={styles.controlLabel}>Pilih Rombel / Kelas:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classChipsRow}
          >
            {availableClasses.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.classChip,
                    isSelected ? styles.classChipSelected : styles.classChipUnselected,
                  ]}
                  onPress={() => setSelectedClassId(cls.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih rombel ${cls.name}`}
                >
                  <Text
                    style={[
                      styles.classChipText,
                      isSelected ? styles.classChipTextSelected : styles.classChipTextUnselected,
                    ]}
                  >
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.dateRow}>
            <View style={styles.dateInputCol}>
              <Input
                label="Tanggal Presensi (YYYY-MM-DD)"
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="2024-10-25"
                accessibilityLabel="Tanggal presensi"
                leftAddon={
                  <Ionicons name="calendar-outline" size={18} color={shadcn.mutedForeground} />
                }
              />
            </View>
            <Button
              title="Hari Ini"
              variant="outline"
              size="sm"
              onPress={() => setSelectedDate(todayStr)}
              accessibilityLabel="Pilih tanggal hari ini"
              style={styles.todayButton}
            />
          </View>

          <View style={styles.dateActionRow}>
            <Text style={styles.formattedDateInfo}>
              {formatTanggalId(selectedDate, { includeDay: true })}
            </Text>
            {items.length > 0 && !loading && (
              <Button
                title="Semua Hadir"
                variant="outline"
                size="sm"
                onPress={handleMarkAllHadir}
                accessibilityLabel="Tandai semua siswa hadir"
                leftIcon={<Ionicons name="checkmark-done" size={16} color={shadcn.foreground} />}
              />
            )}
          </View>
        </Card>

        {/* Banner Sukses */}
        {Boolean(successBanner) && (
          <Alert
            variant="default"
            title="Presensi Berhasil Disimpan"
            description={successBanner!}
            style={styles.alertBanner}
          />
        )}

        {/* State Loading / Error / Empty */}
        {loading && !refreshing ? (
          <StateView type="loading" message="Memuat daftar siswa kelas..." />
        ) : errorMessage && items.length === 0 ? (
          <StateView
            type="error"
            title="Gagal Memuat Data"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchAttendance()}
          />
        ) : items.length === 0 ? (
          <StateView
            type="empty"
            title="Tidak Ada Siswa"
            message="Belum ada data siswa terdaftar di rombongan belajar ini."
          />
        ) : (
          <View style={styles.studentsWrapper}>
            {items.map((student) => {
              const currentStatus =
                attendanceMap[student.student_id]?.status || AttendanceStatus.HADIR;
              const currentNotes = attendanceMap[student.student_id]?.notes || "";

              return (
                <View key={student.student_id} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <Avatar name={student.student_name} size="sm" style={styles.studentAvatar} />
                    <View style={styles.studentInfoCol}>
                      <Text style={styles.studentName}>{student.student_name}</Text>
                      <Text style={styles.studentNis}>NIS: {student.nis}</Text>
                    </View>
                  </View>

                  {/* 4 Tombol Toggle Status Cepat (Min 44x44pt) */}
                  <View style={styles.toggleRow}>
                    {/* HADIR */}
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        currentStatus === AttendanceStatus.HADIR
                          ? styles.toggleHadirActive
                          : styles.toggleButtonInactive,
                      ]}
                      onPress={() =>
                        handleStatusChange(student.student_id, AttendanceStatus.HADIR)
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Hadir untuk ${student.student_name}`}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          currentStatus === AttendanceStatus.HADIR
                            ? styles.toggleHadirTextActive
                            : styles.toggleButtonTextInactive,
                        ]}
                      >
                        H
                      </Text>
                      <Text
                        style={[
                          styles.toggleSubText,
                          currentStatus === AttendanceStatus.HADIR
                            ? styles.toggleHadirTextActive
                            : styles.toggleSubTextInactive,
                        ]}
                      >
                        Hadir
                      </Text>
                    </TouchableOpacity>

                    {/* SAKIT */}
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        currentStatus === AttendanceStatus.SAKIT
                          ? styles.toggleSakitActive
                          : styles.toggleButtonInactive,
                      ]}
                      onPress={() =>
                        handleStatusChange(student.student_id, AttendanceStatus.SAKIT)
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Sakit untuk ${student.student_name}`}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          currentStatus === AttendanceStatus.SAKIT
                            ? styles.toggleSakitTextActive
                            : styles.toggleButtonTextInactive,
                        ]}
                      >
                        S
                      </Text>
                      <Text
                        style={[
                          styles.toggleSubText,
                          currentStatus === AttendanceStatus.SAKIT
                            ? styles.toggleSakitTextActive
                            : styles.toggleSubTextInactive,
                        ]}
                      >
                        Sakit
                      </Text>
                    </TouchableOpacity>

                    {/* IZIN */}
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        currentStatus === AttendanceStatus.IZIN
                          ? styles.toggleIzinActive
                          : styles.toggleButtonInactive,
                      ]}
                      onPress={() =>
                        handleStatusChange(student.student_id, AttendanceStatus.IZIN)
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Izin untuk ${student.student_name}`}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          currentStatus === AttendanceStatus.IZIN
                            ? styles.toggleIzinTextActive
                            : styles.toggleButtonTextInactive,
                        ]}
                      >
                        I
                      </Text>
                      <Text
                        style={[
                          styles.toggleSubText,
                          currentStatus === AttendanceStatus.IZIN
                            ? styles.toggleIzinTextActive
                            : styles.toggleSubTextInactive,
                        ]}
                      >
                        Izin
                      </Text>
                    </TouchableOpacity>

                    {/* ALPA */}
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        currentStatus === AttendanceStatus.ALPA
                          ? styles.toggleAlpaActive
                          : styles.toggleButtonInactive,
                      ]}
                      onPress={() =>
                        handleStatusChange(student.student_id, AttendanceStatus.ALPA)
                      }
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Alpa untuk ${student.student_name}`}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          currentStatus === AttendanceStatus.ALPA
                            ? styles.toggleAlpaTextActive
                            : styles.toggleButtonTextInactive,
                        ]}
                      >
                        A
                      </Text>
                      <Text
                        style={[
                          styles.toggleSubText,
                          currentStatus === AttendanceStatus.ALPA
                            ? styles.toggleAlpaTextActive
                            : styles.toggleSubTextInactive,
                        ]}
                      >
                        Alpa
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input Catatan Opsional */}
                  <Input
                    placeholder="Catatan kendala / keterangan..."
                    value={currentNotes}
                    onChangeText={(val) => handleNotesChange(student.student_id, val)}
                    style={styles.notesInput}
                    accessibilityLabel={`Catatan presensi untuk ${student.student_name}`}
                  />
                </View>
              );
            })}

            {/* Tombol Simpan Utama */}
            <View style={styles.saveWrapper}>
              <Button
                title={saving ? "Menyimpan..." : "Simpan Presensi Kelas"}
                onPress={handleSaveAttendance}
                variant="default"
                size="lg"
                loading={saving}
                leftIcon={<Ionicons name="save-outline" size={20} color={shadcn.primaryForeground} />}
                accessibilityLabel="Simpan seluruh data presensi rombel"
                style={styles.saveMainButton}
              />
            </View>
          </View>
        )}
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
  statsRowTablet: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsRowMobile: {
    flexDirection: "column",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCardItem: {
    flex: 1,
  },
  controlCard: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  controlLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    marginBottom: spacing.xs,
  },
  classChipsRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  classChip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  classChipSelected: {
    backgroundColor: shadcn.primary,
    borderColor: shadcn.primary,
  },
  classChipUnselected: {
    backgroundColor: shadcn.background,
    borderColor: shadcn.border,
  },
  classChipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  classChipTextSelected: {
    color: shadcn.primaryForeground,
  },
  classChipTextUnselected: {
    color: shadcn.foreground,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  dateInputCol: {
    flex: 1,
  },
  todayButton: {
    minHeight: touchTarget.minHeight,
    marginBottom: spacing.xs,
  },
  dateActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  formattedDateInfo: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
  },
  alertBanner: {
    marginBottom: spacing.md,
  },
  studentsWrapper: {
    gap: spacing.md,
  },
  studentCard: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  studentAvatar: {
    marginRight: spacing.sm,
  },
  studentInfoCol: {
    flex: 1,
  },
  studentName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  studentNis: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: spacing.xs,
  },
  toggleButtonInactive: {
    backgroundColor: shadcn.secondary,
    borderColor: shadcn.border,
  },
  toggleButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  toggleButtonTextInactive: {
    color: shadcn.mutedForeground,
  },
  toggleSubText: {
    fontSize: 10,
    marginTop: 1,
  },
  toggleSubTextInactive: {
    color: shadcn.mutedForeground,
  },
  toggleHadirActive: {
    backgroundColor: bento.mint,
    borderColor: bento.mintText,
  },
  toggleHadirTextActive: {
    color: bento.mintText,
  },
  toggleSakitActive: {
    backgroundColor: bento.butter,
    borderColor: bento.butterText,
  },
  toggleSakitTextActive: {
    color: bento.butterText,
  },
  toggleIzinActive: {
    backgroundColor: bento.iceBlue,
    borderColor: bento.iceBlueText,
  },
  toggleIzinTextActive: {
    color: bento.iceBlueText,
  },
  toggleAlpaActive: {
    backgroundColor: shadcn.status.danger.bg,
    borderColor: shadcn.status.danger.border,
  },
  toggleAlpaTextActive: {
    color: shadcn.status.danger.text,
  },
  notesInput: {
    marginTop: spacing.xs,
  },
  saveWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  saveMainButton: {
    minHeight: 48,
  },
});
