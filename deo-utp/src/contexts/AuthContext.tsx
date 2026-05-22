import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { CurrentUser, UserRole } from '../lib/types';
import { openDatabase, getStudentByEmail, getTeacherByEmail, getAdminByEmail, addAuditLog } from '../lib/database';

interface AuthContextType {
  currentUser: CurrentUser | null;
  dbReady: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    openDatabase().then(() => setDbReady(true)).catch(console.error);
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    const student = await getStudentByEmail(email);
    if (student && student.password === password) {
      const user: CurrentUser = { role: 'student', email, name: student.name, id: student.id ?? null };
      setCurrentUser(user);
      await addAuditLog(`Login: ${student.name}`, email);
      return null;
    }

    const teacher = await getTeacherByEmail(email);
    if (teacher && teacher.password === password) {
      const user: CurrentUser = { role: 'teacher', email, name: teacher.name, id: teacher.id ?? null };
      setCurrentUser(user);
      await addAuditLog(`Login: ${teacher.name}`, email);
      return null;
    }

    const admin = await getAdminByEmail(email);
    if (admin && admin.password === password) {
      const user: CurrentUser = { role: 'admin', email, name: admin.name, id: admin.id ?? null };
      setCurrentUser(user);
      await addAuditLog(`Login: ${admin.name}`, email);
      return null;
    }

    if (!student && !teacher && !admin) return 'Usuario no encontrado';
    return 'Contraseña incorrecta';
  }

  function logout() {
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, dbReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
