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
  LeaveType,
  AttendanceStatus,
  type Attendance,
  type LeaveRequest,
  type StudentDashboardResponse,
} from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  PastelStatCard,
  DarkActionCard,
  DarkIconRow,
  Tabs,
  Separator,
  Sheet,
  Button,
  Label,
  Input,
  Alert,
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

export default function AttendanceScreen() {
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

  const [dashboardData, setDashboardData] =
    useState<StudentDashboardResponse | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Sheet State & Form
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [leaveType, setLeaveType] = useState<"SAKIT" | "IZIN">(LeaveType.SAKIT);
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchData = useCallback(
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
        const [dashRes, attRes, leaveRes] = await Promise.all([
          api.getStudentDashboard(activeStudent.id),
          api.getAttendance({ student_id: activeStudent.id }),
          api.getLeaveRequests({ student_id: activeStudent.id }),
        ]);

        setDashboardData(dashRes);
        setAttendanceList(attRes.items || []);
        setLeaveRequests(leaveRes.items || []);
      } catch (err: any) {
        setErrorMessage(
          err?.message ||
            "Gagal memuat data presensi. Periksa koneksi internet Anda."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStudent?.id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setLeaveType(LeaveType.SAKIT);
    setStartDate(today);
    setEndDate(today);
    setReason("");
    setAttachmentUrl("");
    setFormErrors({});
    setModalVisible(true);
  };

  const handleSubmitLeave = async () => {
    const errors: { [key: string]: string } = {};

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate.trim() || !dateRegex.test(startDate.trim())) {
      errors.startDate = "Format tanggal mulai harus YYYY-MM-DD (cth: 2026-11-22)";
    }
    if (!endDate.trim() || !dateRegex.test(endDate.trim())) {
      errors.endDate =
        "Format tanggal selesai harus YYYY-MM-DD (cth: 2026-11-22)";
    }
    if (startDate.trim() && endDate.trim() && startDate.trim() > endDate.trim()) {
      errors.endDate =
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai";
    }

    if (!reason.trim() || reason.trim().length < 3) {
      errors.reason = "Alasan izin wajib diisi minimal 3 karakter";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      if (!activeStudent?.id) return;
      await api.createLeaveRequest({
        student_id: activeStudent.id,
        leave_type: leaveType,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        reason: reason.trim(),
        attachment_url: attachmentUrl.trim() || undefined,
      });

      setModalVisible(false);
      setSuccessBanner(
        `Pengajuan ${
          leaveType === "SAKIT" ? "sakit" : "izin"
        } berhasil dikirim ke wali kelas.`
      );
      setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);

      await fetchData(true);
    } catch (err: any) {
      setFormErrors({
        general:
          err?.message ||
          "Gagal mengirim formulir izin. Silakan coba beberapa saat lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = dashboardData?.attendance_summary || {
    hadir: attendanceList.filter((a) => a.status === AttendanceStatus.HADIR).length,
    sakit: attendanceList.filter((a) => a.status === AttendanceStatus.SAKIT).length,
    izin: attendanceList.filter((a) => a.status === AttendanceStatus.IZIN).length,
    alpa: attendanceList.filter((a) => a.status === AttendanceStatus.ALPA).length,
    percentage:
      attendanceList.length > 0
        ? Math.round(
            (attendanceList.filter((a) => a.status === AttendanceStatus.HADIR)
              .length /
              attendanceList.length) *
              100
          )
        : 100,
  };

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
            onRefresh={() => fetchData(true)}
            tintColor={shadcn.primary}
          />
        }
      >
        <View style={styles.headerBlock}>
          <TopUtilityBar
            noHorizontalPadding
            title="Presensi"
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

        {Boolean(successBanner) && (
          <View style={styles.successBannerContainer}>
            <Text style={styles.successBannerText}>{successBanner}</Text>
          </View>
        )}

        {/* Main Content Body */}
        {loading ? (
          <StateView
            type="loading"
            message="Memuat catatan presensi peserta didik..."
          />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Gagal Memuat Presensi"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchData()}
          />
        ) : !activeStudent ? (
          <StateView
            type="empty"
            title="Data Siswa Tidak Ditemukan"
            message="Silakan pilih siswa aktif untuk melihat catatan presensi."
            actionLabel="Muat Ulang"
            onAction={() => fetchData()}
          />
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Ringkasan Kehadiran</Text>
            </View>

            {isTablet ? (
              <View style={styles.statCardsRowTablet}>
                <PastelStatCard
                  tone="mint"
                  value={`${summary.hadir} Hari`}
                  label="Kehadiran Hadir"
                  trendText={`${summary.percentage}% Total`}
                  icon="checkmark-circle-outline"
                  style={styles.statCardItemTablet}
                />
                <PastelStatCard
                  tone="butter"
                  value={`${summary.sakit} Hari`}
                  label="Izin Sakit"
                  trendText="Izin Medis"
                  icon="medkit-outline"
                  style={styles.statCardItemTablet}
                />
                <PastelStatCard
                  tone="iceBlue"
                  value={`${summary.izin} Hari`}
                  label="Izin Keperluan"
                  trendText="Dispensasi"
                  icon="calendar-outline"
                  style={styles.statCardItemTablet}
                />
              </View>
            ) : (
              <View style={styles.statCardsMobileSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={188}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  style={styles.statCardsMobileStrip}
                  contentContainerStyle={styles.statCardsScrollMobile}
                >
                  <PastelStatCard
                    tone="mint"
                    value={`${summary.hadir} Hari`}
                    label="Kehadiran Hadir"
                    trendText={`${summary.percentage}% Total`}
                    icon="checkmark-circle-outline"
                    style={styles.statCardItemMobile}
                  />
                  <PastelStatCard
                    tone="butter"
                    value={`${summary.sakit} Hari`}
                    label="Izin Sakit"
                    trendText="Izin Medis"
                    icon="medkit-outline"
                    style={styles.statCardItemMobile}
                  />
                  <PastelStatCard
                    tone="iceBlue"
                    value={`${summary.izin} Hari`}
                    label="Izin Keperluan"
                    trendText="Dispensasi"
                    icon="calendar-outline"
                    style={styles.statCardItemMobile}
                  />
                </ScrollView>
              </View>
            )}

            {/* 2. DarkActionCard untuk Membuka Sheet Form Izin */}
            <DarkActionCard
              eyebrow="Layanan Mandiri"
              title="Ajukan Izin atau Sakit"
              description="Kirimkan surat permohonan izin atau surat keterangan sakit anak ke wali kelas secara praktis dan terpantau."
              ctaLabel="Buka Formulir Izin"
              compact
              onPress={handleOpenModal}
            />

            {/* 3. Daftar Pengajuan Izin memakai DarkIconRow dipisah Separator */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Status Pengajuan Izin</Text>
                <Text style={styles.sectionSubheading}>
                  {leaveRequests.length} permohonan diajukan
                </Text>
              </View>

              <View style={styles.listCard}>
                {leaveRequests.length === 0 ? (
                  <View style={styles.emptyInlineRow}>
                    <Text style={styles.emptyInlineText}>
                      Belum ada riwayat permohonan izin atau sakit yang diajukan.
                    </Text>
                  </View>
                ) : (
                  leaveRequests.map((item, idx) => {
                    const isSakit = item.leave_type === LeaveType.SAKIT;
                    const dateRange =
                      item.start_date === item.end_date
                        ? formatTanggalId(item.start_date, {
                            includeDay: true,
                            shortMonth: true,
                          })
                        : `${formatTanggalId(item.start_date, {
                            shortMonth: true,
                          })} sampai ${formatTanggalId(item.end_date, {
                            includeDay: true,
                            shortMonth: true,
                          })}`;

                    const statusLabel =
                      item.status === "APPROVED"
                        ? "Disetujui"
                        : item.status === "REJECTED"
                        ? "Ditolak"
                        : "Menunggu";

                    const statusTone =
                      item.status === "APPROVED"
                        ? "success"
                        : item.status === "REJECTED"
                        ? "danger"
                        : "warning";

                    return (
                      <React.Fragment key={item.id}>
                        {idx > 0 && <Separator />}
                        <DarkIconRow
                          icon={isSakit ? "medkit-outline" : "calendar-outline"}
                          title={isSakit ? "Izin Sakit" : "Izin Keperluan"}
                          subtitle={`${dateRange} • ${item.reason}${
                            item.review_notes
                              ? ` (Catatan: ${item.review_notes})`
                              : ""
                          }`}
                          rightPrimary={statusLabel}
                          rightSecondary={item.status}
                          rightSecondaryTone={statusTone}
                          accessibilityLabel={`Pengajuan ${
                            isSakit ? "sakit" : "izin"
                          }: ${statusLabel}, tanggal ${dateRange}`}
                        />
                      </React.Fragment>
                    );
                  })
                )}
              </View>
            </View>

            {/* 4. Riwayat Presensi Harian memakai DarkIconRow dipisah Separator */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Riwayat Presensi Harian</Text>
                <Text style={styles.sectionSubheading}>
                  Catatan absensi harian kelas
                </Text>
              </View>

              <View style={styles.listCard}>
                {attendanceList.length === 0 ? (
                  <View style={styles.emptyInlineRow}>
                    <Text style={styles.emptyInlineText}>
                      Catatan absensi harian peserta didik belum terekam bulan ini.
                    </Text>
                  </View>
                ) : (
                  attendanceList.map((att, idx) => {
                    const formattedDate = formatTanggalId(att.date, {
                      includeDay: true,
                    });

                    const iconName =
                      att.status === AttendanceStatus.HADIR
                        ? "checkmark-circle-outline"
                        : att.status === AttendanceStatus.SAKIT
                        ? "medkit-outline"
                        : att.status === AttendanceStatus.IZIN
                        ? "calendar-outline"
                        : "alert-circle-outline";

                    const tone =
                      att.status === AttendanceStatus.HADIR
                        ? "success"
                        : att.status === AttendanceStatus.SAKIT
                        ? "warning"
                        : att.status === AttendanceStatus.IZIN
                        ? "info"
                        : "danger";

                    return (
                      <React.Fragment key={att.id}>
                        {idx > 0 && <Separator />}
                        <DarkIconRow
                          icon={iconName}
                          title={formattedDate}
                          subtitle={`Masuk: ${
                            att.check_in_time ? `${att.check_in_time} WIB` : "-"
                          } • Pulang: ${
                            att.check_out_time ? `${att.check_out_time} WIB` : "-"
                          } • ${att.notes || "Sesuai jadwal"}`}
                          rightPrimary={att.status}
                          rightSecondary={
                            att.status === AttendanceStatus.HADIR
                              ? "Tepat Waktu"
                              : "Tercatat"
                          }
                          rightSecondaryTone={tone}
                          accessibilityLabel={`Presensi tanggal ${formattedDate}: ${att.status}`}
                        />
                      </React.Fragment>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Sheet Formulir Pengajuan Izin */}
      <Sheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Formulir Izin atau Sakit"
      >
        <View style={styles.modalBody}>
          <View style={styles.studentTargetBox}>
            <Text style={styles.studentTargetLabel}>Nama Peserta Didik:</Text>
            <Text style={styles.studentTargetName}>
              {activeStudent?.full_name} ({activeStudent?.class_name || "Kelas"})
            </Text>
          </View>

          {/* Opsi Jenis Izin menggunakan Komponen Tabs */}
          <View style={styles.formGroup}>
            <Label required>Jenis Pengajuan</Label>
            <Tabs
              value={leaveType}
              onValueChange={(val) => setLeaveType(val as "SAKIT" | "IZIN")}
              items={[
                { value: LeaveType.SAKIT, label: "Sakit" },
                { value: LeaveType.IZIN, label: "Izin Keperluan" },
              ]}
            />
          </View>

          {/* Tanggal Mulai */}
          <View style={styles.formGroup}>
            <Label required>Tanggal Mulai</Label>
            <Input
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              error={formErrors.startDate}
              helperText="Format tanggal: YYYY-MM-DD (contoh: 2026-11-22)"
              accessibilityLabel="Input tanggal mulai izin"
            />
          </View>

          {/* Tanggal Selesai */}
          <View style={styles.formGroup}>
            <Label required>Tanggal Selesai</Label>
            <Input
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              error={formErrors.endDate}
              helperText="Bisa disamakan dengan tanggal mulai jika izin 1 hari"
              accessibilityLabel="Input tanggal selesai izin"
            />
          </View>

          {/* Alasan */}
          <View style={styles.formGroup}>
            <Label required>Alasan Lengkap</Label>
            <Input
              value={reason}
              onChangeText={setReason}
              placeholder="Jelaskan alasan izin atau gejala sakit anak..."
              multiline
              numberOfLines={3}
              error={formErrors.reason}
              helperText="Minimal 3 karakter agar wali kelas memahami kondisi anak."
              accessibilityLabel="Input alasan izin lengkap"
            />
          </View>

          {/* Lampiran */}
          <View style={styles.formGroup}>
            <Label>Keterangan Surat atau Tautan Dokumen (Opsional)</Label>
            <Input
              value={attachmentUrl}
              onChangeText={setAttachmentUrl}
              placeholder="Tautan foto surat dokter atau keterangan..."
              helperText="Opsional. Cantumkan keterangan surat dokter jika sakit lebih dari 2 hari."
              accessibilityLabel="Input tautan dokumen atau surat dokter"
            />
          </View>

          {/* General Error Banner */}
          {Boolean(formErrors.general) && (
            <Alert
              variant="destructive"
              description={formErrors.general}
              style={styles.modalAlert}
            />
          )}

          {/* Submit Button */}
          <View style={styles.modalSubmitWrapper}>
            <Button
              title="Kirim Pengajuan Izin"
              onPress={handleSubmitLeave}
              loading={submitting}
              variant="default"
              size="lg"
              style={styles.submitBtn}
              accessibilityLabel="Kirimkan permohonan izin ke wali kelas"
            />
          </View>
        </View>
      </Sheet>
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
  successBannerContainer: {
    backgroundColor: shadcn.status.success.bg,
    borderWidth: 1,
    borderColor: shadcn.status.success.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  successBannerText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    fontFamily: typography.family.medium,
    color: shadcn.status.success.text,
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
  sectionSubheading: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    marginTop: 2,
  },
  statCardsRowTablet: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  statCardItemTablet: {
    flex: 1,
    height: 168,
    alignSelf: "stretch",
  },
  statCardsMobileSection: {
    width: "100%",
  },
  statCardsMobileStrip: {
    marginHorizontal: -layout.mobilePaddingX,
    flexGrow: 0,
  },
  statCardsScrollMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: layout.mobilePaddingX,
    paddingVertical: spacing.xs,
  },
  statCardItemMobile: {
    width: 176,
    height: 164,
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  listCard: {
    width: "100%",
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
  modalBody: {
    paddingVertical: spacing.md,
  },
  studentTargetBox: {
    backgroundColor: bento.iceBlue,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  studentTargetLabel: {
    fontSize: 11,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
  },
  studentTargetName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    fontFamily: typography.family.bold,
    color: shadcn.foreground,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  modalAlert: {
    marginBottom: spacing.md,
  },
  modalSubmitWrapper: {
    marginTop: spacing.md,
  },
  submitBtn: {
    width: "100%",
  },
});
