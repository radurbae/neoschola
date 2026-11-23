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
  Input,
  Label,
  Tabs,
  Alert,
  SectionHeader,
  ChildSwitcher,
  StateView,
  ModalSheet,
  Separator,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../../theme/tokens";

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
        return { label: "Alpa", variant: "destructive" };
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
        return { label: "Ditolak", variant: "destructive" };
      case "PENDING":
      default:
        return { label: "Menunggu Verifikasi", variant: "warning" };
    }
  };

  // Ringkasan kehadiran
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

      {/* Success Notification Banner */}
      {Boolean(successBanner) && (
        <View style={styles.successBannerContainer}>
          <Ionicons name="checkmark-circle-outline" size={18} color={shadcn.status.success.text} />
          <Text style={styles.successBannerText}>{successBanner}</Text>
          <TouchableOpacity
            onPress={() => setSuccessBanner(null)}
            style={styles.successBannerClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup pemberitahuan"
          >
            <Ionicons name="close" size={18} color={shadcn.status.success.text} />
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
              tintColor={shadcn.primary}
            />
          }
        >
          {/* 1. Kartu Ringkasan Statistik Kehadiran 4 Kolom + Separator */}
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

            <Separator style={styles.summarySeparator} />

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: shadcn.status.success.text }]}>
                  {summary.hadir}
                </Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: shadcn.status.warning.text }]}>
                  {summary.sakit}
                </Text>
                <Text style={styles.statLabel}>Sakit</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: shadcn.status.info.text }]}>
                  {summary.izin}
                </Text>
                <Text style={styles.statLabel}>Izin</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: shadcn.status.danger.text }]}>
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
              variant="default"
              leftIcon={<Ionicons name="add" size={18} color={shadcn.primaryForeground} />}
              style={styles.mainActionButton}
              accessibilityLabel="Buka formulir untuk mengajukan izin atau sakit siswa"
            />
          </View>

          {/* 3. Daftar Status Pengajuan Izin (1 Card + Separator) */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Status Pengajuan Izin"
              subtitle={`${leaveRequests.length} permohonan diajukan`}
            />

            <Card style={styles.listCard}>
              {leaveRequests.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Belum ada pengajuan izin atau sakit yang diajukan.
                  </Text>
                </View>
              ) : (
                leaveRequests.map((item, idx) => {
                  const badgeInfo = getLeaveStatusBadge(item.status);
                  const isSakit = item.leave_type === LeaveType.SAKIT;
                  const dateRange =
                    item.start_date === item.end_date
                      ? formatTanggalId(item.start_date, { includeDay: true, shortMonth: true })
                      : `${formatTanggalId(item.start_date, { shortMonth: true })} s/d ${formatTanggalId(item.end_date, { includeDay: true, shortMonth: true })}`;

                  return (
                    <React.Fragment key={item.id}>
                      {idx > 0 && <Separator />}
                      <View style={styles.leaveRow}>
                        <View style={styles.leaveHeaderRow}>
                          <View style={styles.leaveTypeLine}>
                            <Ionicons
                              name={isSakit ? "medkit-outline" : "calendar-outline"}
                              size={15}
                              color={shadcn.foreground}
                            />
                            <Text style={styles.leaveTypeText}>
                              {isSakit ? "Izin Sakit" : "Izin Keperluan"}
                            </Text>
                          </View>
                          <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
                        </View>

                        <Text style={styles.leaveDateRange}>{dateRange}</Text>

                        <Text style={styles.leaveReasonText}>
                          <Text style={styles.leaveReasonPrefix}>Alasan: </Text>
                          {item.reason}
                        </Text>

                        {Boolean(item.attachment_url) && (
                          <View style={styles.attachmentRow}>
                            <Ionicons name="attach-outline" size={14} color={shadcn.mutedForeground} />
                            <Text style={styles.attachmentText} numberOfLines={1}>
                              Lampiran: {item.attachment_url}
                            </Text>
                          </View>
                        )}

                        {Boolean(item.review_notes) && (
                          <View style={styles.reviewNotesBox}>
                            <Text style={styles.reviewNotesTitle}>Catatan Wali Kelas:</Text>
                            <Text style={styles.reviewNotesBody}>{item.review_notes}</Text>
                          </View>
                        )}
                      </View>
                    </React.Fragment>
                  );
                })
              )}
            </Card>
          </View>

          {/* 4. Daftar Riwayat Presensi Harian (1 Card + Separator) */}
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Riwayat Presensi Harian"
              subtitle="Catatan kehadiran dari sistem absensi kelas"
            />

            <Card style={styles.listCard}>
              {attendanceList.length === 0 ? (
                <View style={styles.emptyInlineRow}>
                  <Text style={styles.emptyInlineText}>
                    Catatan absensi harian peserta didik untuk bulan ini belum terekam.
                  </Text>
                </View>
              ) : (
                attendanceList.map((att, idx) => {
                  const badgeInfo = getAttendanceBadge(att.status);
                  const formattedDate = formatTanggalId(att.date, { includeDay: true });

                  return (
                    <React.Fragment key={att.id}>
                      {idx > 0 && <Separator />}
                      <View style={styles.historyRow}>
                        <View style={styles.historyHeaderRow}>
                          <Text style={styles.historyDateText}>{formattedDate}</Text>
                          <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
                        </View>

                        <View style={styles.historyTimeRow}>
                          <View style={styles.historyTimeCol}>
                            <Text style={styles.historyTimeLabel}>Jam Masuk</Text>
                            <Text style={styles.historyTimeValue}>
                              {att.check_in_time ? `${att.check_in_time} WIB` : "-"}
                            </Text>
                          </View>

                          <View style={styles.historyTimeCol}>
                            <Text style={styles.historyTimeLabel}>Jam Pulang</Text>
                            <Text style={styles.historyTimeValue}>
                              {att.check_out_time ? `${att.check_out_time} WIB` : "-"}
                            </Text>
                          </View>

                          <View style={styles.historyTimeCol}>
                            <Text style={styles.historyTimeLabel}>Keterangan</Text>
                            <Text style={styles.historyNotesValue} numberOfLines={1}>
                              {att.notes || "Sesuai jadwal"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })
              )}
            </Card>
          </View>
        </ScrollView>
      )}

      {/* Modal Sheet Formulir Pengajuan Izin / Sakit Bersih */}
      <ModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Formulir Izin / Sakit"
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
            <Label>Keterangan Surat / Tautan Dokumen (Opsional)</Label>
            <Input
              value={attachmentUrl}
              onChangeText={setAttachmentUrl}
              placeholder="Tautan foto surat dokter atau nomor rujukan..."
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
      </ModalSheet>
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
  successBannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: shadcn.status.success.bg,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.status.success.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  successBannerText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.status.success.text,
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  // Summary Card
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCardTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  summaryCardSubtitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 1,
  },
  percentageBadge: {
    alignItems: "flex-end",
  },
  percentageValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  percentageLabel: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  summarySeparator: {
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
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  actionButtonContainer: {
    marginBottom: spacing.lg,
  },
  mainActionButton: {
    width: "100%",
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
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
  // Leave Rows
  leaveRow: {
    padding: spacing.md,
  },
  leaveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  leaveTypeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  leaveTypeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  leaveDateRange: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    marginBottom: 4,
  },
  leaveReasonPrefix: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  leaveReasonText: {
    fontSize: typography.size.sm,
    color: shadcn.foreground,
    lineHeight: 18,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: 4,
  },
  attachmentText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    flex: 1,
  },
  reviewNotesBox: {
    marginTop: spacing.sm,
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.sm,
  },
  reviewNotesTitle: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: 2,
  },
  reviewNotesBody: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    lineHeight: 16,
  },
  // Attendance History Rows
  historyRow: {
    padding: spacing.md,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  historyDateText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  historyTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  historyTimeCol: {
    flex: 1,
  },
  historyTimeLabel: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  historyTimeValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  historyNotesValue: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  // Modal Sheet Body
  modalBody: {
    paddingVertical: spacing.xs,
  },
  studentTargetBox: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  studentTargetLabel: {
    fontSize: 11,
    color: shadcn.mutedForeground,
  },
  studentTargetName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
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
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  submitBtn: {
    width: "100%",
  },
});
