import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId, formatRupiah } from "@neoschola/shared";
import type { Invoice, InvoiceStatus } from "@neoschola/shared";
import {
  Screen,
  Card,
  Badge,
  Chip,
  Button,
  Input,
  ModalSheet,
  ChildSwitcher,
  StateView,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  colors,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

type FinanceFilter = "SEMUA" | "BELUM_LUNAS" | "MENUNGGU_VERIFIKASI" | "LUNAS";

const PAYMENT_METHODS = [
  { id: "TRANSFER_BANK", label: "Transfer Bank" },
  { id: "VIRTUAL_ACCOUNT", label: "Virtual Account" },
  { id: "QRIS_SANDBOX", label: "QRIS (Uji Coba)" },
];

export function FinanceScreen() {
  const { students, activeStudentId, activeStudent, setActiveStudentId } =
    useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FinanceFilter>("SEMUA");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Pembayaran Sandbox
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(
    null
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("TRANSFER_BANK");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [proofNote, setProofNote] = useState<string>("");
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Modal Kuitansi Digital
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<Invoice | null>(
    null
  );

  const fetchInvoices = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const res = await api.getInvoices({
          student_id: activeStudentId || undefined,
        });
        setInvoices(res.invoices || []);
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Gagal memuat tagihan. Periksa koneksi internet Anda."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStudentId]
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filter tagihan sesuai tab
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (selectedFilter === "SEMUA") return true;
      if (selectedFilter === "BELUM_LUNAS") {
        return (
          item.status === "UNPAID" ||
          item.status === "OVERDUE" ||
          item.status === "REJECTED"
        );
      }
      if (selectedFilter === "MENUNGGU_VERIFIKASI") {
        return item.status === "WAITING_VERIFICATION";
      }
      if (selectedFilter === "LUNAS") {
        return item.status === "PAID";
      }
      return true;
    });
  }, [invoices, selectedFilter]);

  // Hitung total tagihan aktif (UNPAID + OVERDUE + REJECTED)
  const totalUnpaidAmount = useMemo(() => {
    return invoices
      .filter(
        (item) =>
          item.status === "UNPAID" ||
          item.status === "OVERDUE" ||
          item.status === "REJECTED"
      )
      .reduce((sum, item) => sum + item.amount, 0);
  }, [invoices]);

  // Hitung jumlah untuk chips
  const filterCounts = useMemo(() => {
    const counts = {
      SEMUA: invoices.length,
      BELUM_LUNAS: 0,
      MENUNGGU_VERIFIKASI: 0,
      LUNAS: 0,
    };
    for (const item of invoices) {
      if (
        item.status === "UNPAID" ||
        item.status === "OVERDUE" ||
        item.status === "REJECTED"
      ) {
        counts.BELUM_LUNAS++;
      } else if (item.status === "WAITING_VERIFICATION") {
        counts.MENUNGGU_VERIFIKASI++;
      } else if (item.status === "PAID") {
        counts.LUNAS++;
      }
    }
    return counts;
  }, [invoices]);

  const getStatusBadge = (
    status: InvoiceStatus
  ): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case "UNPAID":
        return { label: "Belum Dibayar", variant: "danger" };
      case "WAITING_VERIFICATION":
        return { label: "Menunggu Verifikasi", variant: "warning" };
      case "PAID":
        return { label: "Lunas", variant: "success" };
      case "OVERDUE":
        return { label: "Jatuh Tempo", variant: "danger" };
      case "REJECTED":
        return { label: "Ditolak", variant: "danger" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPaymentModalInvoice(invoice);
    setSelectedPaymentMethod("TRANSFER_BANK");
    // Generate default mock ref untuk kenyamanan sandbox
    const randomRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentRef(randomRef);
    setProofNote(`Pembayaran ${invoice.title} a.n. ${activeStudent?.full_name || "Siswa"}`);
    setPaymentProofUrl("");
    setPaymentError(null);
  };

  const handleSubmitPayment = async () => {
    if (!paymentModalInvoice) return;

    if (!paymentRef.trim() && !proofNote.trim() && !paymentProofUrl.trim()) {
      setPaymentError(
        "Mohon isi minimal nomor referensi atau catatan bukti pembayaran."
      );
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      await api.submitPayment(paymentModalInvoice.id, {
        payment_method: selectedPaymentMethod,
        payment_ref: paymentRef.trim() || undefined,
        proof_note: proofNote.trim() || undefined,
        payment_proof_url: paymentProofUrl.trim() || undefined,
      });

      setPaymentModalInvoice(null);
      // Refresh daftar
      fetchInvoices(false);
    } catch (err: any) {
      setPaymentError(
        err?.message || "Gagal mengirim konfirmasi pembayaran. Silakan coba lagi."
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <Screen
      scroll={true}
      headerShown={true}
      title="Keuangan & SPP"
      subtitle="Pengelolaan tagihan dan kuitansi siswa"
    >
      {/* Pemilih Anak Asuh */}
      {students.length > 0 && (
        <ChildSwitcher
          students={students}
          activeStudentId={activeStudentId}
          onSelectStudent={setActiveStudentId}
          style={styles.childSwitcherStyle}
        />
      )}

      {/* Kartu Ringkasan Total Tagihan Aktif */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIconBadge}>
            <Ionicons name="wallet" size={24} color={colors.primary} />
          </View>
          <View style={styles.summaryTitleCol}>
            <Text style={styles.summaryLabel}>Total Tagihan Belum Lunas</Text>
            <Text style={styles.summaryStudentName}>
              {activeStudent?.full_name || "Semua Siswa"}
            </Text>
          </View>
        </View>

        <Text style={styles.summaryAmount}>
          {formatRupiah(totalUnpaidAmount)}
        </Text>

        <View style={styles.summaryFooterRow}>
          <Text style={styles.summaryFooterText}>
            {filterCounts.BELUM_LUNAS > 0
              ? `${filterCounts.BELUM_LUNAS} tagihan memerlukan pelunasan`
              : "Semua kewajiban keuangan telah terpenuhi"}
          </Text>
        </View>
      </Card>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Chip
            label="Semua"
            count={filterCounts.SEMUA}
            selected={selectedFilter === "SEMUA"}
            onPress={() => setSelectedFilter("SEMUA")}
          />
          <Chip
            label="Belum Lunas"
            count={filterCounts.BELUM_LUNAS}
            selected={selectedFilter === "BELUM_LUNAS"}
            onPress={() => setSelectedFilter("BELUM_LUNAS")}
          />
          <Chip
            label="Menunggu Verifikasi"
            count={filterCounts.MENUNGGU_VERIFIKASI}
            selected={selectedFilter === "MENUNGGU_VERIFIKASI"}
            onPress={() => setSelectedFilter("MENUNGGU_VERIFIKASI")}
          />
          <Chip
            label="Lunas"
            count={filterCounts.LUNAS}
            selected={selectedFilter === "LUNAS"}
            onPress={() => setSelectedFilter("LUNAS")}
          />
        </ScrollView>
      </View>

      {/* Konten Daftar Tagihan */}
      {loading ? (
        <StateView type="loading" message="Memuat daftar tagihan..." />
      ) : errorMessage ? (
        <StateView
          type="error"
          title="Gagal Memuat Tagihan"
          message={errorMessage}
          actionLabel="Muat Ulang"
          onAction={() => fetchInvoices(false)}
        />
      ) : filteredInvoices.length === 0 ? (
        <StateView
          type="empty"
          title="Tidak Ada Tagihan"
          message="Tidak ditemukan tagihan untuk filter yang dipilih."
          actionLabel="Segarkan Data"
          onAction={() => fetchInvoices(false)}
        />
      ) : (
        <View style={styles.invoiceList}>
          {filteredInvoices.map((invoice) => {
            const statusBadge = getStatusBadge(invoice.status);
            const isPayable =
              invoice.status === "UNPAID" ||
              invoice.status === "OVERDUE" ||
              invoice.status === "REJECTED";
            const isPaid = invoice.status === "PAID";

            return (
              <Card key={invoice.id} style={styles.invoiceCard}>
                {/* Header Kartu: Judul & Badge Status */}
                <View style={styles.invoiceHeaderRow}>
                  <View style={styles.invoiceTitleCol}>
                    <Text style={styles.invoiceTitle}>{invoice.title}</Text>
                    {Boolean(invoice.student_name) && (
                      <Text style={styles.invoiceStudentClass}>
                        {invoice.student_name} • {invoice.class_name || "Siswa"}
                      </Text>
                    )}
                  </View>
                  <Badge
                    label={statusBadge.label}
                    variant={statusBadge.variant}
                  />
                </View>

                {/* Deskripsi Tagihan jika ada */}
                {Boolean(invoice.description) && (
                  <Text style={styles.invoiceDescription}>
                    {invoice.description}
                  </Text>
                )}

                {/* Info Nominal & Jatuh Tempo */}
                <View style={styles.invoiceDetailRow}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Nominal</Text>
                    <Text style={styles.detailAmount}>
                      {formatRupiah(invoice.amount)}
                    </Text>
                  </View>
                  <View style={styles.detailColRight}>
                    <Text style={styles.detailLabel}>Jatuh Tempo</Text>
                    <Text style={styles.detailDate}>
                      {formatTanggalId(invoice.due_date, { includeDay: true })}
                    </Text>
                  </View>
                </View>

                {/* Tombol Aksi */}
                <View style={styles.actionRow}>
                  {isPayable && (
                    <Button
                      title="Bayar / Konfirmasi Transfer"
                      variant="primary"
                      onPress={() => handleOpenPaymentModal(invoice)}
                      leftIcon={
                        <Ionicons
                          name="card-outline"
                          size={18}
                          color={colors.textInverse}
                        />
                      }
                      accessibilityLabel={`Bayar tagihan ${invoice.title} sejumlah ${formatRupiah(invoice.amount)}`}
                    />
                  )}

                  {isPaid && (
                    <Button
                      title="Lihat Kuitansi"
                      variant="outline"
                      onPress={() => setReceiptModalInvoice(invoice)}
                      leftIcon={
                        <Ionicons
                          name="receipt-outline"
                          size={18}
                          color={colors.primary}
                        />
                      }
                      accessibilityLabel={`Buka kuitansi resmi untuk ${invoice.title}`}
                    />
                  )}

                  {invoice.status === "WAITING_VERIFICATION" && (
                    <View style={styles.waitingNotice}>
                      <Ionicons
                        name="hourglass-outline"
                        size={16}
                        color={colors.badge.warning.text}
                      />
                      <Text style={styles.waitingNoticeText}>
                        Bukti pembayaran telah dikirim dan menunggu verifikasi admin TU.
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* ModalSheet Konfirmasi Pembayaran Sandbox */}
      <ModalSheet
        visible={Boolean(paymentModalInvoice)}
        onClose={() => setPaymentModalInvoice(null)}
        title="Konfirmasi Pembayaran (Uji Coba)"
      >
        {paymentModalInvoice && (
          <View style={styles.modalBody}>
            {/* Ringkasan Tagihan */}
            <View style={styles.paymentSummaryCard}>
              <Text style={styles.paymentSummaryLabel}>Total Yang Harus Dibayar</Text>
              <Text style={styles.paymentSummaryAmount}>
                {formatRupiah(paymentModalInvoice.amount)}
              </Text>
              <Text style={styles.paymentSummaryTitle}>
                {paymentModalInvoice.title} • {activeStudent?.full_name}
              </Text>
            </View>

            {/* Pilihan Metode Pembayaran */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionLabel}>Metode Pembayaran:</Text>
              <View style={styles.paymentMethodChips}>
                {PAYMENT_METHODS.map((method) => (
                  <Chip
                    key={method.id}
                    label={method.label}
                    selected={selectedPaymentMethod === method.id}
                    onPress={() => setSelectedPaymentMethod(method.id)}
                    accessibilityLabel={`Pilih metode ${method.label}`}
                  />
                ))}
              </View>
            </View>

            {/* Nomor Rekening Tujuan Sandbox */}
            <View style={styles.bankInfoBox}>
              <Text style={styles.bankInfoTitle}>Rekening Tujuan Resmi:</Text>
              <Text style={styles.bankInfoNumber}>Bank Mandiri: 137-00-1234567-8</Text>
              <Text style={styles.bankInfoName}>a.n. SDN Nusantara Harapan</Text>
            </View>

            {/* Input Nomor Referensi Transfer */}
            <Input
              label="Nomor Referensi Transfer / Transaksi"
              placeholder="Contoh: REF-892184 / No Struk"
              value={paymentRef}
              onChangeText={setPaymentRef}
              containerStyle={styles.formGroup}
              accessibilityLabel="Input nomor referensi transfer"
            />

            {/* Catatan / Keterangan Bukti Bayar */}
            <Input
              label="Catatan Pembayaran"
              placeholder="Contoh: Transfer via m-banking a.n. Budi Santoso"
              value={proofNote}
              onChangeText={setProofNote}
              containerStyle={styles.formGroup}
              accessibilityLabel="Input catatan bukti bayar"
            />

            {/* Opsional URL Bukti Bayar */}
            <Input
              label="URL Bukti Transfer (Opsional)"
              placeholder="https://bukti-transfer.demo/foto.jpg"
              value={paymentProofUrl}
              onChangeText={setPaymentProofUrl}
              containerStyle={styles.formGroup}
              accessibilityLabel="Input URL bukti bayar opsional"
            />

            {/* Error Message jika ada */}
            {Boolean(paymentError) && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colors.badge.danger.text}
                />
                <Text style={styles.errorText}>{paymentError}</Text>
              </View>
            )}

            {/* Tombol Kirim Konfirmasi */}
            <View style={styles.modalActionButtons}>
              <Button
                title="Kirim Konfirmasi Pembayaran"
                variant="primary"
                loading={submittingPayment}
                onPress={handleSubmitPayment}
                leftIcon={
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.textInverse}
                  />
                }
                accessibilityLabel="Kirim konfirmasi pembayaran sekarang"
              />
              <Button
                title="Batal"
                variant="secondary"
                onPress={() => setPaymentModalInvoice(null)}
                accessibilityLabel="Batal konfirmasi pembayaran"
              />
            </View>
          </View>
        )}
      </ModalSheet>

      {/* ModalSheet Kuitansi Digital Resmi */}
      <ModalSheet
        visible={Boolean(receiptModalInvoice)}
        onClose={() => setReceiptModalInvoice(null)}
        title="Kuitansi Digital Resmi"
      >
        {receiptModalInvoice && (
          <View style={styles.receiptContainer}>
            {/* Header Sekolah Kuitansi */}
            <View style={styles.receiptHeader}>
              <View style={styles.schoolBadgeSmall}>
                <Ionicons name="school" size={20} color={colors.primary} />
                <Text style={styles.schoolBadgeText}>SDN Nusantara Harapan</Text>
              </View>
              <Text style={styles.receiptMainTitle}>BUKTI PEMBAYARAN RESMI</Text>
              <Text style={styles.receiptNo}>
                No: {receiptModalInvoice.receipt_no || `KWT-${receiptModalInvoice.id.slice(-6).toUpperCase()}`}
              </Text>
              <View style={styles.statusPaidBadge}>
                <Badge label="LUNAS & TERVERIFIKASI" variant="success" />
              </View>
            </View>

            <View style={styles.receiptDivider} />

            {/* Rincian Kuitansi */}
            <View style={styles.receiptGrid}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Nama Siswa</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.student_name || activeStudent?.full_name || "-"}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Kelas</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.class_name || activeStudent?.class_name || "Kelas 4A"}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Uraian Pembayaran</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.title}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Jumlah Dibayar</Text>
                <Text style={[styles.receiptFieldValue, styles.receiptAmount]}>
                  {formatRupiah(receiptModalInvoice.amount)}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Metode Pembayaran</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.payment_method || "Transfer Bank"}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Nomor Referensi</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.payment_ref || "-"}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Tanggal Verifikasi</Text>
                <Text style={styles.receiptFieldValue}>
                  {formatTanggalId(
                    receiptModalInvoice.verified_at ||
                      receiptModalInvoice.paid_at ||
                      receiptModalInvoice.created_at,
                    { includeDay: true }
                  )}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Petugas Verifikator</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.verified_by || "Admin Tata Usaha"}
                </Text>
              </View>
            </View>

            <View style={styles.receiptNoticeBox}>
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.receiptNoticeText}>
                Kuitansi digital ini merupakan bukti pembayaran sah yang dikeluarkan oleh sistem informasi SDN Nusantara Harapan.
              </Text>
            </View>

            <Button
              title="Tutup Kuitansi"
              variant="secondary"
              onPress={() => setReceiptModalInvoice(null)}
              accessibilityLabel="Tutup kuitansi digital"
            />
          </View>
        )}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  childSwitcherStyle: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryPressed,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitleCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: typography.size.xs,
    color: "#D1FAE5",
    fontWeight: typography.weight.medium,
  },
  summaryStudentName: {
    fontSize: typography.size.sm,
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
  },
  summaryAmount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.heavy,
    color: colors.textInverse,
    fontVariant: ["tabular-nums"],
    marginVertical: spacing.xs,
  },
  summaryFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  summaryFooterText: {
    fontSize: typography.size.xs,
    color: "#E2E8F0",
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterScroll: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
  },
  invoiceList: {
    paddingBottom: spacing.xxxl,
  },
  invoiceCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  invoiceTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  invoiceTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  invoiceStudentClass: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceDescription: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.sm,
  },
  invoiceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  detailCol: {
    flex: 1,
  },
  detailColRight: {
    alignItems: "flex-end",
  },
  detailLabel: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  detailDate: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  actionRow: {
    marginTop: spacing.xs,
  },
  waitingNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.warning.bg,
    borderColor: colors.badge.warning.border,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  waitingNoticeText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.badge.warning.text,
    lineHeight: 18,
  },

  // Modal Pembayaran
  modalBody: {
    paddingBottom: spacing.xxl,
  },
  paymentSummaryCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  paymentSummaryLabel: {
    fontSize: typography.size.xs,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  paymentSummaryAmount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.heavy,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    marginVertical: 4,
  },
  paymentSummaryTitle: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  formSection: {
    marginBottom: spacing.md,
  },
  formSectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  paymentMethodChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  bankInfoBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankInfoTitle: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bankInfoNumber: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bankInfoName: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.badge.danger.bg,
    borderColor: colors.badge.danger.border,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.badge.danger.text,
  },
  modalActionButtons: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // Modal Kuitansi
  receiptContainer: {
    paddingBottom: spacing.xxl,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  schoolBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  schoolBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  receiptMainTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.heavy,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  receiptNo: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  statusPaidBadge: {
    marginTop: spacing.sm,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  receiptGrid: {
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm + 2,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  receiptFieldLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  receiptFieldValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  receiptAmount: {
    color: colors.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  receiptNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: "#BBF7D0",
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  receiptNoticeText: {
    flex: 1,
    fontSize: typography.size.xs,
    color: colors.primary,
    lineHeight: 18,
  },
});
