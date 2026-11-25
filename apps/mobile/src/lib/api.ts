import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  Class,
  Student,
  StudentDashboardResponse,
  Attendance,
  AttendanceStatus,
  BulkAttendanceRequest,
  LeaveRequest,
  CreateLeaveRequest,
  ReviewLeaveRequest,
  Schedule,
  Assignment,
  CreateAssignmentRequest,
  GradeNote,
  CreateGradeNoteRequest,
  Announcement,
  CreateAnnouncementRequest,
  MessageThread,
  CreateThreadRequest,
  Message,
  SendMessageRequest,
  Invoice,
  CreateInvoiceRequest,
  SubmitPaymentRequest,
  VerifyInvoiceRequest,
  Notification,
  StaffAttendanceSummaryResponse,
} from "@neoschola/shared";

// Base API URL dari environment Expo atau fallback localhost
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "UNKNOWN_ERROR", status = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, token = currentToken } = options;

  let url = `${BASE_URL}${endpoint}`;

  if (params) {
    const query = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");
    if (query) {
      url += (url.includes("?") ? "&" : "?") + query;
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const effectiveToken = token || currentToken;
  if (effectiveToken) {
    headers["Authorization"] = `Bearer ${effectiveToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiClientError(
      "Gagal terhubung ke server sekolah. Periksa koneksi internet Anda.",
      "NETWORK_ERROR",
      0
    );
  }

  let responseData: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorCode = responseData?.error?.code || `HTTP_${response.status}`;
    const errorMessage =
      responseData?.error?.message ||
      getFallbackErrorMessage(response.status);

    throw new ApiClientError(errorMessage, errorCode, response.status);
  }

  return responseData as T;
}

function getFallbackErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Data yang dikirim tidak valid. Mohon periksa kembali formulir Anda.";
    case 401:
      return "Sesi Anda telah berakhir. Silakan masuk kembali.";
    case 403:
      return "Anda tidak memiliki hak akses untuk melakukan tindakan ini.";
    case 404:
      return "Data yang diminta tidak ditemukan di sistem sekolah.";
    case 500:
    case 502:
    case 503:
      return "Server sekolah sedang mengalami kendala. Silakan coba beberapa saat lagi.";
    default:
      return "Terjadi kesalahan pada sistem. Silakan coba lagi.";
  }
}

// Autentikasi
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: credentials,
  });
}

export interface ClassAttendanceItem {
  student_id: string;
  nis: string;
  student_name: string;
  attendance_id: string | null;
  status: AttendanceStatus | null;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

export interface ExtendedMeResponse extends MeResponse {
  students?: Student[];
  classes?: Class[];
}

export async function getMe(): Promise<ExtendedMeResponse> {
  return request<ExtendedMeResponse>("/api/auth/me");
}

// Peserta Didik & Dashboard
export async function getStudents(): Promise<{ students: Student[] }> {
  return request<{ students: Student[] }>("/api/students");
}

export async function getStudentDashboard(
  studentId: string
): Promise<StudentDashboardResponse> {
  return request<StudentDashboardResponse>(`/api/students/${studentId}/dashboard`);
}

// Presensi
export async function getAttendance(params?: {
  student_id?: string;
  month?: string;
  from?: string;
  to?: string;
}): Promise<{ items: Attendance[] }> {
  return request<{ items: Attendance[] }>("/api/attendance", { params });
}

export async function getClassAttendance(params: {
  class_id: string;
  date?: string;
}): Promise<{ class_id: string; date: string; items: ClassAttendanceItem[] }> {
  return request<{ class_id: string; date: string; items: ClassAttendanceItem[] }>(
    "/api/attendance/class",
    { params }
  );
}

export async function bulkAttendance(
  payload: BulkAttendanceRequest
): Promise<{ success: boolean; recorded_count: number }> {
  return request<{ success: boolean; recorded_count: number }>(
    "/api/attendance/bulk",
    {
      method: "POST",
      body: payload,
    }
  );
}

// Pengajuan Izin
export async function getLeaveRequests(params?: {
  student_id?: string;
}): Promise<{ items: LeaveRequest[] }> {
  return request<{ items: LeaveRequest[] }>("/api/leave-requests", { params });
}

export async function createLeaveRequest(
  payload: CreateLeaveRequest
): Promise<{ leave_request: LeaveRequest }> {
  return request<{ leave_request: LeaveRequest }>("/api/leave-requests", {
    method: "POST",
    body: payload,
  });
}

export async function reviewLeaveRequest(
  id: string,
  payload: ReviewLeaveRequest
): Promise<{ leave_request: LeaveRequest }> {
  return request<{ leave_request: LeaveRequest }>(
    `/api/leave-requests/${id}/review`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

// Akademik
export async function getSchedule(params?: {
  class_id?: string;
  student_id?: string;
}): Promise<{ schedules: Schedule[] }> {
  return request<{ schedules: Schedule[] }>("/api/academic/schedule", { params });
}

export async function getAssignments(params?: {
  class_id?: string;
  student_id?: string;
}): Promise<{ assignments: Assignment[] }> {
  return request<{ assignments: Assignment[] }>("/api/academic/assignments", {
    params,
  });
}

export async function createAssignment(
  payload: CreateAssignmentRequest
): Promise<{ assignment: Assignment }> {
  return request<{ assignment: Assignment }>("/api/academic/assignments", {
    method: "POST",
    body: payload,
  });
}

export async function getGrades(params: {
  student_id: string;
}): Promise<{ grades: GradeNote[] }> {
  return request<{ grades: GradeNote[] }>("/api/academic/grades", { params });
}

export async function createGrade(
  payload: CreateGradeNoteRequest
): Promise<{ grade_note: GradeNote }> {
  return request<{ grade_note: GradeNote }>("/api/academic/grades", {
    method: "POST",
    body: payload,
  });
}

// Pengumuman
export async function getAnnouncements(params?: {
  class_id?: string;
  category?: string;
}): Promise<{ announcements: Announcement[] }> {
  return request<{ announcements: Announcement[] }>("/api/announcements", {
    params,
  });
}

export async function createAnnouncement(
  payload: CreateAnnouncementRequest
): Promise<{ announcement: Announcement }> {
  return request<{ announcement: Announcement }>("/api/announcements", {
    method: "POST",
    body: payload,
  });
}

export async function ackAnnouncement(
  id: string
): Promise<{ success: boolean; read_at: string }> {
  return request<{ success: boolean; read_at: string }>(
    `/api/announcements/${id}/ack`,
    {
      method: "POST",
    }
  );
}

// Pesan Langsung (Threads & Messages)
export async function getThreads(): Promise<{
  threads: MessageThread[];
  service_hours?: string;
}> {
  return request<{ threads: MessageThread[]; service_hours?: string }>("/api/threads");
}

export async function createThread(
  payload: CreateThreadRequest
): Promise<{ thread: MessageThread }> {
  return request<{ thread: MessageThread }>("/api/threads", {
    method: "POST",
    body: payload,
  });
}

export async function getThreadMessages(
  id: string
): Promise<{ thread?: MessageThread; messages: Message[]; service_hours?: string }> {
  return request<{ thread?: MessageThread; messages: Message[]; service_hours?: string }>(
    `/api/threads/${id}/messages`
  );
}

export async function sendThreadMessage(
  id: string,
  payload: SendMessageRequest
): Promise<{ message: Message }> {
  return request<{ message: Message }>(`/api/threads/${id}/messages`, {
    method: "POST",
    body: payload,
  });
}

export async function markThreadRead(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/threads/${id}/read`, {
    method: "POST",
  });
}

// Tagihan & Keuangan
export async function getInvoices(params?: {
  student_id?: string;
  status?: string;
}): Promise<{ invoices: Invoice[] }> {
  return request<{ invoices: Invoice[] }>("/api/invoices", { params });
}

export async function createInvoice(
  payload: CreateInvoiceRequest
): Promise<{ invoice: Invoice }> {
  return request<{ invoice: Invoice }>("/api/invoices", {
    method: "POST",
    body: payload,
  });
}

export async function submitPayment(
  id: string,
  payload: SubmitPaymentRequest
): Promise<{ invoice: Invoice }> {
  return request<{ invoice: Invoice }>(`/api/invoices/${id}/submit-payment`, {
    method: "POST",
    body: payload,
  });
}

export async function verifyInvoice(
  id: string,
  payload: VerifyInvoiceRequest
): Promise<{ invoice: Invoice }> {
  return request<{ invoice: Invoice }>(`/api/invoices/${id}/verify`, {
    method: "PATCH",
    body: payload,
  });
}

export async function getAttendanceSummary(): Promise<StaffAttendanceSummaryResponse> {
  return request<StaffAttendanceSummaryResponse>("/api/attendance/summary");
}

// Notifikasi
export async function getNotifications(): Promise<{
  notifications: Notification[];
  unread_count: number;
}> {
  return request<{ notifications: Notification[]; unread_count: number }>(
    "/api/notifications"
  );
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  updated_count: number;
}> {
  return request<{ success: boolean; updated_count: number }>(
    "/api/notifications/read-all",
    {
      method: "POST",
    }
  );
}
