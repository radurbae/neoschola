import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert as NativeAlert,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Role,
  Invoice,
  InvoiceStatus,
  Assignment,
  GradeNote,
  Student,
  formatRupiah,
  formatTanggalId,
} from "@neoschola/shared";
import { useRouter } from "expo-router";
import {
  TopUtilityBar,
  PastelStatCard,
  DarkIconRow,
  Card,
  Chip,
  Button,
  Input,
  Label,
  StateView,
  Sheet,
  Tabs,
  Separator,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  breakpoints,
  radius,
  shadcn,
  spacing,
  touchTarget,
  typography,
} from "../../theme/tokens";

type InvoiceFilter = "WAITING" | "UNPAID" | "PAID" | "ALL";
type TeacherAcademicMode = "ASSIGNMENTS" | "GRADES";

export function StaffFinanceOrAcademicScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;

  const { user, classes } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  // State bersama siswa dan kelas
  const [students, setStudents] = useState<Student[]>([]);

  // State admin (Keuangan / Tagihan)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("WAITING");
  const [invoicesLoading, setInvoicesLoading] = useState<boolean>(true);
  const [invoicesRefreshing, setInvoicesRefreshing] = useState<boolean>(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  // Modal Verifikasi / Sukses Kuitansi
  const [verifiedReceipt, setVerifiedReceipt] = useState<{
    receiptNo: string;
    studentName: string;
    amount: number;
  } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal Buat Tagihan Baru (Admin)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState<boolean>(false);
  const [selectedStudentForInvoice, setSelectedStudentForInvoice] = useState<string>("");
  const [invoiceTitle, setInvoiceTitle] = useState<string>("");
  const [invoiceDescription, setInvoiceDescription] = useState<string>("");
  const [invoiceAmountStr, setInvoiceAmountStr] = useState<string>("");
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>("");
  const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState<boolean>(false);

  // State guru (Akademik / Tugas & Nilai)
  const [teacherMode, setTeacherMode] = useState<TeacherAcademicMode>("ASSIGNMENTS");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState<boolean>(true);
  const [assignmentsRefreshing, setAssignmentsRefreshing] = useState<boolean>(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // Modal Buat Tugas (Teacher)
  const [assignmentModalVisible, setAssignmentModalVisible] = useState<boolean>(false);
  const [assignmentTitle, setAssignmentTitle] = useState<string>("");
  const [assignmentSubject, setAssignmentSubject] = useState<string>("");
  const [assignmentDescription, setAssignmentDescription] = useState<string>("");
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>("");
  const [assignmentClassId, setAssignmentClassId] = useState<string>("");
  const [assignmentFormError, setAssignmentFormError] = useState<string | null>(null);
  const [creatingAssignment, setCreatingAssignment] = useState<boolean>(false);

  // Nilai & Catatan (Teacher)
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState<string>("");
  const [grades, setGrades] = useState<GradeNote[]>([]);
  const [gradesLoading, setGradesLoading] = useState<boolean>(false);
  const [gradeModalVisible, setGradeModalVisible] = useState<boolean>(false);
  const [gradeSubject, setGradeSubject] = useState<string>("");
  const [gradeSemester, setGradeSemester] = useState<number>(1);
  const [gradeAcademicYear, setGradeAcademicYear] = useState<string>("2026/2027");
  const [gradeScoreStr, setGradeScoreStr] = useState<string>("");
  const [gradeNotes, setGradeNotes] = useState<string>("");
  const [gradeFormError, setGradeFormError] = useState<string | null>(null);
  const [creatingGrade, setCreatingGrade] = useState<boolean>(false);

  // Pengambilan data
  const loadStudents = useCallback(async () => {
    try {
      const res = await api.getStudents();
      const st = res.students || [];
      setStudents(st);
      if (st.length > 0) {
        if (!selectedStudentForInvoice) setSelectedStudentForInvoice(st[0].id);
        if (!selectedStudentForGrade) setSelectedStudentForGrade(st[0].id);
      }
    } catch {}
  }, [selectedStudentForInvoice, selectedStudentForGrade]);

  const loadInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setInvoicesRefreshing(true);
    else setInvoicesLoading(true);
    setInvoicesError(null);

    try {
      const res = await api.getInvoices();
      setInvoices(res.invoices || []);
    } catch (err: any) {
      setInvoicesError(err?.message || "Gagal memuat daftar tagihan. Silakan coba kembali.");
    } finally {
      setInvoicesLoading(false);
      setInvoicesRefreshing(false);
    }
  }, []);

  const loadAssignments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setAssignmentsRefreshing(true);
    else setAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const res = await api.getAssignments();
      setAssignments(res.assignments || []);
    } catch (err: any) {
      setAssignmentsError(err?.message || "Gagal memuat daftar tugas kelas.");
    } finally {
      setAssignmentsLoading(false);
      setAssignmentsRefreshing(false);
    }
  }, []);

  const loadGradesForStudent = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setGradesLoading(true);
    try {
      const res = await api.getGrades({ student_id: studentId });
      setGrades(res.grades || []);
    } catch {
      setGrades([]);
    } finally {
      setGradesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    if (isAdmin) {
      loadInvoices();
    } else {
      loadAssignments();
    }
  }, [isAdmin, loadStudents, loadInvoices, loadAssignments]);

  useEffect(() => {
    if (!isAdmin && selectedStudentForGrade) {
      loadGradesForStudent(selectedStudentForGrade);
    }
  }, [isAdmin, selectedStudentForGrade, loadGradesForStudent]);

  // Handler Admin Keuangan
  const handleVerifyPaid = async (inv: Invoice) => {
    setActionLoadingId(inv.id);
    try {
      const res = await api.verifyInvoice(inv.id, {
        status: "PAID",
        notes: "Pembayaran telah diverifikasi sah oleh Admin Tata Usaha.",
      });

      const receiptNo = res.invoice?.receipt_no || `KWT-${Date.now().toString().slice(-6)}`;
      setVerifiedReceipt({
        receiptNo,
        studentName: inv.student_name || "Peserta Didik",
        amount: inv.amount,
      });

      await loadInvoices(true);
    } catch (err: any) {
      NativeAlert.alert("Kendala", err?.message || "Gagal memverifikasi pembayaran.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectPayment = async (inv: Invoice) => {
    NativeAlert.alert(
      "Tolak Pembayaran",
      `Apakah Anda yakin ingin menolak bukti bayar untuk ${inv.title}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tolak",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(inv.id);
            try {
              await api.verifyInvoice(inv.id, {
                status: "REJECTED",
                notes: "Bukti pembayaran tidak sesuai atau tidak dapat diverifikasi.",
              });
              NativeAlert.alert("Ditolak", "Status pembayaran telah ditolak.");
              await loadInvoices(true);
            } catch (err: any) {
              NativeAlert.alert("Kendala", err?.message || "Gagal menolak pembayaran.");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenCreateInvoice = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 10);
    const defaultDueDate = nextMonth.toISOString().split("T")[0];

    setInvoiceTitle("SPP Sekolah");
    setInvoiceDescription("Iuran Penyelenggaraan Pendidikan");
    setInvoiceAmountStr("250000");
    setInvoiceDueDate(defaultDueDate);
    setInvoiceFormError(null);
    setInvoiceModalVisible(true);
  };

  const handleCreateInvoice = async () => {
    if (!selectedStudentForInvoice) {
      setInvoiceFormError("Pilih siswa yang akan ditagihkan.");
      return;
    }
    if (invoiceTitle.trim().length < 3) {
      setInvoiceFormError("Judul tagihan minimal 3 karakter.");
      return;
    }
    const amountNum = parseFloat(invoiceAmountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      setInvoiceFormError("Nominal tagihan harus berupa angka positif.");
      return;
    }
    if (!invoiceDueDate.trim()) {
      setInvoiceFormError("Tanggal jatuh tempo wajib diisi (YYYY-MM-DD).");
      return;
    }

    setCreatingInvoice(true);
    setInvoiceFormError(null);

    try {
      await api.createInvoice({
        student_id: selectedStudentForInvoice,
        title: invoiceTitle.trim(),
        description: invoiceDescription.trim() || undefined,
        amount: amountNum,
        due_date: invoiceDueDate.trim(),
      });

      NativeAlert.alert("Berhasil", "Tagihan baru berhasil diterbitkan.");
      setInvoiceModalVisible(false);
      await loadInvoices(true);
    } catch (err: any) {
      setInvoiceFormError(err?.message || "Gagal menerbitkan tagihan.");
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Handler Guru Akademik
  const handleOpenCreateAssignment = () => {
    const defaultClass = classes && classes.length > 0 ? classes[0].id : "cls_4a";
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    setAssignmentClassId(defaultClass);
    setAssignmentTitle("");
    setAssignmentSubject("Matematika");
    setAssignmentDescription("");
    setAssignmentDueDate(nextWeek);
    setAssignmentFormError(null);
    setAssignmentModalVisible(true);
  };

  const handleCreateAssignment = async () => {
    if (assignmentTitle.trim().length < 3) {
      setAssignmentFormError("Judul tugas minimal 3 karakter.");
      return;
    }
    if (!assignmentSubject.trim()) {
      setAssignmentFormError("Mata pelajaran wajib diisi.");
      return;
    }
    if (!assignmentDueDate.trim()) {
      setAssignmentFormError("Tenggat pengumpulan wajib diisi.");
      return;
    }

    setCreatingAssignment(true);
    setAssignmentFormError(null);

    try {
      await api.createAssignment({
        class_id: assignmentClassId || "cls_4a",
        title: assignmentTitle.trim(),
        subject: assignmentSubject.trim(),
        description: assignmentDescription.trim() || "Kerjakan latihan di buku modul.",
        due_date: assignmentDueDate.trim(),
      });

      NativeAlert.alert("Berhasil", "Tugas baru berhasil dibagikan.");
      setAssignmentModalVisible(false);
      await loadAssignments(true);
    } catch (err: any) {
      setAssignmentFormError(err?.message || "Gagal membuat tugas.");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleOpenCreateGrade = () => {
    setGradeSubject("Matematika");
    setGradeSemester(1);
    setGradeAcademicYear("2026/2027");
    setGradeScoreStr("85");
    setGradeNotes("Sangat baik dalam pemahaman konsep.");
    setGradeFormError(null);
    setGradeModalVisible(true);
  };

  const handleCreateGrade = async () => {
    if (!selectedStudentForGrade) {
      setGradeFormError("Pilih siswa terlebih dahulu.");
      return;
    }
    if (!gradeSubject.trim()) {
      setGradeFormError("Mata pelajaran wajib diisi.");
      return;
    }
    const scoreNum = parseFloat(gradeScoreStr);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setGradeFormError("Nilai skor harus di antara 0 dan 100.");
      return;
    }

    setCreatingGrade(true);
    setGradeFormError(null);

    try {
      await api.createGrade({
        student_id: selectedStudentForGrade,
        subject: gradeSubject.trim(),
        semester: gradeSemester,
        academic_year: gradeAcademicYear.trim(),
        score: scoreNum,
        notes: gradeNotes.trim() || undefined,
      });

      NativeAlert.alert("Berhasil", "Nilai siswa berhasil disimpan.");
      setGradeModalVisible(false);
      await loadGradesForStudent(selectedStudentForGrade);
    } catch (err: any) {
      setGradeFormError(err?.message || "Gagal menyimpan nilai.");
    } finally {
      setCreatingGrade(false);
    }
  };

  // Tampilan Admin (Keuangan)
  if (isAdmin) {
    const waitingInvoices = invoices.filter(
      (inv) => inv.status === InvoiceStatus.WAITING_VERIFICATION
    );
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === InvoiceStatus.UNPAID || inv.status === InvoiceStatus.OVERDUE
    );
    const paidInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PAID);

    const filteredInvoices = invoices.filter((inv) => {
      if (invoiceFilter === "WAITING") return inv.status === InvoiceStatus.WAITING_VERIFICATION;
      if (invoiceFilter === "UNPAID")
        return inv.status === InvoiceStatus.UNPAID || inv.status === InvoiceStatus.OVERDUE;
      if (invoiceFilter === "PAID") return inv.status === InvoiceStatus.PAID;
      return true;
    });

    return (
      <View style={styles.container}>
        <TopUtilityBar
          title="Keuangan Sekolah"
          subtitle="Verifikasi pembayaran dan kelola tagihan siswa"
          profileName={user?.name || "Staf"}
          onPressNotifications={() => router.push("/notifications")}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={invoicesRefreshing}
              onRefresh={() => loadInvoices(true)}
              colors={[shadcn.primary]}
              tintColor={shadcn.primary}
            />
          }
        >
          {/* 2 PastelStatCard: butter "Menunggu" & mint "Lunas" */}
          <View style={isTablet ? styles.statsRowTablet : styles.statsRowMobile}>
            <PastelStatCard
              tone="butter"
              value={String(waitingInvoices.length)}
              label="Menunggu Verifikasi"
              icon="hourglass-outline"
              trendText="Perlu verifikasi"
              onPress={() => setInvoiceFilter("WAITING")}
              style={styles.statCardItem}
            />
            <PastelStatCard
              tone="mint"
              value={String(paidInvoices.length)}
              label="Pembayaran Lunas"
              icon="checkmark-circle-outline"
              trendText="Tervalidasi"
              onPress={() => setInvoiceFilter("PAID")}
              style={styles.statCardItem}
            />
          </View>

          {/* Tombol Buat Tagihan Baru */}
          <Button
            title="Buat Tagihan Baru"
            onPress={handleOpenCreateInvoice}
            variant="default"
            accessibilityLabel="Buka formulir pembuatan tagihan baru"
            leftIcon={<Ionicons name="wallet-outline" size={18} color={shadcn.primaryForeground} />}
            style={styles.actionBtnTop}
          />

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            <Chip
              label="Verifikasi"
              selected={invoiceFilter === "WAITING"}
              onPress={() => setInvoiceFilter("WAITING")}
              count={waitingInvoices.length}
              accessibilityLabel={`Filter tagihan menunggu verifikasi, ${waitingInvoices.length} item`}
            />
            <Chip
              label="Belum Lunas"
              selected={invoiceFilter === "UNPAID"}
              onPress={() => setInvoiceFilter("UNPAID")}
              count={unpaidInvoices.length}
              accessibilityLabel={`Filter tagihan belum lunas, ${unpaidInvoices.length} item`}
            />
            <Chip
              label="Lunas"
              selected={invoiceFilter === "PAID"}
              onPress={() => setInvoiceFilter("PAID")}
              count={paidInvoices.length}
              accessibilityLabel={`Filter tagihan lunas, ${paidInvoices.length} item`}
            />
            <Chip
              label="Semua"
              selected={invoiceFilter === "ALL"}
              onPress={() => setInvoiceFilter("ALL")}
              count={invoices.length}
              accessibilityLabel={`Filter semua tagihan, total ${invoices.length} item`}
            />
          </ScrollView>

          {/* State Loading / Error / Empty */}
          {invoicesLoading && !invoicesRefreshing ? (
            <StateView type="loading" message="Memuat daftar tagihan sekolah..." />
          ) : invoicesError ? (
            <StateView
              type="error"
              title="Gagal Memuat Tagihan"
              message={invoicesError}
              actionLabel="Coba Lagi"
              onAction={() => loadInvoices()}
            />
          ) : filteredInvoices.length === 0 ? (
            <StateView
              type="empty"
              title="Tidak Ada Tagihan"
              message={`Belum ada tagihan dengan filter ${
                invoiceFilter === "WAITING"
                  ? "Menunggu Verifikasi"
                  : invoiceFilter === "UNPAID"
                  ? "Belum Lunas"
                  : invoiceFilter === "PAID"
                  ? "Lunas"
                  : "Semua"
              }.`}
            />
          ) : (
            <View style={styles.invoicesList}>
              {filteredInvoices.map((inv) => {
                const isWaiting = inv.status === InvoiceStatus.WAITING_VERIFICATION;
                const isPaid = inv.status === InvoiceStatus.PAID;
                const isActionBusy = actionLoadingId === inv.id;

                const getStatusText = () => {
                  switch (inv.status) {
                    case InvoiceStatus.PAID:
                      return "Lunas";
                    case InvoiceStatus.WAITING_VERIFICATION:
                      return "Verifikasi";
                    case InvoiceStatus.OVERDUE:
                      return "Terlambat";
                    case InvoiceStatus.REJECTED:
                      return "Ditolak";
                    case InvoiceStatus.UNPAID:
                    default:
                      return "Belum Lunas";
                  }
                };

                const getStatusTone = (): "success" | "danger" | "warning" | "info" | "neutral" => {
                  switch (inv.status) {
                    case InvoiceStatus.PAID:
                      return "success";
                    case InvoiceStatus.WAITING_VERIFICATION:
                      return "warning";
                    case InvoiceStatus.OVERDUE:
                    case InvoiceStatus.REJECTED:
                      return "danger";
                    case InvoiceStatus.UNPAID:
                    default:
                      return "neutral";
                  }
                };

                const subtext = `${inv.student_name || "Siswa"}${
                  inv.class_name ? ` • Kelas ${inv.class_name}` : ""
                } • Tempo: ${formatTanggalId(inv.due_date, { shortMonth: true })}`;

                return (
                  <Card key={inv.id} style={styles.invoiceCard}>
                    <DarkIconRow
                      icon="wallet-outline"
                      title={inv.title}
                      subtitle={subtext}
                      rightPrimary={formatRupiah(inv.amount)}
                      rightSecondary={getStatusText()}
                      rightSecondaryTone={getStatusTone()}
                    />

                    {/* Informasi Bukti Pembayaran Khusus WAITING_VERIFICATION */}
                    {isWaiting && (
                      <View style={styles.verificationBox}>
                        <Separator style={styles.verifySeparator} />
                        <View style={styles.verificationTitleRow}>
                          <Ionicons
                            name="receipt-outline"
                            size={16}
                            color={shadcn.status.warning.text}
                          />
                          <Text style={styles.verificationBoxTitle}>
                            Rincian Pembayaran Masuk
                          </Text>
                        </View>
                        <Text style={styles.proofField}>
                          Metode Bayar:{" "}
                          <Text style={styles.proofValue}>
                            {inv.payment_method || "Transfer Bank / Dompet Digital"}
                          </Text>
                        </Text>
                        {Boolean(inv.payment_ref) && (
                          <Text style={styles.proofField}>
                            No. Referensi:{" "}
                            <Text style={styles.proofValue}>{inv.payment_ref}</Text>
                          </Text>
                        )}
                        {Boolean(inv.proof_note) && (
                          <Text style={styles.proofField}>
                            Catatan Wali:{" "}
                            <Text style={styles.proofValue}>"{inv.proof_note}"</Text>
                          </Text>
                        )}

                        {/* Tombol Aksi Verifikasi & Tolak */}
                        <View style={styles.verifyActionsRow}>
                          <Button
                            title="Tolak"
                            variant="outline"
                            size="sm"
                            onPress={() => handleRejectPayment(inv)}
                            disabled={isActionBusy}
                            leftIcon={
                              <Ionicons
                                name="close"
                                size={16}
                                color={shadcn.destructive}
                              />
                            }
                            accessibilityLabel={`Tolak bukti pembayaran ${inv.title}`}
                            style={styles.rejectBtn}
                          />

                          <Button
                            title={isActionBusy ? "Memproses..." : "Verifikasi Lunas"}
                            variant="default"
                            size="sm"
                            onPress={() => handleVerifyPaid(inv)}
                            disabled={isActionBusy}
                            leftIcon={
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color={shadcn.primaryForeground}
                              />
                            }
                            accessibilityLabel={`Verifikasi lunas tagihan ${inv.title}`}
                            style={styles.approveBtn}
                          />
                        </View>
                      </View>
                    )}

                    {/* Info Kuitansi Jika Lunas */}
                    {isPaid && Boolean(inv.receipt_no) && (
                      <View style={styles.receiptBox}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={shadcn.status.success.text}
                        />
                        <Text style={styles.receiptNoText}>
                          No. Kuitansi: {inv.receipt_no}
                        </Text>
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          )}

          {/* Sheet Buat Tagihan Baru */}
          <Sheet
            visible={invoiceModalVisible}
            onClose={() => setInvoiceModalVisible(false)}
            title="Buat Tagihan Baru"
          >
            <View style={styles.sheetBody}>
              {Boolean(invoiceFormError) && (
                <View style={styles.formErrorBox}>
                  <Ionicons name="alert-circle" size={18} color={shadcn.status.danger.text} />
                  <Text style={styles.formErrorText}>{invoiceFormError}</Text>
                </View>
              )}

              <Label required>Pilih Siswa Penerima</Label>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.studentChipsScroll}
              >
                {students.map((st) => {
                  const isSelected = selectedStudentForInvoice === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.choiceChip,
                        isSelected ? styles.choiceChipSelected : styles.choiceChipUnselected,
                      ]}
                      onPress={() => setSelectedStudentForInvoice(st.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Pilih ${st.full_name}`}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          isSelected
                            ? styles.choiceChipTextSelected
                            : styles.choiceChipTextUnselected,
                        ]}
                      >
                        {st.full_name} ({st.class_name || "Siswa"})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Label required>Judul Tagihan</Label>
              <Input
                value={invoiceTitle}
                onChangeText={setInvoiceTitle}
                placeholder="Contoh: SPP Bulan November 2026"
                accessibilityLabel="Input judul tagihan"
              />

              <Label required>Nominal Pembayaran (Rp)</Label>
              <Input
                value={invoiceAmountStr}
                onChangeText={setInvoiceAmountStr}
                keyboardType="numeric"
                placeholder="250000"
                accessibilityLabel="Input nominal tagihan"
              />

              <Label required>Jatuh Tempo (YYYY-MM-DD)</Label>
              <Input
                value={invoiceDueDate}
                onChangeText={setInvoiceDueDate}
                placeholder="2026-11-10"
                accessibilityLabel="Input tanggal jatuh tempo"
              />

              <Label>Deskripsi / Keterangan (Opsional)</Label>
              <Input
                value={invoiceDescription}
                onChangeText={setInvoiceDescription}
                placeholder="Rincian tambahan..."
                accessibilityLabel="Input keterangan tagihan"
              />

              <Button
                title={creatingInvoice ? "Menerbitkan..." : "Terbitkan Tagihan"}
                onPress={handleCreateInvoice}
                variant="default"
                loading={creatingInvoice}
                accessibilityLabel="Konfirmasi terbitkan tagihan baru"
                style={styles.sheetSubmitBtn}
              />
            </View>
          </Sheet>

          {/* Sheet Pop-up Kuitansi Terbit */}
          <Sheet
            visible={Boolean(verifiedReceipt)}
            onClose={() => setVerifiedReceipt(null)}
            title="Kuitansi Resmi Diterbitkan"
          >
            {verifiedReceipt && (
              <View style={styles.receiptSheetBody}>
                <View style={styles.receiptIconCircle}>
                  <Ionicons name="checkmark-done" size={28} color={shadcn.foreground} />
                </View>
                <Text style={styles.receiptSheetTitle}>Verifikasi Pembayaran Berhasil</Text>
                <Text style={styles.receiptSheetSub}>
                  Bukti pembayaran telah disahkan dan kuitansi resmi telah dicatat ke sistem.
                </Text>

                <View style={styles.receiptDetailCard}>
                  <Text style={styles.receiptLabel}>Nomor Kuitansi Resmi:</Text>
                  <Text style={styles.receiptValueHighlight}>
                    {verifiedReceipt.receiptNo}
                  </Text>
                  <Separator style={styles.receiptDivider} />
                  <Text style={styles.receiptLabel}>Peserta Didik:</Text>
                  <Text style={styles.receiptValue}>{verifiedReceipt.studentName}</Text>
                  <Text style={styles.receiptLabel}>Jumlah Terbayar:</Text>
                  <Text style={styles.receiptValue}>
                    {formatRupiah(verifiedReceipt.amount)}
                  </Text>
                </View>

                <Button
                  title="Selesai & Tutup"
                  onPress={() => setVerifiedReceipt(null)}
                  variant="default"
                  accessibilityLabel="Tutup dialog kuitansi"
                  style={styles.sheetSubmitBtn}
                />
              </View>
            )}
          </Sheet>
        </ScrollView>
      </View>
    );
  }

  // Tampilan Guru (Akademik)
  return (
    <View style={styles.container}>
      <TopUtilityBar
        title="Akademik Siswa"
        subtitle="Kelola tugas PR kelas serta catatan nilai evaluasi"
        profileName={user?.name || "Staf"}
        onPressNotifications={() => router.push("/notifications")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={assignmentsRefreshing}
            onRefresh={() => {
              loadAssignments(true);
              if (selectedStudentForGrade) loadGradesForStudent(selectedStudentForGrade);
            }}
            colors={[shadcn.primary]}
            tintColor={shadcn.primary}
          />
        }
      >
        {/* Tabs Segmented Mode: Tugas / Nilai */}
        <Tabs
          value={teacherMode}
          onValueChange={(val) => setTeacherMode(val as TeacherAcademicMode)}
          items={[
            { value: "ASSIGNMENTS", label: "Tugas Kelas" },
            { value: "GRADES", label: "Nilai Siswa" },
          ]}
          style={styles.tabsRail}
        />

        {/* TAB 1: TUGAS KELAS */}
        {teacherMode === "ASSIGNMENTS" && (
          <View>
            <Button
              title="Buat Tugas Baru"
              onPress={handleOpenCreateAssignment}
              variant="default"
              accessibilityLabel="Buka formulir pembuatan tugas baru"
              leftIcon={<Ionicons name="add-circle-outline" size={18} color={shadcn.primaryForeground} />}
              style={styles.actionBtnTop}
            />

            {assignmentsLoading && !assignmentsRefreshing ? (
              <StateView type="loading" message="Memuat daftar tugas kelas..." />
            ) : assignmentsError ? (
              <StateView
                type="error"
                title="Gagal Memuat Tugas"
                message={assignmentsError}
                actionLabel="Coba Lagi"
                onAction={() => loadAssignments()}
              />
            ) : assignments.length === 0 ? (
              <StateView
                type="empty"
                title="Belum Ada Tugas"
                message="Belum ada tugas atau PR aktif yang dibuat untuk kelas."
              />
            ) : (
              <Card style={styles.groupedCard}>
                {assignments.map((item, index) => {
                  const subtext = `${item.subject} • Tenggat: ${formatTanggalId(
                    item.due_date,
                    { shortMonth: true }
                  )} • ${item.description}`;

                  return (
                    <View key={item.id}>
                      {index > 0 && <Separator />}
                      <DarkIconRow
                        icon="book-outline"
                        title={item.title}
                        subtitle={subtext}
                        rightPrimary={item.subject}
                        rightSecondary="Tugas"
                        rightSecondaryTone="info"
                      />
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        )}

        {/* TAB 2: NILAI & CATATAN SISWA */}
        {teacherMode === "GRADES" && (
          <View>
            <Label>Pilih Siswa Binaan</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.studentChipsScroll}
            >
              {students.map((st) => {
                const isSelected = selectedStudentForGrade === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.choiceChip,
                      isSelected ? styles.choiceChipSelected : styles.choiceChipUnselected,
                    ]}
                    onPress={() => setSelectedStudentForGrade(st.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Pilih siswa ${st.full_name}`}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        isSelected
                          ? styles.choiceChipTextSelected
                          : styles.choiceChipTextUnselected,
                      ]}
                    >
                      {st.full_name} ({st.class_name || "Siswa"})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title="Tambah Nilai & Catatan"
              onPress={handleOpenCreateGrade}
              variant="default"
              accessibilityLabel="Buka formulir input nilai dan catatan siswa"
              leftIcon={<Ionicons name="ribbon-outline" size={18} color={shadcn.primaryForeground} />}
              style={styles.actionBtnTop}
            />

            {gradesLoading ? (
              <StateView type="loading" message="Memuat catatan nilai siswa..." />
            ) : grades.length === 0 ? (
              <StateView
                type="empty"
                title="Belum Ada Nilai"
                message="Siswa yang dipilih belum memiliki rekaman nilai atau catatan evaluasi."
              />
            ) : (
              <Card style={styles.groupedCard}>
                {grades.map((gr, index) => {
                  const subtext = `Semester ${gr.semester} • TA ${gr.academic_year}${
                    gr.notes ? ` • ${gr.notes}` : ""
                  }`;

                  return (
                    <View key={gr.id}>
                      {index > 0 && <Separator />}
                      <DarkIconRow
                        icon="ribbon-outline"
                        title={gr.subject}
                        subtitle={subtext}
                        rightPrimary={String(gr.score)}
                        rightSecondary="Skor"
                        rightSecondaryTone="success"
                      />
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        )}

        {/* Sheet Buat Tugas (Teacher) */}
        <Sheet
          visible={assignmentModalVisible}
          onClose={() => setAssignmentModalVisible(false)}
          title="Buat Tugas Baru"
        >
          <View style={styles.sheetBody}>
            {Boolean(assignmentFormError) && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={18} color={shadcn.status.danger.text} />
                <Text style={styles.formErrorText}>{assignmentFormError}</Text>
              </View>
            )}

            <Label required>Mata Pelajaran</Label>
            <Input
              value={assignmentSubject}
              onChangeText={setAssignmentSubject}
              placeholder="Contoh: Matematika, Bahasa Indonesia, IPA"
              accessibilityLabel="Input mata pelajaran tugas"
            />

            <Label required>Judul Tugas / PR</Label>
            <Input
              value={assignmentTitle}
              onChangeText={setAssignmentTitle}
              placeholder="Contoh: Latihan Perkalian & Pembagian Bab 2"
              accessibilityLabel="Input judul tugas"
            />

            <Label required>Tenggat Pengumpulan (YYYY-MM-DD)</Label>
            <Input
              value={assignmentDueDate}
              onChangeText={setAssignmentDueDate}
              placeholder="2026-11-05"
              accessibilityLabel="Input batas waktu pengumpulan"
            />

            <Label>Petunjuk & Deskripsi Pengerjaan</Label>
            <Input
              value={assignmentDescription}
              onChangeText={setAssignmentDescription}
              multiline
              numberOfLines={3}
              placeholder="Instruksi pengerjaan bagi siswa dan panduan untuk orang tua..."
              accessibilityLabel="Input deskripsi tugas"
            />

            <Button
              title={creatingAssignment ? "Menyimpan..." : "Bagikan Tugas"}
              onPress={handleCreateAssignment}
              variant="default"
              loading={creatingAssignment}
              accessibilityLabel="Konfirmasi bagikan tugas ke siswa"
              style={styles.sheetSubmitBtn}
            />
          </View>
        </Sheet>

        {/* Sheet Tambah Nilai (Teacher) */}
        <Sheet
          visible={gradeModalVisible}
          onClose={() => setGradeModalVisible(false)}
          title="Tambah Nilai & Catatan Siswa"
        >
          <View style={styles.sheetBody}>
            {Boolean(gradeFormError) && (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle" size={18} color={shadcn.status.danger.text} />
                <Text style={styles.formErrorText}>{gradeFormError}</Text>
              </View>
            )}

            <Label required>Mata Pelajaran</Label>
            <Input
              value={gradeSubject}
              onChangeText={setGradeSubject}
              placeholder="Contoh: Matematika"
              accessibilityLabel="Input mata pelajaran nilai"
            />

            <Label required>Nilai Skor (0 - 100)</Label>
            <Input
              value={gradeScoreStr}
              onChangeText={setGradeScoreStr}
              keyboardType="numeric"
              placeholder="85"
              accessibilityLabel="Input nilai angka siswa"
            />

            <View style={styles.inputDoubleRow}>
              <View style={styles.inputDoubleCol}>
                <Label required>Semester</Label>
                <Input
                  value={String(gradeSemester)}
                  onChangeText={(val) => setGradeSemester(parseInt(val, 10) || 1)}
                  keyboardType="numeric"
                  accessibilityLabel="Input semester"
                />
              </View>
              <View style={styles.inputDoubleCol}>
                <Label required>Tahun Ajaran</Label>
                <Input
                  value={gradeAcademicYear}
                  onChangeText={setGradeAcademicYear}
                  placeholder="2026/2027"
                  accessibilityLabel="Input tahun ajaran"
                />
              </View>
            </View>

            <Label>Catatan Guru & Evaluasi Capaian</Label>
            <Input
              value={gradeNotes}
              onChangeText={setGradeNotes}
              multiline
              numberOfLines={3}
              placeholder="Berikan umpan balik positif atau arahan perbaikan bagi siswa..."
              accessibilityLabel="Input catatan guru"
            />

            <Button
              title={creatingGrade ? "Menyimpan..." : "Simpan Nilai & Catatan"}
              onPress={handleCreateGrade}
              variant="default"
              loading={creatingGrade}
              accessibilityLabel="Konfirmasi simpan nilai siswa"
              style={styles.sheetSubmitBtn}
            />
          </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.max,
  },
  statsRowTablet: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsRowMobile: {
    flexDirection: "column",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCardItem: {
    flex: 1,
  },
  actionBtnTop: {
    marginBottom: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  filterChipsRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  tabsRail: {
    marginBottom: spacing.md,
  },
  studentChipsScroll: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  choiceChip: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  choiceChipSelected: {
    backgroundColor: shadcn.primary,
    borderColor: shadcn.primary,
  },
  choiceChipUnselected: {
    backgroundColor: shadcn.background,
    borderColor: shadcn.border,
  },
  choiceChipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  choiceChipTextSelected: {
    color: shadcn.primaryForeground,
  },
  choiceChipTextUnselected: {
    color: shadcn.foreground,
  },
  invoicesList: {
    gap: spacing.md,
  },
  invoiceCard: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  verificationBox: {
    marginTop: spacing.xs,
  },
  verifySeparator: {
    marginBottom: spacing.sm,
  },
  verificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  verificationBoxTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: shadcn.status.warning.text,
  },
  proofField: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  proofValue: {
    color: shadcn.foreground,
    fontWeight: typography.weight.medium,
  },
  verifyActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    minHeight: touchTarget.minHeight,
  },
  approveBtn: {
    flex: 1,
    minHeight: touchTarget.minHeight,
  },
  receiptBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: shadcn.border,
  },
  receiptNoText: {
    fontSize: typography.size.xs,
    color: shadcn.status.success.text,
    fontWeight: typography.weight.medium,
    fontVariant: ["tabular-nums"],
  },
  groupedCard: {
    backgroundColor: shadcn.card,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  inputDoubleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inputDoubleCol: {
    flex: 1,
  },
  sheetBody: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: shadcn.status.danger.bg,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  formErrorText: {
    color: shadcn.status.danger.text,
    fontSize: typography.size.xs,
    flex: 1,
  },
  sheetSubmitBtn: {
    marginTop: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  receiptSheetBody: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  receiptIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: shadcn.status.success.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  receiptSheetTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  receiptSheetSub: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  receiptDetailCard: {
    width: "100%",
    backgroundColor: shadcn.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  receiptLabel: {
    fontSize: 11,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  receiptValueHighlight: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  receiptDivider: {
    marginVertical: spacing.sm,
  },
  receiptValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
});
