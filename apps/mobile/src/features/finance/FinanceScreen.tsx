import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatTanggalId, formatRupiah } from "@neoschola/shared";
import type { Invoice, InvoiceStatus } from "@neoschola/shared";
import {
  Screen,
  TopUtilityBar,
  PastelStatCard,
  DarkIconRow,
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
  bento,
  breakpoints,
  layout,
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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const responsiveHorizontalPadding = isTablet
    ? layout.tabletPaddingX
    : layout.mobilePaddingX;

  const {
    user,
    students,
    activeStudentId,
    activeStudent,
    setActiveStudentId,
    unreadNotificationCount,
  } = useAuth();

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
    <Screen scroll={false} headerShown={false}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[
          styles.screenScrollContent,
          {
            paddingHorizontal: responsiveHorizontalPadding,
            paddingTop: isTablet ? 8 : 4,
            paddingBottom: isTablet
              ? layout.scrollBottomPad
              : layout.mobileDockClearance,
            gap: layout.sectionGap,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInvoices(true)}
            tintColor={shadcn.primary}
            colors={[shadcn.primary]}
          />
        }
      >
        <View style={styles.headerBlock}>
          {/* TopUtilityBar ("Keuangan") menyatu di aliran scroll */}
          <TopUtilityBar
            noHorizontalPadding
            title="Keuangan"
            subtitle="Pengelolaan tagihan dan kuitansi siswa"
            profileName={user?.name || "Wali Murid"}
            unreadCount={unreadNotificationCount}
            onPressAnnouncements={() => router.push("/pengumuman")}
            onPressNotifications={() => router.push("/notifications")}
            onPressProfile={() => router.push("/(tabs)/profil")}
          />

          {/* Pemilih Anak Asuh */}
          {students.length > 0 && (
            <ChildSwitcher
              students={students}
              activeStudentId={activeStudentId}
              onSelectStudent={setActiveStudentId}
              style={styles.childSwitcherStyle}
            />
          )}
        </View>

        {/* Bento Row Atas (Tablet: 2 kolom sejajar, Mobile: bertumpuk) */}
        <View style={[styles.bentoRow, isTablet && styles.bentoRowTablet]}>
          {/* Kartu Hero Soft Ice Blue: Total Tagihan Aktif */}
          <View style={[styles.heroCard, isTablet && styles.heroCardTablet]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroEyebrow}>Total Tagihan Aktif</Text>
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
                variant={filterCounts.BELUM_LUNAS > 0 ? "warning" : "success"}
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
                    ? bento.butterText
                    : bento.mintText
                }
              />
              <Text style={styles.heroFooterText}>
                {filterCounts.BELUM_LUNAS > 0
                  ? `${filterCounts.BELUM_LUNAS} tagihan memerlukan penyelesaian`
                  : "Seluruh kewajiban pembayaran telah lunas"}
              </Text>
            </View>
          </View>

          {/* 2 PastelStatCard: Mint Lunas & Butter Menunggu Verifikasi */}
          <View style={[styles.statsGroup, isTablet && styles.statsGroupTablet]}>
            <PastelStatCard
              tone="mint"
              value={String(filterCounts.LUNAS)}
              label="Tagihan Lunas"
              trendText="Terverifikasi"
              icon="checkmark-circle-outline"
              style={styles.statCardItem}
            />
            <PastelStatCard
              tone="butter"
              value={String(filterCounts.MENUNGGU_VERIFIKASI)}
              label="Menunggu Verifikasi"
              trendText="Dalam Proses"
              icon="time-outline"
              style={styles.statCardItem}
            />
          </View>
        </View>

        {/* Filter Status Chip Horizontal (Aman di 360px) */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="normal"
            bounces={true}
            contentContainerStyle={styles.filterScroll}
          >
            <Chip
              label="Semua"
              count={filterCounts.SEMUA}
              selected={selectedFilter === "SEMUA"}
              onPress={() => setSelectedFilter("SEMUA")}
              accessibilityLabel={`Semua tagihan, ${filterCounts.SEMUA} tagihan`}
            />
            <Chip
              label="Belum Lunas"
              count={filterCounts.BELUM_LUNAS}
              selected={selectedFilter === "BELUM_LUNAS"}
              onPress={() => setSelectedFilter("BELUM_LUNAS")}
              accessibilityLabel={`Tagihan belum lunas, ${filterCounts.BELUM_LUNAS} tagihan`}
            />
            <Chip
              label="Menunggu Verifikasi"
              count={filterCounts.MENUNGGU_VERIFIKASI}
              selected={selectedFilter === "MENUNGGU_VERIFIKASI"}
              onPress={() => setSelectedFilter("MENUNGGU_VERIFIKASI")}
              accessibilityLabel={`Tagihan menunggu verifikasi, ${filterCounts.MENUNGGU_VERIFIKASI} tagihan`}
            />
            <Chip
              label="Lunas"
              count={filterCounts.LUNAS}
              selected={selectedFilter === "LUNAS"}
              onPress={() => setSelectedFilter("LUNAS")}
              accessibilityLabel={`Tagihan lunas, ${filterCounts.LUNAS} tagihan`}
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
              const isWaiting = invoice.status === "WAITING_VERIFICATION";

              return (
                <Card key={invoice.id} style={styles.invoiceCard}>
                  {/* Item Tagihan dengan DarkIconRow */}
                  <DarkIconRow
                    icon={isPaid ? "receipt-outline" : "card-outline"}
                    title={invoice.title}
                    subtitle={`${invoice.student_name || activeStudent?.full_name || "Siswa"} • Jatuh Tempo: ${formatTanggalId(invoice.due_date, { includeDay: true })}`}
                    rightPrimary={formatRupiah(invoice.amount)}
                    rightSecondary={statusBadge.label}
                    rightSecondaryTone={
                      isPaid
                        ? "success"
                        : isWaiting
                        ? "warning"
                        : "danger"
                    }
                  />

                  {/* Deskripsi Tagihan */}
                  {Boolean(invoice.description) && (
                    <Text style={styles.invoiceDescription}>
                      {invoice.description}
                    </Text>
                  )}

                  {/* Tombol Aksi Dipisah Separator */}
                  {(isPayable || isPaid || isWaiting) && (
                    <>
                      <Separator style={styles.cardSeparator} />
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

                        {isWaiting && (
                          <Alert
                            variant="warning"
                            title="Menunggu Verifikasi"
                            description="Bukti pembayaran telah dikirim dan sedang diverifikasi oleh staf tata usaha."
                          />
                        )}
                      </View>
                    </>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

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

      {/* Sheet Kuitansi Digital Resmi Bergaya Editorial Rapi */}
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

            {/* Rincian Kuitansi Bergaya Struk Dokumen Editorial */}
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
  screenScroll: {
    flex: 1,
    backgroundColor: bento.surface,
  },
  screenScrollContent: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: 12,
  },
  childSwitcherStyle: {},

  bentoRow: {
    gap: spacing.md,
  },
  bentoRowTablet: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 20,
  },

  heroCard: {
    backgroundColor: bento.iceBlue,
    borderRadius: radius.xxl,
    padding: layout.heroPadding,
    justifyContent: "space-between",
  },
  heroCardTablet: {
    flex: 1.15,
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
  heroEyebrow: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.medium,
    color: bento.pastelMutedText,
    fontWeight: typography.weight.medium,
  },
  heroStudentName: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.semibold,
    color: shadcn.foreground,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: typography.size.xxxl,
    fontFamily: typography.family.bold,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginVertical: spacing.xs,
    letterSpacing: typography.tracking.tight,
  },
  heroSeparator: {
    marginVertical: spacing.sm,
    backgroundColor: bento.iceBlueBar,
  },
  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heroFooterText: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
    color: bento.pastelMutedText,
    flexShrink: 1,
  },

  statsGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  statsGroupTablet: {
    flex: 1.25,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  statCardItem: {
    flex: 1,
    alignSelf: "stretch",
  },

  filterSection: {},
  filterScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },

  invoiceList: {
    gap: spacing.md,
  },
  invoiceCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: shadcn.border,
    backgroundColor: shadcn.card,
  },
  invoiceDescription: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
    lineHeight: typography.lineHeight.sm,
  },
  cardSeparator: {
    marginVertical: spacing.sm,
  },
  actionRow: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },

  // Sheet Pembayaran Styles
  sheetBody: {
    paddingBottom: spacing.xxl,
  },
  paymentSummaryCard: {
    backgroundColor: bento.iceBlue,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  paymentSummaryLabel: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.medium,
    color: bento.pastelMutedText,
    fontWeight: typography.weight.medium,
  },
  paymentSummaryAmount: {
    fontSize: typography.size.xxl,
    fontFamily: typography.family.bold,
    fontWeight: typography.weight.bold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
    marginVertical: 4,
    letterSpacing: typography.tracking.tight,
  },
  paymentSummaryTitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.medium,
    color: shadcn.foreground,
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
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    marginBottom: 2,
  },
  bankInfoNumber: {
    fontSize: typography.size.base,
    fontFamily: typography.family.semibold,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    fontVariant: ["tabular-nums"],
  },
  bankInfoName: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.semibold,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  receiptMainTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.family.semibold,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: 0.5,
  },
  receiptNo: {
    fontSize: typography.size.xs,
    fontFamily: typography.family.regular,
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
    fontFamily: typography.family.regular,
    color: shadcn.mutedForeground,
    flex: 1,
  },
  receiptFieldValue: {
    fontSize: typography.size.sm,
    fontFamily: typography.family.medium,
    fontWeight: typography.weight.medium,
    color: shadcn.foreground,
    flex: 1,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  receiptAmount: {
    fontFamily: typography.family.semibold,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
  },
  receiptAlert: {
    marginBottom: spacing.md,
  },
});
