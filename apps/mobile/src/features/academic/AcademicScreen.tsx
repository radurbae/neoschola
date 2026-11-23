import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
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
  Tabs,
  SectionHeader,
  ChildSwitcher,
  StateView,
  Separator,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography } from "../../theme/tokens";

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
    <Screen scroll={false} headerShown={false} style={styles.screen}>
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

      {/* Segmented Tab Navigation dengan Komponen Tabs shadcn/ui */}
      <View style={styles.tabBarWrapper}>
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as AcademicTab)}
          items={[
            { value: "JADWAL", label: "Jadwal" },
            {
              value: "TUGAS",
              label: "Tugas & PR",
              count: assignments.length > 0 ? assignments.length : undefined,
            },
            { value: "NILAI", label: "Nilai" },
          ]}
          style={styles.tabsRail}
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
              tintColor={shadcn.primary}
            />
          }
        >
          {/* TAB 1: JADWAL PELAJARAN */}
          {activeTab === "JADWAL" && (
            <View>
              {/* Day filter selector menggunakan Chip horizontal */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daySelectorRow}
              >
                {days.map((day) => (
                  <Chip
                    key={day}
                    label={day}
                    selected={selectedDay === day}
                    onPress={() => setSelectedDay(day)}
                    accessibilityLabel={`Pilih jadwal hari ${day}`}
                  />
                ))}
              </ScrollView>

              <SectionHeader
                title={`Jadwal Hari ${selectedDay}`}
                subtitle={`${filteredSchedules.length} mata pelajaran`}
              />

              <Card style={styles.listCard}>
                {filteredSchedules.length === 0 ? (
                  <View style={styles.emptyInlineRow}>
                    <Text style={styles.emptyInlineText}>
                      Tidak ada jadwal kegiatan belajar mengajar yang tercatat di hari {selectedDay}.
                    </Text>
                  </View>
                ) : (
                  filteredSchedules.map((schedule, idx) => (
                    <React.Fragment key={schedule.id}>
                      {idx > 0 && <Separator />}
                      <View style={styles.scheduleRow}>
                        <View style={styles.scheduleTimeBadge}>
                          <Text style={styles.scheduleTimeRange}>
                            {schedule.start_time} - {schedule.end_time} WIB
                          </Text>
                        </View>

                        <Text style={styles.scheduleSubject}>{schedule.subject}</Text>

                        <View style={styles.scheduleMetaRow}>
                          <Text style={styles.scheduleMetaText}>
                            Guru: {schedule.teacher_name}
                          </Text>
                          <Text style={styles.scheduleMetaDot}>•</Text>
                          <Text style={styles.scheduleMetaText}>Ruang: {schedule.room}</Text>
                        </View>
                      </View>
                    </React.Fragment>
                  ))
                )}
              </Card>
            </View>
          )}

          {/* TAB 2: TUGAS & PR */}
          {activeTab === "TUGAS" && (
            <View>
              <SectionHeader
                title="Daftar Tugas & PR"
                subtitle="Tugas rumah dan penugasan kelas yang perlu dikerjakan"
              />

              <Card style={styles.listCard}>
                {assignments.length === 0 ? (
                  <View style={styles.emptyInlineRow}>
                    <Text style={styles.emptyInlineText}>
                      Saat ini belum ada tugas atau pekerjaan rumah baru untuk kelas anak Anda.
                    </Text>
                  </View>
                ) : (
                  assignments.map((assignment, idx) => (
                    <React.Fragment key={assignment.id}>
                      {idx > 0 && <Separator />}
                      <View style={styles.assignmentRow}>
                        <View style={styles.assignmentHeaderRow}>
                          <Badge label={assignment.subject} variant="secondary" />
                          <Text style={styles.assignmentDueText}>
                            Tenggat: {formatTanggalId(assignment.due_date, { includeDay: true })}
                          </Text>
                        </View>

                        <Text style={styles.assignmentTitle}>{assignment.title}</Text>

                        {Boolean(assignment.description) && (
                          <Text style={styles.assignmentDescription}>
                            {assignment.description}
                          </Text>
                        )}

                        <View style={styles.assignmentFooter}>
                          <Text style={styles.assignmentTeacherText}>
                            Pemberi Tugas: {assignment.assigned_by_name || assignment.assigned_by}
                          </Text>
                        </View>
                      </View>
                    </React.Fragment>
                  ))
                )}
              </Card>
            </View>
          )}

          {/* TAB 3: NILAI & CATATAN */}
          {activeTab === "NILAI" && (
            <View>
              <SectionHeader
                title="Catatan Nilai & Evaluasi"
                subtitle="Perkembangan capaian belajar dan catatan perkembangan siswa"
              />

              <Card style={styles.listCard}>
                {grades.length === 0 ? (
                  <View style={styles.emptyInlineRow}>
                    <Text style={styles.emptyInlineText}>
                      Catatan capaian nilai dan perkembangan dari guru mata pelajaran belum dirilis.
                    </Text>
                  </View>
                ) : (
                  grades.map((grade, idx) => (
                    <React.Fragment key={grade.id}>
                      {idx > 0 && <Separator />}
                      <View style={styles.gradeRow}>
                        <View style={styles.gradeHeaderRow}>
                          <View style={styles.gradeSubjectCol}>
                            <Text style={styles.gradeSubjectText}>{grade.subject}</Text>
                            <Text style={styles.gradeTeacherText}>
                              {grade.teacher_name || "Guru Pengampu"}
                            </Text>
                          </View>
                          <Badge
                            label={`Semester ${grade.semester} (${grade.academic_year})`}
                            variant="outline"
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
                            <Text style={styles.gradeNotesTitle}>
                              Catatan Guru Pengampu:
                            </Text>
                            <Text style={styles.gradeNotesContent}>{grade.notes}</Text>
                          </View>
                        )}
                      </View>
                    </React.Fragment>
                  ))
                )}
              </Card>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: shadcn.canvas,
  },
  childSwitcherWrapper: {
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabBarWrapper: {
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabsRail: {
    marginBottom: spacing.sm,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Day Selector
  daySelectorRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  emptyInlineRow: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInlineText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    textAlign: "center",
  },
  // Schedule Rows
  scheduleRow: {
    padding: spacing.md,
  },
  scheduleTimeBadge: {
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  scheduleTimeRange: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  scheduleSubject: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: spacing.xs,
  },
  scheduleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleMetaText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
  },
  scheduleMetaDot: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginHorizontal: spacing.xs,
  },
  // Assignment Rows
  assignmentRow: {
    padding: spacing.md,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  assignmentDueText: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  assignmentTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: spacing.xs,
  },
  assignmentDescription: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  assignmentFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: shadcn.border,
  },
  assignmentTeacherText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  // Grade Rows
  gradeRow: {
    padding: spacing.md,
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
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  gradeTeacherText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  gradeScoreRow: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
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
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  gradeScoreMax: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    marginLeft: 4,
  },
  gradeNotesBox: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.sm,
  },
  gradeNotesTitle: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: 2,
  },
  gradeNotesContent: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    lineHeight: 16,
  },
});
