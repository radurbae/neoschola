import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  formatTanggalId,
  DayOfWeek,
  type Schedule,
  type Assignment,
  type GradeNote,
} from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Chip,
  SectionHeader,
  ChildSwitcher,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

type AcademicTab = "JADWAL" | "TUGAS" | "NILAI";

export default function AcademicScreen() {
  const { students, activeStudent, activeStudentId, setActiveStudentId } = useAuth();

  const [activeTab, setActiveTab] = useState<AcademicTab>("JADWAL");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeNote[]>([]);

  // Filter hari untuk Jadwal
  const todayDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 5 is Friday
  const defaultDay: DayOfWeek =
    todayDayIndex === 2
      ? DayOfWeek.SELASA
      : todayDayIndex === 3
      ? DayOfWeek.RABU
      : todayDayIndex === 4
      ? DayOfWeek.KAMIS
      : todayDayIndex === 5
      ? DayOfWeek.JUMAT
      : DayOfWeek.SENIN;

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(defaultDay);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAcademicData = useCallback(
    async (isRefresh = false) => {
      if (!activeStudent?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const [schedRes, assignRes, gradeRes] = await Promise.all([
          api.getSchedule({
            student_id: activeStudent.id,
            class_id: activeStudent.class_id,
          }),
          api.getAssignments({
            student_id: activeStudent.id,
            class_id: activeStudent.class_id,
          }),
          api.getGrades({
            student_id: activeStudent.id,
          }),
        ]);

        setSchedules(schedRes.schedules || []);
        setAssignments(assignRes.assignments || []);
        setGrades(gradeRes.grades || []);
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Gagal memuat informasi akademik. Periksa koneksi internet Anda."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStudent?.id, activeStudent?.class_id]
  );

  useEffect(() => {
    fetchAcademicData();
  }, [fetchAcademicData]);

  const days: DayOfWeek[] = [
    DayOfWeek.SENIN,
    DayOfWeek.SELASA,
    DayOfWeek.RABU,
    DayOfWeek.KAMIS,
    DayOfWeek.JUMAT,
  ];

  const filteredSchedules = schedules.filter((s) => s.day_of_week === selectedDay);

  return (
    <Screen scroll={false} headerShown={false}>
      {/* Top Child Switcher */}
      {students.length > 0 && (
        <View style={styles.childSwitcherWrapper}>
          <ChildSwitcher
            students={students}
            activeStudentId={activeStudentId}
            onSelectStudent={(id) => setActiveStudentId(id)}
          />
        </View>
      )}

      {/* Segmented Tab Navigation Chips */}
      <View style={styles.tabBarWrapper}>
        <Chip
          label="Jadwal Pelajaran"
          selected={activeTab === "JADWAL"}
          onPress={() => setActiveTab("JADWAL")}
          style={styles.tabChip}
          accessibilityLabel="Buka tab Jadwal Pelajaran"
        />
        <Chip
          label="Tugas & PR"
          selected={activeTab === "TUGAS"}
          count={assignments.length > 0 ? assignments.length : undefined}
          onPress={() => setActiveTab("TUGAS")}
          style={styles.tabChip}
          accessibilityLabel="Buka tab Tugas dan Pekerjaan Rumah"
        />
        <Chip
          label="Nilai & Catatan"
          selected={activeTab === "NILAI"}
          onPress={() => setActiveTab("NILAI")}
          style={styles.tabChip}
          accessibilityLabel="Buka tab Nilai dan Catatan Guru"
        />
      </View>

      {/* Body Content */}
      {loading ? (
        <StateView
          type="loading"
          message="Memuat data akademik peserta didik..."
        />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Akademik"
          message={errorMessage}
          actionLabel="Coba Lagi"
          onAction={() => fetchAcademicData()}
        />
      ) : !activeStudent ? (
        <StateView
          type="empty"
          title="Peserta Didik Belum Dipilih"
          message="Silakan pilih anak asuh untuk memantau jadwal dan perkembangannya."
          actionLabel="Muat Ulang"
          onAction={() => fetchAcademicData()}
        />
      ) : (
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAcademicData(true)}
              tintColor={colors.primary}
            />
          }
        >
          {/* TAB 1: JADWAL PELAJARAN */}
          {activeTab === "JADWAL" && (
            <View>
              {/* Day filter selector */}
              <View style={styles.daySelectorRow}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDay === day && styles.dayButtonSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Pilih jadwal hari ${day}`}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDay === day && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionHeader
                title={`Jadwal Hari ${selectedDay}`}
                subtitle={`${filteredSchedules.length} mata pelajaran`}
              />

              {filteredSchedules.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="sunny-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>Tidak Ada Jam Pelajaran</Text>
                  <Text style={styles.emptyMessage}>
                    Tidak ada jadwal kegiatan belajar mengajar yang tercatat di hari {selectedDay}.
                  </Text>
                </Card>
              ) : (
                filteredSchedules.map((schedule) => (
                  <Card key={schedule.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleTimeBadge}>
                      <Ionicons name="time-outline" size={16} color={colors.primary} />
                      <Text style={styles.scheduleTimeRange}>
                        {schedule.start_time} – {schedule.end_time} WIB
                      </Text>
                    </View>

                    <Text style={styles.scheduleSubject}>{schedule.subject}</Text>

                    <View style={styles.scheduleMetaRow}>
                      <View style={styles.scheduleMetaItem}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.scheduleMetaText}>
                          {schedule.teacher_name}
                        </Text>
                      </View>

                      <View style={styles.scheduleMetaItem}>
                        <Ionicons
                          name="business-outline"
                          size={15}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.scheduleMetaText}>{schedule.room}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 2: TUGAS & PR */}
          {activeTab === "TUGAS" && (
            <View>
              <SectionHeader
                title="Daftar Tugas & PR"
                subtitle="Tugas rumah dan penugasan kelas yang perlu dikerjakan"
              />

              {assignments.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.emptyTitle}>Semua Tugas Tuntas</Text>
                  <Text style={styles.emptyMessage}>
                    Saat ini belum ada tugas atau pekerjaan rumah baru untuk kelas anak Anda.
                  </Text>
                </Card>
              ) : (
                assignments.map((assignment) => (
                  <Card key={assignment.id} style={styles.assignmentCard}>
                    <View style={styles.assignmentHeaderRow}>
                      <Badge label={assignment.subject} variant="info" />
                      <View style={styles.assignmentDueTag}>
                        <Ionicons
                          name="alarm-outline"
                          size={15}
                          color={colors.badge.danger.text}
                        />
                        <Text style={styles.assignmentDueText}>
                          Tenggat: {formatTanggalId(assignment.due_date, { includeDay: true })}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.assignmentTitle}>{assignment.title}</Text>

                    {Boolean(assignment.description) && (
                      <Text style={styles.assignmentDescription}>
                        {assignment.description}
                      </Text>
                    )}

                    <View style={styles.assignmentFooter}>
                      <Ionicons
                        name="person-circle-outline"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.assignmentTeacherText}>
                        Pemberi Tugas: {assignment.assigned_by_name || assignment.assigned_by}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 3: NILAI & CATATAN */}
          {activeTab === "NILAI" && (
            <View>
              <SectionHeader
                title="Catatan Nilai & Evaluasi"
                subtitle="Perkembangan capaian belajar dan catatan perkembangan siswa"
              />

              {grades.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons
                    name="ribbon-outline"
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyTitle}>Belum Ada Evaluasi Nilai</Text>
                  <Text style={styles.emptyMessage}>
                    Catatan capaian nilai dan perkembangan dari guru mata pelajaran belum dirilis.
                  </Text>
                </Card>
              ) : (
                grades.map((grade) => (
                  <Card key={grade.id} style={styles.gradeCard}>
                    <View style={styles.gradeHeaderRow}>
                      <View style={styles.gradeSubjectCol}>
                        <Text style={styles.gradeSubjectText}>{grade.subject}</Text>
                        <Text style={styles.gradeTeacherText}>
                          {grade.teacher_name || "Guru Pengampu"}
                        </Text>
                      </View>
                      <Badge
                        label={`Semester ${grade.semester} (${grade.academic_year})`}
                        variant="neutral"
                      />
                    </View>

                    <View style={styles.gradeScoreRow}>
                      <View style={styles.gradeScoreBox}>
                        <Text style={styles.gradeScoreNumber}>{grade.score}</Text>
                        <Text style={styles.gradeScoreMax}>/ 100</Text>
                      </View>
                    </View>

                    {Boolean(grade.notes) && (
                      <View style={styles.gradeNotesBox}>
                        <View style={styles.gradeNotesHeader}>
                          <Ionicons
                            name="bulb-outline"
                            size={16}
                            color={colors.primary}
                          />
                          <Text style={styles.gradeNotesTitle}>
                            Catatan Guru Pengampu:
                          </Text>
                        </View>
                        <Text style={styles.gradeNotesContent}>{grade.notes}</Text>
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  childSwitcherWrapper: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabBarWrapper: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Day Selector
  daySelectorRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.md,
  },
  dayButton: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  dayButtonTextSelected: {
    color: colors.textInverse,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: typography.lineHeight.xs,
  },
  // Schedule Cards
  scheduleCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  scheduleTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  scheduleTimeRange: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    marginLeft: spacing.xs,
  },
  scheduleSubject: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  scheduleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scheduleMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleMetaText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  // Assignment Cards
  assignmentCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  assignmentDueTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  assignmentDueText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.badge.danger.text,
    marginLeft: 3,
  },
  assignmentTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  assignmentDescription: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.xs,
    marginBottom: spacing.sm,
  },
  assignmentFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignmentTeacherText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  // Grade Cards
  gradeCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  gradeHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  gradeSubjectCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  gradeSubjectText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  gradeTeacherText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gradeScoreRow: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  gradeScoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  gradeScoreNumber: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.heavy,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  gradeScoreMax: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginLeft: 4,
  },
  gradeNotesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  gradeNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  gradeNotesTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  gradeNotesContent: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.xs,
  },
});
