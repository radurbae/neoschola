import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AttendanceStatus,
  Role,
  formatTanggalId,
} from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Button,
  Input,
  StateView,
  Avatar,
  Separator,
  Alert,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import type { ClassAttendanceItem } from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../../theme/tokens";

interface ClassOption {
  id: string;
  name: string;
}

export function StaffAttendanceScreen() {
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
    <Screen
      scroll={false}
      headerShown={true}
      title="Presensi Kelas"
      subtitle="Input dan perbarui kehadiran peserta didik"
    >
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

          <Text style={styles.formattedDateInfo}>
            {formatTanggalId(selectedDate, { includeDay: true })}
          </Text>
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

        {/* Bar Ringkasan & Tindakan Cepat */}
        {items.length > 0 && !loading && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCounters}>
              <View style={styles.counterItem}>
                <Text style={[styles.counterNumber, { color: shadcn.status.success.text }]}>
                  {summaryCounts[AttendanceStatus.HADIR]}
                </Text>
                <Text style={styles.counterLabel}>Hadir</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={[styles.counterNumber, { color: shadcn.status.warning.text }]}>
                  {summaryCounts[AttendanceStatus.SAKIT]}
                </Text>
                <Text style={styles.counterLabel}>Sakit</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={[styles.counterNumber, { color: shadcn.status.info.text }]}>
                  {summaryCounts[AttendanceStatus.IZIN]}
                </Text>
                <Text style={styles.counterLabel}>Izin</Text>
              </View>
              <View style={styles.counterItem}>
                <Text style={[styles.counterNumber, { color: shadcn.status.danger.text }]}>
                  {summaryCounts[AttendanceStatus.ALPA]}
                </Text>
                <Text style={styles.counterLabel}>Alpa</Text>
              </View>
            </View>

            <Button
              title="Semua Hadir"
              variant="outline"
              size="sm"
              onPress={handleMarkAllHadir}
              accessibilityLabel="Tandai semua siswa hadir"
              leftIcon={<Ionicons name="checkmark-done" size={16} color={shadcn.foreground} />}
            />
          </Card>
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
            <Card style={styles.studentsCard}>
              {items.map((student, index) => {
                const currentStatus =
                  attendanceMap[student.student_id]?.status || AttendanceStatus.HADIR;
                const currentNotes = attendanceMap[student.student_id]?.notes || "";

                return (
                  <View key={student.student_id}>
                    {index > 0 && <Separator />}
                    <View style={styles.studentItem}>
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

                      {/* Input Catatan Opsional jika Sakit/Izin/Alpa */}
                      {currentStatus !== AttendanceStatus.HADIR && (
                        <View style={styles.notesContainer}>
                          <Input
                            placeholder="Tulis catatan (misal: Surat dokter terlampir)"
                            value={currentNotes}
                            onChangeText={(txt) => handleNotesChange(student.student_id, txt)}
                            accessibilityLabel={`Catatan presensi ${student.student_name}`}
                            containerStyle={styles.notesInputContainer}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* Tombol Simpan Presensi Utama */}
            <View style={styles.saveButtonContainer}>
              <Button
                title={saving ? "Menyimpan Data..." : "Simpan Presensi Kelas"}
                onPress={handleSaveAttendance}
                variant="default"
                loading={saving}
                size="lg"
                accessibilityLabel="Simpan Presensi Kelas Sekarang"
                leftIcon={<Ionicons name="cloud-upload-outline" size={18} color={shadcn.primaryForeground} />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max * 2,
  },
  controlCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
  },
  controlLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: spacing.xs,
  },
  classChipsRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  classChip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
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
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  classChipTextSelected: {
    color: shadcn.primaryForeground,
    fontWeight: typography.weight.semibold,
  },
  classChipTextUnselected: {
    color: shadcn.foreground,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  dateInputCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  todayButton: {
    marginBottom: spacing.md,
  },
  formattedDateInfo: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
  },
  alertBanner: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
    marginBottom: spacing.md,
  },
  summaryCounters: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterItem: {
    alignItems: "center",
    marginRight: spacing.lg,
  },
  counterNumber: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
  },
  counterLabel: {
    fontSize: 10,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
  },
  studentsWrapper: {
    marginBottom: spacing.lg,
  },
  studentsCard: {
    padding: 0,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
    overflow: "hidden",
  },
  studentItem: {
    padding: spacing.md,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
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
    justifyContent: "space-between",
  },
  toggleButton: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
    paddingVertical: spacing.xs,
  },
  toggleButtonInactive: {
    backgroundColor: shadcn.background,
    borderColor: shadcn.border,
  },
  toggleHadirActive: {
    backgroundColor: shadcn.status.success.bg,
    borderColor: shadcn.status.success.border,
  },
  toggleSakitActive: {
    backgroundColor: shadcn.status.warning.bg,
    borderColor: shadcn.status.warning.border,
  },
  toggleIzinActive: {
    backgroundColor: shadcn.status.info.bg,
    borderColor: shadcn.status.info.border,
  },
  toggleAlpaActive: {
    backgroundColor: shadcn.status.danger.bg,
    borderColor: shadcn.status.danger.border,
  },
  toggleButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  toggleButtonTextInactive: {
    color: shadcn.mutedForeground,
  },
  toggleHadirTextActive: {
    color: shadcn.status.success.text,
  },
  toggleSakitTextActive: {
    color: shadcn.status.warning.text,
  },
  toggleIzinTextActive: {
    color: shadcn.status.info.text,
  },
  toggleAlpaTextActive: {
    color: shadcn.status.danger.text,
  },
  toggleSubText: {
    fontSize: 9,
    fontWeight: typography.weight.medium,
    marginTop: 1,
  },
  toggleSubTextInactive: {
    color: shadcn.mutedForeground,
  },
  notesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: shadcn.border,
  },
  notesInputContainer: {
    marginBottom: 0,
  },
  saveButtonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.max,
  },
});
