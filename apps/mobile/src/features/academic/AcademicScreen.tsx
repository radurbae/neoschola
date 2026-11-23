import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  formatTanggalId,
  DayOfWeek,
  type Schedule,
  type Assignment,
  type GradeNote,
} from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  PastelStatCard,
  DarkIconRow,
  Tabs,
  Chip,
  Separator,
  ChildSwitcher,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  bento,
  shadcn,
  breakpoints,
  layout,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

type AcademicTab = "JADWAL" | "TUGAS" | "NILAI";

export default function AcademicScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  const {
    user,
    students,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    unreadNotificationCount,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AcademicTab>("JADWAL");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeNote[]>([]);

  const todayDayIndex = new Date().getDay();
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
          err?.message ||
            "Gagal memuat informasi akademik. Periksa koneksi internet Anda."
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

  const filteredSchedules = schedules.filter(
    (s) => s.day_of_week === selectedDay
  );

  return (
    <Screen scroll={false} headerShown={false} style={styles.screen}>
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isTablet
              ? layout.tabletPaddingX
              : layout.mobilePaddingX,
            paddingTop: isTablet ? 8 : 4,
            paddingBottom: isTablet
              ? layout.scrollBottomPad
              : layout.mobileDockClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAcademicData(true)}
            tintColor={shadcn.primary}
          />
        }
      >
        <View style={styles.headerBlock}>
          <TopUtilityBar
            noHorizontalPadding
            title="Akademik"
            subtitle={activeStudent ? activeStudent.full_name : undefined}
            profileName={user?.name || "Wali Murid"}
            unreadCount={unreadNotificationCount}
            onPressAnnouncements={() => router.push("/pengumuman")}
            onPressNotifications={() => router.push("/notifications")}
            onPressProfile={() => router.push("/(tabs)/profil")}
          />

          {students.length > 0 && (
            <ChildSwitcher
              students={students}
              activeStudentId={activeStudentId}
              onSelectStudent={(id) => setActiveStudentId(id)}
            />
          )}
        </View>

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
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Ringkasan Akademik</Text>
            </View>

            {isTablet ? (
              <View style={styles.statCardsRowTablet}>
                <PastelStatCard
                  tone="iceBlue"
                  value={`${schedules.length} Mapel`}
                  label="Jadwal Belajar"
                  trendText={selectedDay}
                  icon="time-outline"
                  style={styles.statCardItemTablet}
                />
                <PastelStatCard
                  tone="lavender"
                  value={`${assignments.length} Tugas`}
                  label="Tugas Aktif"
                  trendText="PR dan Tugas"
                  icon="document-text-outline"
                  style={styles.statCardItemTablet}
                />
                <PastelStatCard
                  tone="mint"
                  value={`${grades.length} Rilis`}
                  label="Catatan Nilai"
                  trendText="Evaluasi"
                  icon="ribbon-outline"
                  style={styles.statCardItemTablet}
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={180}
                decelerationRate="fast"
                snapToAlignment="start"
                style={styles.statCardsMobileStrip}
                contentContainerStyle={styles.statCardsScrollMobile}
              >
                <PastelStatCard
                  tone="iceBlue"
                  value={`${schedules.length} Mapel`}
                  label="Jadwal Belajar"
                  trendText={selectedDay}
                  icon="time-outline"
                  style={styles.statCardItemMobile}
                />
                <PastelStatCard
                  tone="lavender"
                  value={`${assignments.length} Tugas`}
                  label="Tugas Aktif"
                  trendText="PR dan Tugas"
                  icon="document-text-outline"
                  style={styles.statCardItemMobile}
                />
                <PastelStatCard
                  tone="mint"
                  value={`${grades.length} Rilis`}
                  label="Catatan Nilai"
                  trendText="Evaluasi"
                  icon="ribbon-outline"
                  style={styles.statCardItemMobile}
                />
              </ScrollView>
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
                    label: "Tugas dan PR",
                    count: assignments.length > 0 ? assignments.length : undefined,
                  },
                  { value: "NILAI", label: "Nilai" },
                ]}
              />
            </View>

            {/* TAB 1: JADWAL PELAJARAN */}
            {activeTab === "JADWAL" && (
              <View style={styles.tabContentContainer}>
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

                <View style={styles.listCard}>
                  {filteredSchedules.length === 0 ? (
                    <View style={styles.emptyInlineRow}>
                      <Text style={styles.emptyInlineText}>
                        Tidak ada jadwal kegiatan belajar mengajar tercatat di hari{" "}
                        {selectedDay}.
                      </Text>
                    </View>
                  ) : (
                    filteredSchedules.map((schedule, idx) => (
                      <React.Fragment key={schedule.id}>
                        {idx > 0 && <Separator />}
                        <DarkIconRow
                          icon="book-outline"
                          title={schedule.subject}
                          subtitle={`Guru: ${schedule.teacher_name} • Ruang: ${schedule.room}`}
                          rightPrimary={`${schedule.start_time} - ${schedule.end_time}`}
                          rightSecondary="WIB"
                          accessibilityLabel={`Jadwal: ${schedule.subject}, waktu ${schedule.start_time} sampai ${schedule.end_time}`}
                        />
                      </React.Fragment>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: TUGAS & PR */}
            {activeTab === "TUGAS" && (
              <View style={styles.tabContentContainer}>
                <View style={styles.listCard}>
                  {assignments.length === 0 ? (
                    <View style={styles.emptyInlineRow}>
                      <Text style={styles.emptyInlineText}>
                        Saat ini belum ada tugas atau pekerjaan rumah baru untuk
                        kelas anak Anda.
                      </Text>
                    </View>
                  ) : (
                    assignments.map((assignment, idx) => (
                      <React.Fragment key={assignment.id}>
                        {idx > 0 && <Separator />}
                        <DarkIconRow
                          icon="document-text-outline"
                          title={assignment.title}
                          subtitle={`${assignment.subject} • Oleh: ${
                            assignment.assigned_by_name || assignment.assigned_by
                          }${
                            assignment.description
                              ? ` • ${assignment.description}`
                              : ""
                          }`}
                          rightPrimary={formatTanggalId(assignment.due_date, {
                            shortMonth: true,
                          })}
                          rightSecondary="Tenggat"
                          rightSecondaryTone="warning"
                          accessibilityLabel={`Tugas: ${assignment.title}, tenggat ${formatTanggalId(
                            assignment.due_date,
                            { shortMonth: true }
                          )}`}
                        />
                      </React.Fragment>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* TAB 3: NILAI & CATATAN */}
            {activeTab === "NILAI" && (
              <View style={styles.tabContentContainer}>
                <View style={styles.listCard}>
                  {grades.length === 0 ? (
                    <View style={styles.emptyInlineRow}>
                      <Text style={styles.emptyInlineText}>
                        Catatan capaian nilai dan perkembangan dari guru mata
                        pelajaran belum dirilis.
                      </Text>
                    </View>
                  ) : (
                    grades.map((grade, idx) => (
                      <React.Fragment key={grade.id}>
                        {idx > 0 && <Separator />}
                        <DarkIconRow
                          icon="ribbon-outline"
                          title={grade.subject}
                          subtitle={`Sem ${grade.semester} (${
                            grade.academic_year
                          }) • ${grade.teacher_name || "Guru Pengampu"}${
                            grade.notes ? ` • ${grade.notes}` : ""
                          }`}
                          rightPrimary={`${grade.score} / 100`}
                          rightSecondary={
                            grade.score >= 80 ? "Sangat Baik" : "Cukup"
                          }
                          rightSecondaryTone={
                            grade.score >= 80 ? "success" : "info"
                          }
                          accessibilityLabel={`Nilai ${grade.subject}: ${grade.score} dari 100`}
                        />
                      </React.Fragment>
                    ))
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: bento.surface,
  },
  headerBlock: {
    gap: 12,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: layout.sectionGap,
  },
  sectionHeaderRow: {
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  statCardsRowTablet: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  statCardItemTablet: {
    flex: 1,
    alignSelf: "stretch",
  },
  statCardsMobileStrip: {
    marginHorizontal: -layout.mobilePaddingX,
  },
  statCardsScrollMobile: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: layout.mobilePaddingX,
    paddingVertical: spacing.xs,
  },
  statCardItemMobile: {
    width: 168,
    minHeight: 164,
  },
  tabBarWrapper: {
    marginTop: spacing.xs,
  },
  tabContentContainer: {
    gap: spacing.sm,
  },
  daySelectorRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  listCard: {
    backgroundColor: bento.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: shadcn.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  emptyInlineRow: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.minHeight,
  },
  emptyInlineText: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    textAlign: "center",
  },
});
