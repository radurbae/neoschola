import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  formatTanggalId,
} from "@neoschola/shared";
import { useRouter } from "expo-router";
import {
  TopUtilityBar,
  Card,
  Chip,
  Button,
  Input,
  Label,
  StateView,
  Sheet,
  Avatar,
  Separator,
  DarkIconRow,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  breakpoints,
  layout,
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";

type LeaveFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export function StaffLeaveScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const { user, unreadNotificationCount } = useAuth();

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>("PENDING");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const filteredItems = items.filter((item) => {
    if (filter === "ALL") return true;
    return item.status === filter;
  });

  const pendingCount = items.filter((i) => i.status === LeaveStatus.PENDING).length;
  const approvedCount = items.filter((i) => i.status === LeaveStatus.APPROVED).length;
  const rejectedCount = items.filter((i) => i.status === LeaveStatus.REJECTED).length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isTablet
              ? layout.tabletPaddingX
              : layout.mobilePaddingX,
            paddingTop: isTablet ? 8 : 4,
            gap: layout.sectionGap,
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
            onRefresh={() => fetchLeaveRequests(true)}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        <TopUtilityBar
          noHorizontalPadding
          title="Pengajuan Izin"
          subtitle="Tinjau dan proses permohonan izin sakit dan dispensasi"
          profileName={user?.name || "Staf"}
          unreadCount={unreadNotificationCount}
          onPressNotifications={() => router.push("/notifications")}
          onPressProfile={() => router.push("/(staff)/profil" as any)}
        />
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

              const statusLabel =
                request.status === LeaveStatus.APPROVED
                  ? "Disetujui"
                  : request.status === LeaveStatus.REJECTED
                  ? "Ditolak"
                  : "Menunggu";

              const statusTone =
                request.status === LeaveStatus.APPROVED
                  ? "success"
                  : request.status === LeaveStatus.REJECTED
                  ? "danger"
                  : "warning";

              return (
                <Card key={request.id} style={styles.requestCard}>
                  <DarkIconRow
                    icon={isSakit ? "medkit-outline" : "document-text-outline"}
                    title={request.student_name || "Peserta Didik"}
                    subtitle={
                      request.class_name
                        ? `Kelas ${request.class_name} • ${isSakit ? "Sakit" : "Izin"}`
                        : isSakit
                        ? "Izin Sakit"
                        : "Dispensasi Izin"
                    }
                    rightPrimary={isSakit ? "Sakit" : "Izin"}
                    rightSecondary={statusLabel}
                    rightSecondaryTone={statusTone}
                  />

                  <Separator style={styles.cardSeparator} />

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
                  accessibilityLabel="Konfirmasi proses izin"
                  style={styles.sheetConfirmBtn}
                />
              </View>
            </View>
          )}
        </Sheet>
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
    flexGrow: 1,
  },
  filterRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  requestsList: {
    gap: spacing.md,
  },
  requestCard: {
    borderRadius: radius.xl,
    padding: layout.cardPadding,
    backgroundColor: shadcn.card,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  cardSeparator: {
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    flexShrink: 1,
  },
  reasonBox: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  reasonLabel: {
    fontFamily: typography.family.semibold,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  reasonText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: shadcn.foreground,
    lineHeight: 18,
  },
  guardianRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  guardianText: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: shadcn.mutedForeground,
    flexShrink: 1,
  },
  reviewNotesBox: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
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
    gap: spacing.xs,
    marginBottom: 2,
  },
  reviewStatusTitle: {
    fontFamily: typography.family.semibold,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  reviewNotesText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: shadcn.foreground,
    fontStyle: "italic",
    marginTop: 2,
  },
  actionsSeparator: {
    marginVertical: spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtnOutline: {
    flex: 1,
    minHeight: touchTarget.minHeight,
  },
  actionBtnDefault: {
    flex: 1,
    minHeight: touchTarget.minHeight,
  },
  sheetContent: {
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  sheetSummaryBox: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sheetSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sheetStudentInfo: {
    flex: 1,
  },
  sheetStudentName: {
    fontFamily: typography.family.semibold,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  sheetClassText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
  },
  sheetSummarySeparator: {
    marginVertical: spacing.sm,
  },
  sheetReasonText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: shadcn.foreground,
    fontStyle: "italic",
    lineHeight: 18,
  },
  sheetButtonRow: {
    marginTop: spacing.sm,
  },
  sheetConfirmBtn: {
    minHeight: touchTarget.minHeight,
  },
});
