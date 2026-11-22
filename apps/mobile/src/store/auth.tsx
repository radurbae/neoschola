import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { User, Student } from "@neoschola/shared";
import * as api from "../lib/api";

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
  activeStudentId: string | null;
  activeStudent: Student | null;
  isLoading: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setActiveStudentId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Helper untuk memuat data siswa & menyetel active student
  const loadStudentsForUser = async (currentUser: User) => {
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
          const { user: currentUser } = await api.getMe();
          if (isMounted) {
            setToken(savedToken);
            setUser(currentUser);
            await loadStudentsForUser(currentUser);
          }
        } catch (error) {
          // Token kedaluwarsa atau server menolak
          if (isMounted) {
            api.setAuthToken(null);
            storageRemove(TOKEN_STORAGE_KEY);
            storageRemove(ACTIVE_STUDENT_STORAGE_KEY);
            setToken(null);
            setUser(null);
            setStudents([]);
            setActiveStudentIdState(null);
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
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      api.setAuthToken(res.token);
      storageSet(TOKEN_STORAGE_KEY, res.token);

      setToken(res.token);
      setUser(res.user);

      await loadStudentsForUser(res.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      api.setAuthToken(null);
      storageRemove(TOKEN_STORAGE_KEY);
      storageRemove(ACTIVE_STUDENT_STORAGE_KEY);

      setToken(null);
      setUser(null);
      setStudents([]);
      setActiveStudentIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!token) return;
    try {
      const { user: currentUser } = await api.getMe();
      setUser(currentUser);
      await loadStudentsForUser(currentUser);
    } catch {
      // Biarkan state yang ada jika refresh sementara gagal
    }
  }, [token]);

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
      activeStudentId,
      activeStudent,
      isLoading,
      isReady,
      login,
      logout,
      refreshSession,
      setActiveStudentId,
    }),
    [
      token,
      user,
      students,
      activeStudentId,
      activeStudent,
      isLoading,
      isReady,
      login,
      logout,
      refreshSession,
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
