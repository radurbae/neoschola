import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  Label,
  Sheet,
  Alert,
  Separator,
  ChildSwitcher,
  StateView,
} from "../../components/ui";
import type { BadgeVariant } from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  shadcn,
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

  // Sheet Pembayaran Sandbox
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

  // Sheet Kuitansi Digital
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
        return { label: "Belum Dibayar", variant: "destructive" };
      case "WAITING_VERIFICATION":
        return { label: "Menunggu Verifikasi", variant: "warning" };
      case "PAID":
        return { label: "Lunas", variant: "success" };
      case "OVERDUE":
        return { label: "Jatuh Tempo", variant: "destructive" };
      case "REJECTED":
        return { label: "Ditolak", variant: "destructive" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPaymentModalInvoice(invoice);
    setSelectedPaymentMethod("TRANSFER_BANK");
    // Generate nomor mock ref untuk pengujian sandbox
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
      // Refresh daftar tagihan
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

      {/* 1 Card Hero Ringkasan Total Tagihan Belum Lunas (Minimalis & Elegan) */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroLabel}>Total Tagihan Belum Lunas</Text>
            <Text style={styles.heroStudentName}>
              {activeStudent?.full_name || "Semua Siswa"}
            </Text>
          </View>
          <Badge
            label={
              filterCounts.BELUM_LUNAS > 0
                ? `${filterCounts.BELUM_LUNAS} Tagihan`
                : "Semua Lunas"
            }
            variant={filterCounts.BELUM_LUNAS > 0 ? "outline" : "secondary"}
          />
        </View>

        <Text style={styles.heroAmount}>
          {formatRupiah(totalUnpaidAmount)}
        </Text>

        <Separator style={styles.heroSeparator} />

        <View style={styles.heroFooterRow}>
          <Ionicons
            name={
              filterCounts.BELUM_LUNAS > 0
                ? "alert-circle-outline"
                : "checkmark-circle-outline"
            }
            size={16}
            color={
              filterCounts.BELUM_LUNAS > 0
                ? shadcn.mutedForeground
                : shadcn.status.success.text
            }
          />
          <Text style={styles.heroFooterText}>
            {filterCounts.BELUM_LUNAS > 0
              ? `${filterCounts.BELUM_LUNAS} tagihan memerlukan pelunasan`
              : "Seluruh kewajiban pembayaran telah lunas"}
          </Text>
        </View>
      </Card>

      {/* Filter Status Chip Horizontal */}
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
                        {invoice.student_name} - {invoice.class_name || "Siswa"}
                      </Text>
                    )}
                  </View>
                  <Badge
                    label={statusBadge.label}
                    variant={statusBadge.variant}
                  />
                </View>

                {/* Deskripsi Tagihan */}
                {Boolean(invoice.description) && (
                  <Text style={styles.invoiceDescription}>
                    {invoice.description}
                  </Text>
                )}

                {/* Info Nominal & Jatuh Tempo */}
                <View style={styles.invoiceDetailBox}>
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

                <Separator style={styles.cardSeparator} />

                {/* Tombol Aksi */}
                <View style={styles.actionRow}>
                  {isPayable && (
                    <Button
                      title="Bayar / Konfirmasi"
                      variant="default"
                      onPress={() => handleOpenPaymentModal(invoice)}
                      leftIcon={
                        <Ionicons
                          name="card-outline"
                          size={18}
                          color={shadcn.primaryForeground}
                        />
                      }
                      accessibilityLabel={`Bayar tagihan ${invoice.title} sejumlah ${formatRupiah(
                        invoice.amount
                      )}`}
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
                          color={shadcn.foreground}
                        />
                      }
                      accessibilityLabel={`Buka kuitansi resmi untuk ${invoice.title}`}
                    />
                  )}

                  {invoice.status === "WAITING_VERIFICATION" && (
                    <Alert
                      variant="warning"
                      title="Menunggu Verifikasi"
                      description="Bukti pembayaran telah dikirim dan sedang diverifikasi oleh staf tata usaha."
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Sheet Konfirmasi Pembayaran Sandbox */}
      <Sheet
        visible={Boolean(paymentModalInvoice)}
        onClose={() => setPaymentModalInvoice(null)}
        title="Konfirmasi Pembayaran (Uji Coba)"
      >
        {paymentModalInvoice && (
          <View style={styles.sheetBody}>
            {/* Ringkasan Tagihan */}
            <View style={styles.paymentSummaryCard}>
              <Text style={styles.paymentSummaryLabel}>
                Total Yang Harus Dibayar
              </Text>
              <Text style={styles.paymentSummaryAmount}>
                {formatRupiah(paymentModalInvoice.amount)}
              </Text>
              <Text style={styles.paymentSummaryTitle}>
                {paymentModalInvoice.title} - {activeStudent?.full_name}
              </Text>
            </View>

            <Separator style={styles.sheetSeparator} />

            {/* Pilihan Metode Pembayaran */}
            <View style={styles.formSection}>
              <Label required>Metode Pembayaran</Label>
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

            {/* Rekening Tujuan Sandbox */}
            <View style={styles.bankInfoBox}>
              <Text style={styles.bankInfoTitle}>Rekening Tujuan Resmi:</Text>
              <Text style={styles.bankInfoNumber}>
                Bank Mandiri: 137-00-1234567-8
              </Text>
              <Text style={styles.bankInfoName}>
                a.n. SDN Nusantara Harapan
              </Text>
            </View>

            <Separator style={styles.sheetSeparator} />

            {/* Input Nomor Referensi Transfer */}
            <View style={styles.formGroup}>
              <Label required>Nomor Referensi Transfer / Transaksi</Label>
              <Input
                placeholder="Contoh: REF-892184 / No Struk"
                value={paymentRef}
                onChangeText={setPaymentRef}
                accessibilityLabel="Input nomor referensi transfer"
              />
            </View>

            {/* Catatan / Keterangan Bukti Bayar */}
            <View style={styles.formGroup}>
              <Label>Catatan Pembayaran</Label>
              <Input
                placeholder="Contoh: Transfer via m-banking a.n. Budi Santoso"
                value={proofNote}
                onChangeText={setProofNote}
                accessibilityLabel="Input catatan bukti bayar"
              />
            </View>

            {/* Opsional URL Bukti Bayar */}
            <View style={styles.formGroup}>
              <Label>URL Bukti Transfer (Opsional)</Label>
              <Input
                placeholder="https://bukti-transfer.demo/foto.jpg"
                value={paymentProofUrl}
                onChangeText={setPaymentProofUrl}
                accessibilityLabel="Input URL bukti transfer opsional"
              />
            </View>

            {/* Alert Error jika ada */}
            {Boolean(paymentError) && (
              <Alert
                variant="destructive"
                title="Kendala Pembayaran"
                description={paymentError || ""}
                style={styles.formAlert}
              />
            )}

            <Separator style={styles.sheetSeparator} />

            {/* Tombol Kirim Konfirmasi */}
            <View style={styles.sheetActionButtons}>
              <Button
                title="Kirim Konfirmasi Pembayaran"
                variant="default"
                loading={submittingPayment}
                onPress={handleSubmitPayment}
                leftIcon={
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={shadcn.primaryForeground}
                  />
                }
                accessibilityLabel="Kirim konfirmasi pembayaran sekarang"
              />
              <Button
                title="Batal"
                variant="outline"
                onPress={() => setPaymentModalInvoice(null)}
                accessibilityLabel="Batal konfirmasi pembayaran"
              />
            </View>
          </View>
        )}
      </Sheet>

      {/* Sheet Kuitansi Digital Resmi Bergaya Dokumen/Struk Editorial */}
      <Sheet
        visible={Boolean(receiptModalInvoice)}
        onClose={() => setReceiptModalInvoice(null)}
        title="Kuitansi Digital Resmi"
      >
        {receiptModalInvoice && (
          <View style={styles.receiptContainer}>
            {/* Header Dokumen Kuitansi */}
            <View style={styles.receiptHeader}>
              <View style={styles.schoolBadgeSmall}>
                <Ionicons name="school-outline" size={18} color={shadcn.foreground} />
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

            <Separator style={styles.receiptSeparator} />

            {/* Rincian Kuitansi Bergaya Struk Dokumen */}
            <View style={styles.receiptGrid}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Nama Siswa</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.student_name || activeStudent?.full_name || "-"}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Kelas</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.class_name || activeStudent?.class_name || "Kelas 4A"}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Uraian Pembayaran</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.title}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Jumlah Dibayar</Text>
                <Text style={[styles.receiptFieldValue, styles.receiptAmount]}>
                  {formatRupiah(receiptModalInvoice.amount)}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Metode Pembayaran</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.payment_method || "Transfer Bank"}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Nomor Referensi</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.payment_ref || "-"}
                </Text>
              </View>
              <Separator style={styles.rowSeparator} />

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
              <Separator style={styles.rowSeparator} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptFieldLabel}>Petugas Verifikator</Text>
                <Text style={styles.receiptFieldValue}>
                  {receiptModalInvoice.verified_by || "Admin Tata Usaha"}
                </Text>
              </View>
            </View>

            <Separator style={styles.receiptSeparator} />

            {/* Catatan Dokumen Resmi */}
            <Alert
              variant="default"
              title="Keabsahan Dokumen"
              description="Kuitansi digital ini merupakan bukti pembayaran sah yang dikeluarkan oleh sistem informasi SDN Nusantara Harapan."
              icon={
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={shadcn.foreground}
                />
              }
              style={styles.receiptAlert}
            />

            <Button
              title="Tutup Kuitansi"
              variant="outline"
              onPress={() => setReceiptModalInvoice(null)}
              accessibilityLabel="Tutup kuitansi digital"
            />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  childSwitcherStyle: {
    marginBottom: spacing.md,
  },
  // Hero Card Ringkasan Total Tagihan: Minimalis & Elegan
  heroCard: {
    backgroundColor: shadcn.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  heroTextCol: {
    flex: 1,
  },
  heroLabel: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
  },
  heroStudentName: {
    fontSize: typography.size.sm,
    color: shadcn.foreground,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginVertical: spacing.xs,
    letterSpacing: typography.tracking.tight,
  },
  heroSeparator: {
    marginVertical: spacing.sm,
  },
  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heroFooterText: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
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
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  invoiceStudentClass: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  invoiceDescription: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.sm,
  },
  invoiceDetailBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
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
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  detailAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  detailDate: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  cardSeparator: {
    marginVertical: spacing.sm,
  },
  actionRow: {
    marginTop: spacing.xs,
  },

  // Sheet Pembayaran Styles
  sheetBody: {
    paddingBottom: spacing.xxl,
  },
  paymentSummaryCard: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
    alignItems: "center",
  },
  paymentSummaryLabel: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    fontWeight: typography.weight.medium,
  },
  paymentSummaryAmount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginVertical: 4,
    letterSpacing: typography.tracking.tight,
  },
  paymentSummaryTitle: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
  },
  sheetSeparator: {
    marginVertical: spacing.md,
  },
  formSection: {
    marginBottom: spacing.xs,
  },
  paymentMethodChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bankInfoBox: {
    backgroundColor: shadcn.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bankInfoTitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  bankInfoNumber: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  bankInfoName: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formAlert: {
    marginBottom: spacing.md,
  },
  sheetActionButtons: {
    gap: spacing.sm,
  },

  // Sheet Kuitansi Styles
  receiptContainer: {
    paddingBottom: spacing.xxl,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  schoolBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  schoolBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  receiptMainTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: 0.5,
  },
  receiptNo: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  statusPaidBadge: {
    marginTop: spacing.sm,
  },
  receiptSeparator: {
    marginVertical: spacing.md,
  },
  receiptGrid: {
    backgroundColor: shadcn.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    padding: spacing.md,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.xs,
    minHeight: touchTarget.minHeight - 10,
  },
  rowSeparator: {
    marginVertical: spacing.xs,
  },
  receiptFieldLabel: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    flex: 1,
  },
  receiptFieldValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    flex: 1,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  receiptAmount: {
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  receiptAlert: {
    marginBottom: spacing.md,
  },
});
