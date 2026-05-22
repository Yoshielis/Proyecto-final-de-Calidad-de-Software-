import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import { ensureDataIntegrity } from './lib/database';

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  admin: 'Administrador',
};

function NavBar() {
  const { currentUser, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  if (!currentUser) return null;

  const isProfilePage = location.pathname === '/perfil';

  return (
    <nav className="sticky top-0 z-40 bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-2xl">♿</span>
          <span className="font-bold text-foreground">DEO</span>
        </button>
        <span className="text-xs px-3 py-1 rounded-full font-semibold text-white" style={{ background: '#1e4668' }}>
          {ROLE_LABELS[currentUser.role]}
        </span>
        {isProfilePage && (
          <button onClick={() => navigate('/')} className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-foreground">
            ← Volver al Dashboard
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground hidden sm:block">✉️ {currentUser.email}</span>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-muted transition-colors" title="Cambiar modo">
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-muted-foreground hover:text-foreground">
          Salir →
        </button>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    navigate('/');
    return null;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    navigate('/');
    return null;
  }

  return children;
}

// Componente para rutas con layout (con NavBar)
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { currentUser } = useAuth();

  // Mover el useEffect antes del return
  useEffect(() => {
    if (currentUser) {
      ensureDataIntegrity();
    }
  }, [currentUser]);

  // Si no hay usuario, mostrar solo el Login (sin NavBar)
  if (!currentUser) {
    return <Login />;
  }

  // Con usuario, mostrar las rutas con el layout
  const getDashboardByRole = () => {
    switch (currentUser.role) {
      case 'student': return <StudentDashboard />;
      case 'teacher': return <TeacherDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <div>Rol no reconocido</div>;
    }
  };

  return (
    <Layout>
      <Routes>
        <Route path="/" element={getDashboardByRole()} />
        <Route 
          path="/perfil" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}