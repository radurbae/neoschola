import { describe, expect, it } from "bun:test";
import {
  formatRupiah,
  formatTanggalId,
  LoginRequestSchema,
  CreateLeaveRequestSchema,
  SubmitPaymentRequestSchema,
  VerifyInvoiceRequestSchema,
} from "../src/index";

describe("Shared Utilities & Zod Schemas Unit Tests", () => {
  // ==========================================
  // 1. formatRupiah
  // ==========================================
  describe("formatRupiah", () => {
    it("memformat 0 dengan benar", () => {
      const result = formatRupiah(0);
      expect(result).toMatch(/Rp\s*0/);
    });

    it("memformat 250000 dengan benar", () => {
      const result = formatRupiah(250000);
      expect(result).toMatch(/Rp\s*250\.000/);
    });

    it("memformat 1500000 dengan benar", () => {
      const result = formatRupiah(1500000);
      expect(result).toMatch(/Rp\s*1\.500\.000/);
    });

    it("membulatkan angka desimal ke bilangan bulat terdekat", () => {
      const resultRoundDown = formatRupiah(250000.4);
      expect(resultRoundDown).toMatch(/Rp\s*250\.000/);

      const resultRoundUp = formatRupiah(250000.6);
      expect(resultRoundUp).toMatch(/Rp\s*250\.001/);
    });
  });

  // ==========================================
  // 2. formatTanggalId
  // ==========================================
  describe("formatTanggalId", () => {
    it("memformat tanggal ISO normal", () => {
      // 2026-11-20
      const formatted = formatTanggalId("2026-11-20");
      expect(formatted).toBe("20 November 2026");
    });

    it("memformat dengan opsi includeDay: true", () => {
      // 2026-11-20 adalah hari Jumat
      const formatted = formatTanggalId("2026-11-20T08:00:00Z", {
        includeDay: true,
      });
      expect(formatted).toMatch(/Jumat,\s*20\s*November\s*2026/);
    });

    it("memformat dengan opsi shortMonth: true", () => {
      const formatted = formatTanggalId("2026-11-20", { shortMonth: true });
      expect(formatted).toBe("20 Nov 2026");
    });

    it("mengembalikan '-' jika string tanggal kosong (\"\")", () => {
      expect(formatTanggalId("")).toBe("-");
    });

    it("mengembalikan string aslinya jika string invalid", () => {
      expect(formatTanggalId("bukan-tanggal")).toBe("bukan-tanggal");
    });
  });

  // ==========================================
  // 3. Skema Zod
  // ==========================================
  describe("Zod Schemas", () => {
    describe("LoginRequestSchema", () => {
      it("lolos dengan data valid", () => {
        const validData = {
          email: "wali.budi@neoschola.demo",
          password: "neoschola123",
        };
        const parsed = LoginRequestSchema.safeParse(validData);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.email).toBe(validData.email);
        }
      });

      it("gagal bila format email invalid", () => {
        const invalidData = {
          email: "bukan-email",
          password: "neoschola123",
        };
        const parsed = LoginRequestSchema.safeParse(invalidData);
        expect(parsed.success).toBe(false);
      });

      it("gagal bila password terlalu pendek (< 6 karakter)", () => {
        const invalidData = {
          email: "wali.budi@neoschola.demo",
          password: "12345",
        };
        const parsed = LoginRequestSchema.safeParse(invalidData);
        expect(parsed.success).toBe(false);
      });
    });

    describe("CreateLeaveRequestSchema", () => {
      it("lolos dengan data pengajuan izin valid", () => {
        const validData = {
          student_id: "std_raka",
          leave_type: "IZIN",
          start_date: "2026-11-24",
          end_date: "2026-11-25",
          reason: "Acara keluarga di luar kota",
        };
        const parsed = CreateLeaveRequestSchema.safeParse(validData);
        expect(parsed.success).toBe(true);
      });

      it("gagal jika reason kurang dari 3 karakter", () => {
        const invalidData = {
          student_id: "std_raka",
          leave_type: "IZIN",
          start_date: "2026-11-24",
          end_date: "2026-11-25",
          reason: "ok",
        };
        const parsed = CreateLeaveRequestSchema.safeParse(invalidData);
        expect(parsed.success).toBe(false);
      });

      it("gagal jika leave_type bukan SAKIT atau IZIN", () => {
        const invalidData = {
          student_id: "std_raka",
          leave_type: "LIBUR",
          start_date: "2026-11-24",
          end_date: "2026-11-25",
          reason: "Liburan sekolah",
        };
        const parsed = CreateLeaveRequestSchema.safeParse(invalidData);
        expect(parsed.success).toBe(false);
      });
    });

    describe("SubmitPaymentRequestSchema", () => {
      it("lolos hanya dengan payment_ref", () => {
        const data = {
          payment_ref: "TRF-E2E-001",
        };
        const parsed = SubmitPaymentRequestSchema.safeParse(data);
        expect(parsed.success).toBe(true);
      });

      it("lolos dengan proof_note atau payment_proof_url", () => {
        const withNote = SubmitPaymentRequestSchema.safeParse({
          proof_note: "Transfer via ATM Mandiri",
        });
        expect(withNote.success).toBe(true);

        const withUrl = SubmitPaymentRequestSchema.safeParse({
          payment_proof_url: "https://example.com/bukti.jpg",
        });
        expect(withUrl.success).toBe(true);
      });

      it("gagal bila semua field bukti kosong", () => {
        const emptyData = {};
        const parsed = SubmitPaymentRequestSchema.safeParse(emptyData);
        expect(parsed.success).toBe(false);

        const allWhitespace = {
          payment_ref: "   ",
          proof_note: "   ",
          payment_proof_url: "   ",
        };
        const parsedWhitespace = SubmitPaymentRequestSchema.safeParse(allWhitespace);
        expect(parsedWhitespace.success).toBe(false);
      });
    });

    describe("VerifyInvoiceRequestSchema", () => {
      it("lolos dengan status PAID atau REJECTED", () => {
        const paid = VerifyInvoiceRequestSchema.safeParse({
          status: "PAID",
          notes: "Dana masuk sesuai rek koran",
        });
        expect(paid.success).toBe(true);

        const rejected = VerifyInvoiceRequestSchema.safeParse({
          status: "REJECTED",
          notes: "Bukti transfer tidak terbaca",
        });
        expect(rejected.success).toBe(true);
      });

      it("gagal jika status tidak valid", () => {
        const invalid = VerifyInvoiceRequestSchema.safeParse({
          status: "PENDING",
        });
        expect(invalid.success).toBe(false);
      });
    });
  });
});
