import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
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
import * as api from "../../lib/api";
import { colors, spacing, radius, typography, touchTarget } from "../../theme/tokens";

type LeaveFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export function StaffLeaveScreen() {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>("PENDING");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal Peninjauan
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const fetchLeaveRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await api.getLeaveRequests();
      setItems(res.items || []);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat pengajuan izin siswa. Silakan coba kembali."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleOpenReview = (request: LeaveRequest, action: "APPROVED" | "REJECTED") => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(
      action === "APPROVED"
        ? "Pengajuan izin telah disetujui pihak sekolah."
        : "Mohon maaf, pengajuan izin belum dapat disetujui."
    );
  };

  const handleCloseReview = () => {
    setSelectedRequest(null);
    setReviewNotes("");
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    setSubmittingReview(true);
    try {
      await api.reviewLeaveRequest(selectedRequest.id, {
        status: reviewAction,
        review_notes: reviewNotes.trim() || undefined,
      });

      Alert.alert(
        "Berhasil",
        `Pengajuan izin untuk ${selectedRequest.student_name || "siswa"} telah ${
          reviewAction === "APPROVED" ? "disetujui" : "ditolak"
        }.`
      );
      handleCloseReview();
      await fetchLeaveRequests(true);
    } catch (err: any) {
      Alert.alert(
        "Kendala",
        err?.message || "Gagal memproses peninjauan izin. Silakan coba lagi."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered List
  const filteredItems = items.filter((item) => {
    if (filter === "ALL") return true;
    return item.status === filter;
  });

  // Hitung jumlah per status
  const pendingCount = items.filter((i) => i.status === LeaveStatus.PENDING).length;
  const approvedCount = items.filter((i) => i.status === LeaveStatus.APPROVED).length;
  const rejectedCount = items.filter((i) => i.status === LeaveStatus.REJECTED).length;

  return (
    <Screen
      scroll={false}
      headerShown={true}
      title="Pengajuan Izin"
      subtitle="Tinjau dan proses permohonan izin sakit & dispensasi"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLeaveRequests(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Filter Chip Status */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            label="Menunggu"
            selected={filter === "PENDING"}
            onPress={() => setFilter("PENDING")}
            count={pendingCount}
            accessibilityLabel={`Filter pengajuan izin menunggu, ${pendingCount} berkas`}
          />
          <Chip
            label="Disetujui"
            selected={filter === "APPROVED"}
            onPress={() => setFilter("APPROVED")}
            count={approvedCount}
            accessibilityLabel={`Filter pengajuan izin disetujui, ${approvedCount} berkas`}
          />
          <Chip
            label="Ditolak"
            selected={filter === "REJECTED"}
            onPress={() => setFilter("REJECTED")}
            count={rejectedCount}
            accessibilityLabel={`Filter pengajuan izin ditolak, ${rejectedCount} berkas`}
          />
          <Chip
            label="Semua"
            selected={filter === "ALL"}
            onPress={() => setFilter("ALL")}
            count={items.length}
            accessibilityLabel={`Filter semua pengajuan izin, total ${items.length} berkas`}
          />
        </ScrollView>

        {/* State Loading / Error / Empty */}
        {loading && !refreshing ? (
          <StateView type="loading" message="Memuat daftar pengajuan izin..." />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Gagal Memuat Izin"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => fetchLeaveRequests()}
          />
        ) : filteredItems.length === 0 ? (
          <StateView
            type="empty"
            title="Tidak Ada Pengajuan"
            message={`Tidak ada pengajuan izin dengan status ${
              filter === "PENDING"
                ? "Menunggu"
                : filter === "APPROVED"
                ? "Disetujui"
                : filter === "REJECTED"
                ? "Ditolak"
                : "Semua"
            }.`}
          />
        ) : (
          <View style={styles.requestsList}>
            {filteredItems.map((request) => {
              const isPending = request.status === LeaveStatus.PENDING;
              const isSakit = request.leave_type === LeaveType.SAKIT;
              const tglMulai = formatTanggalId(request.start_date);
              const tglSelesai = formatTanggalId(request.end_date);
              const periodeText =
                request.start_date === request.end_date
                  ? tglMulai
                  : `${tglMulai} s.d. ${tglSelesai}`;

              return (
                <Card key={request.id} style={styles.requestCard}>
                  {/* Header Kartu */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.headerTitleCol}>
                      <Text style={styles.studentName}>
                        {request.student_name || "Peserta Didik"}
                      </Text>
                      <Text style={styles.classInfo}>
                        {request.class_name ? `Kelas ${request.class_name}` : "Siswa Sekolah"}
                      </Text>
                    </View>
                    <View style={styles.badgeCol}>
                      <Badge
                        label={isSakit ? "Sakit" : "Izin"}
                        variant={isSakit ? "warning" : "info"}
                      />
                    </View>
                  </View>

                  {/* Info Rentang Waktu & Alasan */}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>Periode: {periodeText}</Text>
                  </View>

                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Alasan Pengajuan:</Text>
                    <Text style={styles.reasonText}>{request.reason}</Text>
                  </View>

                  <View style={styles.guardianRow}>
                    <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.guardianText}>
                      Diajukan oleh: {request.guardian_name || "Wali Murid"}
                    </Text>
                  </View>

                  {/* Catatan Peninjauan Jika Sudah Diproses */}
                  {!isPending && (
                    <View
                      style={[
                        styles.reviewNotesBox,
                        request.status === LeaveStatus.APPROVED
                          ? styles.reviewNotesBoxApproved
                          : styles.reviewNotesBoxRejected,
                      ]}
                    >
                      <View style={styles.reviewStatusRow}>
                        <Ionicons
                          name={
                            request.status === LeaveStatus.APPROVED
                              ? "checkmark-circle"
                              : "close-circle"
                          }
                          size={16}
                          color={
                            request.status === LeaveStatus.APPROVED
                              ? colors.badge.success.text
                              : colors.badge.danger.text
                          }
                        />
                        <Text
                          style={[
                            styles.reviewStatusTitle,
                            {
                              color:
                                request.status === LeaveStatus.APPROVED
                                  ? colors.badge.success.text
                                  : colors.badge.danger.text,
                            },
                          ]}
                        >
                          Status: {request.status === LeaveStatus.APPROVED ? "Disetujui" : "Ditolak"}
                        </Text>
                      </View>
                      {Boolean(request.review_notes) && (
                        <Text style={styles.reviewNotesText}>
                          "{request.review_notes}"
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Tombol Aksi Untuk Status PENDING (Min 44pt) */}
                  {isPending && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleOpenReview(request, "REJECTED")}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Tolak pengajuan izin ${request.student_name}`}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.badge.danger.text} />
                        <Text style={styles.rejectButtonText}>Tolak</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleOpenReview(request, "APPROVED")}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Setujui pengajuan izin ${request.student_name}`}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
                        <Text style={styles.approveButtonText}>Setujui</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Modal Konfirmasi Peninjauan */}
        <ModalSheet
          visible={Boolean(selectedRequest)}
          onClose={handleCloseReview}
          title={reviewAction === "APPROVED" ? "Setujui Pengajuan Izin" : "Tolak Pengajuan Izin"}
        >
          {selectedRequest && (
            <View style={styles.modalContent}>
              <View style={styles.modalSummaryBox}>
                <Text style={styles.modalStudentName}>
                  {selectedRequest.student_name}
                </Text>
                <Text style={styles.modalClassText}>
                  {selectedRequest.class_name ? `Kelas ${selectedRequest.class_name}` : "Siswa"} •{" "}
                  {selectedRequest.leave_type === LeaveType.SAKIT ? "Sakit" : "Izin"}
                </Text>
                <Text style={styles.modalReasonText}>
                  "{selectedRequest.reason}"
                </Text>
              </View>

              <Input
                label="Catatan Peninjauan (Dapat dibaca oleh wali murid)"
                value={reviewNotes}
                onChangeText={setReviewNotes}
                placeholder="Tuliskan catatan atau instruksi bagi orang tua..."
                multiline
                numberOfLines={3}
                accessibilityLabel="Catatan peninjauan izin"
              />

              <View style={styles.modalButtonRow}>
                <Button
                  title={
                    submittingReview
                      ? "Memproses..."
                      : reviewAction === "APPROVED"
                      ? "Konfirmasi Setujui"
                      : "Konfirmasi Tolak"
                  }
                  onPress={handleSubmitReview}
                  variant={reviewAction === "APPROVED" ? "primary" : "danger"}
                  loading={submittingReview}
                  accessibilityLabel="Kirim hasil peninjauan izin"
                  style={styles.modalSubmitButton}
                />
              </View>
            </View>
          )}
        </ModalSheet>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  filterRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  requestsList: {
    marginBottom: spacing.md,
  },
  requestCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  classInfo: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: "flex-end",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  reasonBox: {
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.sm,
  },
  guardianRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  guardianText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  reviewNotesBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  reviewNotesBoxApproved: {
    backgroundColor: colors.badge.success.bg,
    borderColor: colors.badge.success.border,
  },
  reviewNotesBoxRejected: {
    backgroundColor: colors.badge.danger.bg,
    borderColor: colors.badge.danger.border,
  },
  reviewStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  reviewStatusTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    marginLeft: spacing.xs,
  },
  reviewNotesText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.badge.danger.bg,
    borderWidth: 1,
    borderColor: colors.badge.danger.border,
    marginRight: spacing.sm,
  },
  rejectButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.badge.danger.text,
    marginLeft: spacing.xs,
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  approveButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textInverse,
    marginLeft: spacing.xs,
  },
  modalContent: {
    paddingVertical: spacing.xs,
  },
  modalSummaryBox: {
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  modalStudentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  modalClassText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalReasonText: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  modalButtonRow: {
    marginTop: spacing.md,
  },
  modalSubmitButton: {
    width: "100%",
  },
});
