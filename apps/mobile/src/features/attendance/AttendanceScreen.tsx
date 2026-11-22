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
  LeaveType,
  AttendanceStatus,
  type Attendance,
  type LeaveRequest,
  type StudentDashboardResponse,
} from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Button,
  Chip,
  Input,
  SectionHeader,
  ChildSwitcher,
  StateView,
  ModalSheet,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

export default function AttendanceScreen() {
  const { students, activeStudent, activeStudentId, setActiveStudentId } = useAuth();

  const [dashboardData, setDashboardData] = useState<StudentDashboardResponse | null>(null);
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
          err?.message || "Gagal memuat data presensi. Periksa koneksi internet Anda."
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

  // Handle open modal
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

  // Validasi form & submit
  const handleSubmitLeave = async () => {
    const errors: { [key: string]: string } = {};

    // Validasi format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate.trim() || !dateRegex.test(startDate.trim())) {
      errors.startDate = "Format tanggal mulai harus YYYY-MM-DD (cth: 2026-11-22)";
    }
    if (!endDate.trim() || !dateRegex.test(endDate.trim())) {
      errors.endDate = "Format tanggal selesai harus YYYY-MM-DD (cth: 2026-11-22)";
    }
    if (startDate.trim() && endDate.trim() && startDate.trim() > endDate.trim()) {
      errors.endDate = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai";
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
        `Pengajuan ${leaveType === "SAKIT" ? "sakit" : "izin"} berhasil dikirim ke wali kelas.`
      );
      // Auto clear banner setelah 5 detik
      setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);

      // Refresh list
      await fetchData(true);
    } catch (err: any) {
      setFormErrors({
        general:
          err?.message || "Gagal mengirim formulir izin. Silakan coba beberapa saat lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAttendanceBadge = (
    status: AttendanceStatus
  ): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case AttendanceStatus.HADIR:
        return { label: "Hadir", variant: "success" };
      case AttendanceStatus.SAKIT:
        return { label: "Sakit", variant: "warning" };
      case AttendanceStatus.IZIN:
        return { label: "Izin", variant: "info" };
      case AttendanceStatus.ALPA:
        return { label: "Alpa", variant: "danger" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  const getLeaveStatusBadge = (
    status: string
  ): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case "APPROVED":
        return { label: "Disetujui", variant: "success" };
      case "REJECTED":
        return { label: "Ditolak", variant: "danger" };
      case "PENDING":
      default:
        return { label: "Menunggu Verifikasi", variant: "warning" };
    }
  };

  // Ringkasan kehadiran (dari dashboard API atau hitung langsung dari data list)
  const summary = dashboardData?.attendance_summary || {
    hadir: attendanceList.filter((a) => a.status === AttendanceStatus.HADIR).length,
    sakit: attendanceList.filter((a) => a.status === AttendanceStatus.SAKIT).length,
    izin: attendanceList.filter((a) => a.status === AttendanceStatus.IZIN).length,
    alpa: attendanceList.filter((a) => a.status === AttendanceStatus.ALPA).length,
    percentage:
      attendanceList.length > 0
        ? Math.round(
            (attendanceList.filter((a) => a.status === AttendanceStatus.HADIR).length /
              attendanceList.length) *
              100
          )
        : 100,
  };

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

      {/* Success Notification Banner */}
      {Boolean(successBanner) && (
        <View style={styles.successBannerContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={styles.successBannerText}>{successBanner}</Text>
          <TouchableOpacity
            onPress={() => setSuccessBanner(null)}
            style={styles.successBannerClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup pemberitahuan"
          >
            <Ionicons name="close" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Body */}
      {loading ? (
        <StateView
          type="loading"
          message="Memuat data presensi dan riwayat izin..."
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
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={colors.primary}
            />
          }
        >
          {/* 1. Kartu Ringkasan Statistik Kehadiran */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeaderRow}>
              <View>
                <Text style={styles.summaryCardTitle}>Statistik Kehadiran</Text>
                <Text style={styles.summaryCardSubtitle}>Semester Berjalan</Text>
              </View>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageValue}>{summary.percentage}%</Text>
                <Text style={styles.percentageLabel}>Tingkat Hadir</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.badge.success.text }]}>
                  {summary.hadir}
                </Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.badge.warning.text }]}>
                  {summary.sakit}
                </Text>
                <Text style={styles.statLabel}>Sakit</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.badge.info.text }]}>
                  {summary.izin}
                </Text>
                <Text style={styles.statLabel}>Izin</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.badge.danger.text }]}>
                  {summary.alpa}
                </Text>
                <Text style={styles.statLabel}>Alpa</Text>
              </View>
            </View>
          </Card>

          {/* 2. Tombol Utama Ajukan Izin / Sakit */}
          <View style={styles.actionButtonContainer}>
            <Button
              title="Ajukan Izin / Sakit"
              onPress={handleOpenModal}
              variant="primary"
              leftIcon={<Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />}
              accessibilityLabel="Buka formulir untuk mengajukan izin atau sakit siswa"
            />
          </View>

          {/* 3. Daftar Status Pengajuan Izin */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Status Pengajuan Izin"
              subtitle={`${leaveRequests.length} permohonan diajukan`}
            />

            {leaveRequests.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Belum Ada Pengajuan Izin</Text>
                <Text style={styles.emptyMessage}>
                  Permohonan izin atau sakit yang Anda ajukan akan tercatat di sini beserta status persetujuan dari wali kelas.
                </Text>
              </Card>
            ) : (
              leaveRequests.map((item) => {
                const badgeInfo = getLeaveStatusBadge(item.status);
                const isSakit = item.leave_type === LeaveType.SAKIT;
                const dateRange =
                  item.start_date === item.end_date
                    ? formatTanggalId(item.start_date, { includeDay: true, shortMonth: true })
                    : `${formatTanggalId(item.start_date, { shortMonth: true })} s/d ${formatTanggalId(item.end_date, { includeDay: true, shortMonth: true })}`;

                return (
                  <Card key={item.id} style={styles.leaveCard}>
                    <View style={styles.leaveHeaderRow}>
                      <View style={styles.leaveTypeTag}>
                        <Ionicons
                          name={isSakit ? "medkit-outline" : "calendar-outline"}
                          size={16}
                          color={isSakit ? colors.badge.warning.text : colors.badge.info.text}
                        />
                        <Text
                          style={[
                            styles.leaveTypeText,
                            {
                              color: isSakit
                                ? colors.badge.warning.text
                                : colors.badge.info.text,
                            },
                          ]}
                        >
                          {isSakit ? "Izin Sakit" : "Izin Keperluan"}
                        </Text>
                      </View>
                      <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
                    </View>

                    <Text style={styles.leaveDateRange}>{dateRange}</Text>

                    <Text style={styles.leaveReasonLabel}>Alasan:</Text>
                    <Text style={styles.leaveReasonText}>{item.reason}</Text>

                    {Boolean(item.attachment_url) && (
                      <View style={styles.attachmentRow}>
                        <Ionicons name="attach-outline" size={16} color={colors.primary} />
                        <Text style={styles.attachmentText} numberOfLines={1}>
                          Lampiran: {item.attachment_url}
                        </Text>
                      </View>
                    )}

                    {Boolean(item.review_notes) && (
                      <View style={styles.reviewNotesBox}>
                        <View style={styles.reviewNotesHeader}>
                          <Ionicons
                            name="chatbox-ellipses-outline"
                            size={16}
                            color={colors.textPrimary}
                          />
                          <Text style={styles.reviewNotesTitle}>Catatan Wali Kelas:</Text>
                        </View>
                        <Text style={styles.reviewNotesBody}>{item.review_notes}</Text>
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </View>

          {/* 4. Daftar Riwayat Presensi Harian */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Riwayat Presensi Harian"
              subtitle="Catatan kehadiran dari sistem absensi kelas"
            />

            {attendanceList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Belum Ada Data Presensi</Text>
                <Text style={styles.emptyMessage}>
                  Catatan absensi harian peserta didik untuk bulan ini belum terekam.
                </Text>
              </Card>
            ) : (
              attendanceList.map((att) => {
                const badgeInfo = getAttendanceBadge(att.status);
                const formattedDate = formatTanggalId(att.date, { includeDay: true });

                return (
                  <Card key={att.id} style={styles.historyCard}>
                    <View style={styles.historyHeaderRow}>
                      <Text style={styles.historyDateText}>{formattedDate}</Text>
                      <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
                    </View>

                    <View style={styles.historyDivider} />

                    <View style={styles.historyTimeRow}>
                      <View style={styles.historyTimeCol}>
                        <Text style={styles.historyTimeLabel}>Jam Masuk</Text>
                        <Text style={styles.historyTimeValue}>
                          {att.check_in_time ? `${att.check_in_time} WIB` : "—"}
                        </Text>
                      </View>

                      <View style={styles.historyTimeCol}>
                        <Text style={styles.historyTimeLabel}>Jam Pulang</Text>
                        <Text style={styles.historyTimeValue}>
                          {att.check_out_time ? `${att.check_out_time} WIB` : "—"}
                        </Text>
                      </View>

                      <View style={styles.historyTimeCol}>
                        <Text style={styles.historyTimeLabel}>Keterangan</Text>
                        <Text style={styles.historyNotesValue} numberOfLines={1}>
                          {att.notes || "Sesuai jadwal"}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal Form Pengajuan Izin / Sakit */}
      <ModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Formulir Izin / Sakit"
      >
        <View style={styles.modalBody}>
          <Text style={styles.formSectionLabel}>Nama Peserta Didik:</Text>
          <Text style={styles.studentTargetName}>
            {activeStudent?.full_name} ({activeStudent?.class_name || "Kelas"})
          </Text>

          {/* Jenis Izin (Chips) */}
          <Text style={styles.formLabel}>Pilih Jenis Pengajuan:</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Sakit"
              selected={leaveType === LeaveType.SAKIT}
              onPress={() => setLeaveType(LeaveType.SAKIT)}
              style={styles.formChip}
              accessibilityLabel="Pilih jenis izin sakit"
            />
            <Chip
              label="Izin Keperluan"
              selected={leaveType === LeaveType.IZIN}
              onPress={() => setLeaveType(LeaveType.IZIN)}
              style={styles.formChip}
              accessibilityLabel="Pilih jenis izin keperluan keluarga"
            />
          </View>

          {/* Tanggal Mulai & Selesai */}
          <Input
            label="Tanggal Mulai"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            error={formErrors.startDate}
            helperText="Format tanggal: YYYY-MM-DD (contoh: 2026-11-22)"
          />

          <Input
            label="Tanggal Selesai"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            error={formErrors.endDate}
            helperText="Bisa disamakan dengan tanggal mulai jika izin 1 hari"
          />

          {/* Alasan */}
          <Input
            label="Alasan Lengkap"
            value={reason}
            onChangeText={setReason}
            placeholder="Jelaskan alasan izin atau gejala sakit anak..."
            multiline
            numberOfLines={3}
            error={formErrors.reason}
            helperText="Minimal 3 karakter agar wali kelas memahami kondisi anak."
          />

          {/* Lampiran / Surat Dokter (Opsional) */}
          <Input
            label="Keterangan Surat / Tautan Dokumen (Opsional)"
            value={attachmentUrl}
            onChangeText={setAttachmentUrl}
            placeholder="Tautan foto surat dokter atau nomor rujukan..."
            helperText="Opsional. Cantumkan keterangan surat dokter jika sakit > 2 hari."
          />

          {/* General Error Banner */}
          {Boolean(formErrors.general) && (
            <View style={styles.formGeneralError}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.badge.danger.text}
              />
              <Text style={styles.formGeneralErrorText}>{formErrors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.modalSubmitWrapper}>
            <Button
              title="Kirim Pengajuan Izin"
              onPress={handleSubmitLeave}
              loading={submitting}
              variant="primary"
              size="lg"
              accessibilityLabel="Kirimkan permohonan izin ke wali kelas"
            />
          </View>
        </View>
      </ModalSheet>
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
  successBannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.success.bg,
    borderColor: colors.badge.success.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  successBannerText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.badge.success.text,
    marginLeft: spacing.sm,
  },
  successBannerClose: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Summary Card
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  summaryCardSubtitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  percentageBadge: {
    alignItems: "flex-end",
  },
  percentageValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.heavy,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  percentageLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtonContainer: {
    marginBottom: spacing.lg,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
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
  // Leave Cards
  leaveCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  leaveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  leaveTypeTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  leaveTypeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    marginLeft: spacing.xs,
  },
  leaveDateRange: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  leaveReasonLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  leaveReasonText: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    marginTop: 1,
    lineHeight: typography.lineHeight.sm,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentText: {
    fontSize: typography.size.xs,
    color: colors.primary,
    marginLeft: 4,
    flex: 1,
  },
  reviewNotesBox: {
    marginTop: spacing.sm,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  reviewNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  reviewNotesTitle: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  reviewNotesBody: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.xs,
  },
  // Attendance History Cards
  historyCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyDateText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  historyDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  historyTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyTimeCol: {
    flex: 1,
  },
  historyTimeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyTimeValue: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  historyNotesValue: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Modal Sheet Styles
  modalBody: {
    paddingBottom: spacing.xxl,
  },
  formSectionLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  studentTargetName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  formLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formChip: {
    flex: 1,
  },
  formGeneralError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    borderColor: colors.badge.danger.border,
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  formGeneralErrorText: {
    fontSize: typography.size.xs,
    color: colors.badge.danger.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  modalSubmitWrapper: {
    marginTop: spacing.md,
  },
});
