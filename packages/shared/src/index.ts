import { z } from "zod";

// ==========================================
// 1. Enums & Core Constants
// ==========================================

export const Role = {
  GUARDIAN: "GUARDIAN",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const RoleSchema = z.nativeEnum(Role);

export const AttendanceStatus = {
  HADIR: "HADIR",
  SAKIT: "SAKIT",
  IZIN: "IZIN",
  ALPA: "ALPA",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];
export const AttendanceStatusSchema = z.nativeEnum(AttendanceStatus);

export const LeaveType = {
  SAKIT: "SAKIT",
  IZIN: "IZIN",
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];
export const LeaveTypeSchema = z.nativeEnum(LeaveType);

export const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];
export const LeaveStatusSchema = z.nativeEnum(LeaveStatus);

export const AnnouncementCategory = {
  DARURAT: "DARURAT",
  SEKOLAH: "SEKOLAH",
  KELAS: "KELAS",
  KEGIATAN: "KEGIATAN",
} as const;
export type AnnouncementCategory = (typeof AnnouncementCategory)[keyof typeof AnnouncementCategory];
export const AnnouncementCategorySchema = z.nativeEnum(AnnouncementCategory);

export const InvoiceStatus = {
  UNPAID: "UNPAID",
  WAITING_VERIFICATION: "WAITING_VERIFICATION",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  REJECTED: "REJECTED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];
export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus);

export const DayOfWeek = {
  SENIN: "SENIN",
  SELASA: "SELASA",
  RABU: "RABU",
  KAMIS: "KAMIS",
  JUMAT: "JUMAT",
  SABTU: "SABTU",
} as const;
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];
export const DayOfWeekSchema = z.nativeEnum(DayOfWeek);

export const NotificationType = {
  PRESENSI: "PRESENSI",
  IZIN: "IZIN",
  PENGUMUMAN: "PENGUMUMAN",
  PESAN: "PESAN",
  TAGIHAN: "TAGIHAN",
  AKADEMIK: "AKADEMIK",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NotificationTypeSchema = z.nativeEnum(NotificationType);

// ==========================================
// 2. Base Entity Schemas
// ==========================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade_level: z.number().int(),
  academic_year: z.string(),
  homeroom_teacher_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type Class = z.infer<typeof ClassSchema>;

export const StudentSchema = z.object({
  id: z.string(),
  nis: z.string(),
  nisn: z.string(),
  full_name: z.string(),
  nickname: z.string(),
  class_id: z.string(),
  class_name: z.string().optional(),
  gender: z.enum(["L", "P"]),
  birth_date: z.string(),
  is_active: z.boolean(),
  created_at: z.string().optional(),
});
export type Student = z.infer<typeof StudentSchema>;

export const GuardianStudentSchema = z.object({
  id: z.string(),
  guardian_id: z.string(),
  student_id: z.string(),
  relationship: z.string(),
  is_primary: z.boolean(),
  created_at: z.string().optional(),
});
export type GuardianStudent = z.infer<typeof GuardianStudentSchema>;

export const AttendanceSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  class_id: z.string(),
  date: z.string(),
  status: AttendanceStatusSchema,
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recorded_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type Attendance = z.infer<typeof AttendanceSchema>;

export const LeaveRequestSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  guardian_id: z.string(),
  leave_type: LeaveTypeSchema,
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string(),
  attachment_url: z.string().nullable().optional(),
  status: LeaveStatusSchema,
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  review_notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  student_name: z.string().optional(),
  class_name: z.string().optional(),
  guardian_name: z.string().optional(),
});
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const ScheduleSchema = z.object({
  id: z.string(),
  class_id: z.string(),
  day_of_week: DayOfWeekSchema,
  start_time: z.string(),
  end_time: z.string(),
  subject: z.string(),
  teacher_name: z.string(),
  room: z.string(),
  created_at: z.string().optional(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const AssignmentSchema = z.object({
  id: z.string(),
  class_id: z.string(),
  title: z.string(),
  description: z.string(),
  subject: z.string(),
  due_date: z.string(),
  assigned_by: z.string(),
  created_at: z.string().optional(),
  assigned_by_name: z.string().optional(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const GradeNoteSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  subject: z.string(),
  semester: z.number().int(),
  academic_year: z.string(),
  score: z.number(),
  notes: z.string().nullable().optional(),
  teacher_id: z.string(),
  created_at: z.string().optional(),
  teacher_name: z.string().optional(),
});
export type GradeNote = z.infer<typeof GradeNoteSchema>;

export const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: AnnouncementCategorySchema,
  target_role: z.enum(["ALL", "GUARDIAN", "TEACHER"]),
  class_id: z.string().nullable().optional(),
  class_name: z.string().nullable().optional(),
  is_pinned: z.boolean(),
  created_by: z.string(),
  created_by_name: z.string().optional(),
  created_at: z.string(),
  is_read: z.boolean().optional(),
});
export type Announcement = z.infer<typeof AnnouncementSchema>;

export const MessageThreadSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  guardian_id: z.string(),
  teacher_id: z.string(),
  subject: z.string(),
  last_message_at: z.string(),
  created_at: z.string(),
  student_name: z.string().optional(),
  guardian_name: z.string().optional(),
  teacher_name: z.string().optional(),
  unread_count: z.number().int().optional(),
  last_message: z.string().optional(),
});
export type MessageThread = z.infer<typeof MessageThreadSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  sender_id: z.string(),
  sender_name: z.string().optional(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  student_name: z.string().optional(),
  class_name: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  due_date: z.string(),
  status: InvoiceStatusSchema,
  payment_method: z.string().nullable().optional(),
  payment_ref: z.string().nullable().optional(),
  proof_note: z.string().nullable().optional(),
  payment_proof_url: z.string().nullable().optional(),
  receipt_no: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  verified_by: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  body: z.string(),
  type: NotificationTypeSchema,
  reference_id: z.string().nullable().optional(),
  is_read: z.boolean(),
  created_at: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ==========================================
// 3. API Request & Response DTOs
// ==========================================

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Auth
export const LoginRequestSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z.object({
  user: UserSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// Dashboard
export const StudentDashboardResponseSchema = z.object({
  student: StudentSchema,
  attendance_today: z
    .object({
      status: AttendanceStatusSchema,
      check_in_time: z.string().nullable().optional(),
      check_out_time: z.string().nullable().optional(),
    })
    .nullable(),
  attendance_summary: z.object({
    hadir: z.number().int(),
    sakit: z.number().int(),
    izin: z.number().int(),
    alpa: z.number().int(),
    percentage: z.number(),
  }),
  schedules_today: z.array(ScheduleSchema),
  assignments_active: z.array(AssignmentSchema),
  unread_announcements_count: z.number().int(),
  unpaid_invoices_count: z.number().int(),
});
export type StudentDashboardResponse = z.infer<typeof StudentDashboardResponseSchema>;

// Attendance
export const BulkAttendanceItemSchema = z.object({
  student_id: z.string(),
  status: AttendanceStatusSchema,
  notes: z.string().optional().default(""),
});
export const BulkAttendanceRequestSchema = z.object({
  class_id: z.string(),
  date: z.string(),
  attendances: z.array(BulkAttendanceItemSchema),
});
export type BulkAttendanceRequest = z.infer<typeof BulkAttendanceRequestSchema>;

// Leave Requests
export const CreateLeaveRequestSchema = z.object({
  student_id: z.string(),
  leave_type: LeaveTypeSchema,
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().min(3, "Alasan izin minimal 3 karakter"),
  attachment_url: z.string().nullable().optional(),
});
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;

export const ReviewLeaveRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  review_notes: z.string().optional(),
});
export type ReviewLeaveRequest = z.infer<typeof ReviewLeaveRequestSchema>;

// Academic
export const CreateAssignmentRequestSchema = z.object({
  class_id: z.string(),
  title: z.string().min(3, "Judul tugas minimal 3 karakter"),
  description: z.string(),
  subject: z.string(),
  due_date: z.string(),
});
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;

export const CreateGradeNoteRequestSchema = z.object({
  student_id: z.string(),
  subject: z.string(),
  semester: z.number().int(),
  academic_year: z.string(),
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
});
export type CreateGradeNoteRequest = z.infer<typeof CreateGradeNoteRequestSchema>;

// Announcements
export const CreateAnnouncementRequestSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  content: z.string().min(5, "Isi pengumuman minimal 5 karakter"),
  category: AnnouncementCategorySchema,
  target_role: z.enum(["ALL", "GUARDIAN", "TEACHER"]).default("ALL"),
  class_id: z.string().nullable().optional(),
  is_pinned: z.boolean().default(false),
});
export type CreateAnnouncementRequest = z.infer<typeof CreateAnnouncementRequestSchema>;

