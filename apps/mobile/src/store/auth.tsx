import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { User, Student, Class } from "@neoschola/shared";
import * as api from "../lib/api";
import {
  getActiveVariantConfig,
  isRoleAllowedInCurrentVariant,
} from "../config/appVariant";

const TOKEN_STORAGE_KEY = "neoschola_auth_token";
const ACTIVE_STUDENT_STORAGE_KEY = "neoschola_active_student_id";

// Penyimpanan platform-agnostic: localStorage jika Web, in-memory jika Native
const memoryStorage: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage[key] ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  memoryStorage[key] = value;
}

function storageRemove(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
  delete memoryStorage[key];
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  students: Student[];
  classes: Class[];
  activeStudentId: string | null;
  activeStudent: Student | null;
  unreadNotificationCount: number;
  isLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshUnreadNotifications: () => Promise<void>;
  setActiveStudentId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setUnreadNotificationCount(res.unread_count || 0);
    } catch {
      // Abaikan kesalahan jaringan sementara saat memperbarui badge notifikasi
    }
  }, []);

  // Helper untuk memuat data siswa & menyetel active student
  const loadStudentsForUser = async (currentUser: User, meClasses?: Class[]) => {
    setClasses(meClasses ?? []);
    if (currentUser.role === "GUARDIAN") {
      try {
        const { students: fetchedStudents } = await api.getStudents();
        setStudents(fetchedStudents);

        const savedStudentId = storageGet(ACTIVE_STUDENT_STORAGE_KEY);
        const matchingSaved = fetchedStudents.find((s) => s.id === savedStudentId);

        if (matchingSaved) {
          setActiveStudentIdState(matchingSaved.id);
        } else if (fetchedStudents.length > 0) {
          setActiveStudentIdState(fetchedStudents[0].id);
          storageSet(ACTIVE_STUDENT_STORAGE_KEY, fetchedStudents[0].id);
        } else {
          setActiveStudentIdState(null);
        }
      } catch (err) {
        setStudents([]);
        setActiveStudentIdState(null);
      }
    } else {
      setStudents([]);
      setActiveStudentIdState(null);
    }
  };

  // Inisialisasi awal saat aplikasi dibuka
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      const savedToken = storageGet(TOKEN_STORAGE_KEY);

      if (savedToken) {
        try {
          api.setAuthToken(savedToken);
          const meRes = await api.getMe();
          if (!isRoleAllowedInCurrentVariant(meRes.user.role)) {
            throw new Error(getActiveVariantConfig().wrongRoleMessage);
          }
          if (isMounted) {
            setToken(savedToken);
            setUser(meRes.user);
            await Promise.all([
              loadStudentsForUser(meRes.user, meRes.classes),
              refreshUnreadNotifications(),
            ]);
          }
        } catch (error) {
          // Token kedaluwarsa, ditolak server, atau tidak cocok dengan varian aplikasi
          if (isMounted) {
            api.setAuthToken(null);
            storageRemove(TOKEN_STORAGE_KEY);
            storageRemove(ACTIVE_STUDENT_STORAGE_KEY);
            setToken(null);
            setUser(null);
            setStudents([]);
            setClasses([]);
            setActiveStudentIdState(null);
            setUnreadNotificationCount(0);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
        setIsReady(true);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [refreshUnreadNotifications]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await api.login({ email, password });
        if (!isRoleAllowedInCurrentVariant(res.user.role)) {
          api.setAuthToken(null);
          storageRemove(TOKEN_STORAGE_KEY);
          storageRemove(ACTIVE_STUDENT_STORAGE_KEY);
          throw new Error(getActiveVariantConfig().wrongRoleMessage);
        }

        api.setAuthToken(res.token);
        storageSet(TOKEN_STORAGE_KEY, res.token);

        setToken(res.token);
        setUser(res.user);

        if (res.user.role === "GUARDIAN") {
          await Promise.all([
            loadStudentsForUser(res.user),
            refreshUnreadNotifications(),
          ]);
        } else {
          const meRes = await api.getMe().catch(() => null);
          await Promise.all([
            loadStudentsForUser(res.user, meRes?.classes),
            refreshUnreadNotifications(),
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUnreadNotifications]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      api.setAuthToken(null);
      storageRemove(TOKEN_STORAGE_KEY);
      storageRemove(ACTIVE_STUDENT_STORAGE_KEY);

      setToken(null);
      setUser(null);
      setStudents([]);
      setClasses([]);
      setActiveStudentIdState(null);
      setUnreadNotificationCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!token) return;
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
      await Promise.all([
        loadStudentsForUser(meRes.user, meRes.classes),
        refreshUnreadNotifications(),
      ]);
    } catch {
      // Biarkan state yang ada jika refresh sementara gagal
    }
  }, [token, refreshUnreadNotifications]);

  const setActiveStudentId = useCallback((id: string) => {
    setActiveStudentIdState(id);
    storageSet(ACTIVE_STUDENT_STORAGE_KEY, id);
  }, []);

  const activeStudent = useMemo(() => {
    if (!activeStudentId || students.length === 0) {
      return students[0] || null;
    }
    return students.find((s) => s.id === activeStudentId) || students[0] || null;
  }, [students, activeStudentId]);

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      students,
      classes,
      activeStudentId,
      activeStudent,
      unreadNotificationCount,
      isLoading,
      isReady,
      login,
      logout,
      refreshSession,
      refreshUnreadNotifications,
      setActiveStudentId,
    }),
    [
      token,
      user,
      students,
      classes,
      activeStudentId,
      activeStudent,
      unreadNotificationCount,
      isLoading,
      isReady,
      login,
      logout,
      refreshSession,
      refreshUnreadNotifications,
      setActiveStudentId,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam komponen AuthProvider");
  }
  return context;
}
