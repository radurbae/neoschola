import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
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
  Label,
  StateView,
  Sheet,
  Avatar,
  Separator,
} from "../../components/ui";
import * as api from "../../lib/api";
import { shadcn, spacing, radius, typography, touchTarget } from "../../theme/tokens";

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

      NativeAlert.alert(
        "Berhasil",
        `Pengajuan izin untuk ${selectedRequest.student_name || "siswa"} telah ${
          reviewAction === "APPROVED" ? "disetujui" : "ditolak"
        }.`
      );
      handleCloseReview();
      await fetchLeaveRequests(true);
    } catch (err: any) {
      NativeAlert.alert(
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
      subtitle="Tinjau dan proses permohonan izin sakit dan dispensasi"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchLeaveRequests(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
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
                  {/* Header Kartu: Avatar + Info Siswa + Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <Avatar
                      name={request.student_name || "Siswa"}
                      size="md"
                      style={styles.studentAvatar}
                    />
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

                  <Separator style={styles.cardSeparator} />

                  {/* Info Rentang Waktu & Alasan */}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={shadcn.mutedForeground} />
                    <Text style={styles.infoText}>Periode: {periodeText}</Text>
                  </View>

                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Alasan Pengajuan:</Text>
                    <Text style={styles.reasonText}>{request.reason}</Text>
                  </View>

                  <View style={styles.guardianRow}>
                    <Ionicons name="person-outline" size={14} color={shadcn.mutedForeground} />
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
                              ? shadcn.status.success.text
                              : shadcn.status.danger.text
                          }
                        />
                        <Text
                          style={[
                            styles.reviewStatusTitle,
                            {
                              color:
                                request.status === LeaveStatus.APPROVED
                                  ? shadcn.status.success.text
                                  : shadcn.status.danger.text,
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
                    <>
                      <Separator style={styles.actionsSeparator} />
                      <View style={styles.actionsRow}>
                        <Button
                          title="Tolak"
                          variant="outline"
                          size="default"
                          onPress={() => handleOpenReview(request, "REJECTED")}
                          leftIcon={
                            <Ionicons
                              name="close-circle-outline"
                              size={18}
                              color={shadcn.foreground}
                            />
                          }
                          accessibilityLabel={`Tolak pengajuan izin ${request.student_name}`}
                          style={styles.actionBtnOutline}
                        />
                        <Button
                          title="Setujui"
                          variant="default"
                          size="default"
                          onPress={() => handleOpenReview(request, "APPROVED")}
                          leftIcon={
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={18}
                              color={shadcn.primaryForeground}
                            />
                          }
                          accessibilityLabel={`Setujui pengajuan izin ${request.student_name}`}
                          style={styles.actionBtnDefault}
                        />
                      </View>
                    </>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Modal Konfirmasi Peninjauan menggunakan Sheet */}
        <Sheet
          visible={Boolean(selectedRequest)}
          onClose={handleCloseReview}
          title={reviewAction === "APPROVED" ? "Setujui Pengajuan Izin" : "Tolak Pengajuan Izin"}
        >
          {selectedRequest && (
            <View style={styles.sheetContent}>
              <View style={styles.sheetSummaryBox}>
                <View style={styles.sheetSummaryHeader}>
                  <Avatar name={selectedRequest.student_name || "Siswa"} size="sm" />
                  <View style={styles.sheetStudentInfo}>
                    <Text style={styles.sheetStudentName}>
                      {selectedRequest.student_name}
                    </Text>
                    <Text style={styles.sheetClassText}>
                      {selectedRequest.class_name ? `Kelas ${selectedRequest.class_name}` : "Siswa"} •{" "}
                      {selectedRequest.leave_type === LeaveType.SAKIT ? "Sakit" : "Izin"}
                    </Text>
                  </View>
                </View>
                <Separator style={styles.sheetSummarySeparator} />
                <Text style={styles.sheetReasonText}>
                  "{selectedRequest.reason}"
                </Text>
              </View>

              <Label required>Catatan Peninjauan</Label>
              <Input
                value={reviewNotes}
                onChangeText={setReviewNotes}
                placeholder="Tuliskan catatan atau instruksi bagi orang tua..."
                multiline
                numberOfLines={3}
                accessibilityLabel="Catatan peninjauan izin"
              />

              <View style={styles.sheetButtonRow}>
                <Button
                  title={
                    submittingReview
                      ? "Memproses..."
                      : reviewAction === "APPROVED"
                      ? "Konfirmasi Setujui"
                      : "Konfirmasi Tolak"
                  }
                  onPress={handleSubmitReview}
                  variant={reviewAction === "APPROVED" ? "default" : "destructive"}
                  loading={submittingReview}
                  accessibilityLabel="Kirim hasil peninjauan izin"
                  style={styles.sheetSubmitButton}
                />
              </View>
            </View>
          )}
        </Sheet>
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
    padding: spacing.md,
    backgroundColor: shadcn.card,
    borderColor: shadcn.border,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  studentAvatar: {
    marginRight: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  studentName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  classInfo: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: "flex-end",
  },
  cardSeparator: {
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    marginLeft: spacing.xs,
  },
  reasonBox: {
    backgroundColor: shadcn.secondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: typography.weight.medium,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: typography.size.sm,
    color: shadcn.foreground,
    lineHeight: typography.lineHeight.sm,
  },
  guardianRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  guardianText: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    marginLeft: spacing.xs,
  },
  reviewNotesBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  reviewNotesBoxApproved: {
    backgroundColor: shadcn.status.success.bg,
    borderColor: shadcn.status.success.border,
  },
  reviewNotesBoxRejected: {
    backgroundColor: shadcn.status.danger.bg,
    borderColor: shadcn.status.danger.border,
  },
  reviewStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  reviewStatusTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.xs,
  },
  reviewNotesText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontStyle: "italic",
    marginTop: 2,
  },
  actionsSeparator: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionBtnOutline: {
    marginRight: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  actionBtnDefault: {
    minHeight: touchTarget.minHeight,
  },
  sheetContent: {
    paddingVertical: spacing.xs,
  },
  sheetSummaryBox: {
    backgroundColor: shadcn.secondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    marginBottom: spacing.md,
  },
  sheetSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetStudentInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  sheetStudentName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  sheetClassText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  sheetSummarySeparator: {
    marginVertical: spacing.sm,
  },
  sheetReasonText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontStyle: "italic",
  },
  sheetButtonRow: {
    marginTop: spacing.md,
  },
  sheetSubmitButton: {
    width: "100%",
    minHeight: touchTarget.minHeight,
  },
});