// Threads & Messages
export const CreateThreadRequestSchema = z.object({
  student_id: z.string(),
  teacher_id: z.string(),
  subject: z.string().min(3, "Subjek pesan minimal 3 karakter"),
  initial_message: z.string().min(1, "Pesan tidak boleh kosong"),
});
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().min(1, "Isi pesan tidak boleh kosong"),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

// Invoices
export const CreateInvoiceRequestSchema = z.object({
  student_id: z.string(),
  title: z.string().min(3, "Judul tagihan minimal 3 karakter"),
  description: z.string().optional(),
  amount: z.number().positive("Nominal harus lebih besar dari 0"),
  due_date: z.string(),
});
export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceRequestSchema>;

export const SubmitPaymentRequestSchema = z
  .object({
    payment_method: z.string().optional(),
    payment_ref: z.string().optional(),
    proof_note: z.string().optional(),
    payment_proof_url: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.payment_proof_url?.trim() ||
          data.payment_ref?.trim() ||
          data.proof_note?.trim()
      ),
    {
      message: "Bukti atau referensi pembayaran wajib diisi",
    }
  );
export type SubmitPaymentRequest = z.infer<typeof SubmitPaymentRequestSchema>;

export const VerifyInvoiceRequestSchema = z.object({
  status: z.enum(["PAID", "REJECTED"]),
  notes: z.string().optional(),
});
export type VerifyInvoiceRequest = z.infer<typeof VerifyInvoiceRequestSchema>;

// ==========================================
// 4. Utility Formatters (Indonesian Context)
// ==========================================

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
  return formatted.replace(/\s+/g, " ");
}

export function formatTanggalId(
  dateStr: string,
  opts?: { includeDay?: boolean; shortMonth?: boolean }
): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulanLengkap = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const bulanPendek = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const d = date.getDate();
  const m = opts?.shortMonth ? bulanPendek[date.getMonth()] : bulanLengkap[date.getMonth()];
  const y = date.getFullYear();

  if (opts?.includeDay) {
    const hari = hariArr[date.getDay()];
    return `${hari}, ${d} ${m} ${y}`;
  }
  return `${d} ${m} ${y}`;
}
