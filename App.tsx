import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  admin: 'Administrador',
};

function AppShell() {
  const { currentUser, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  if (!currentUser) return <Login />;

  const dashboardMap: Record<string, JSX.Element> = {
    student: <StudentDashboard />,
    teacher: <TeacherDashboard />,
    admin: <AdminDashboard />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♿</span>
          <span className="font-bold text-foreground">DEO</span>
          <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ background: '#1e4668' }}>
            {ROLE_LABELS[currentUser.role]}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden sm:block">✉️ {currentUser.email}</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            title="Cambiar modo"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
            title="Cerrar sesión"
          >
            Salir →
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {dashboardMap[currentUser.role] ?? <div>Rol no reconocido</div>}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
