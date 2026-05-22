import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  teacher: 'Profesor',
  admin: 'Administrador',
};

// Componente de navegación que usa useNavigate
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

  // No mostrar navbar en la página de perfil? (opcional)
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
          <button onClick={() => navigate('/')} className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors">
            ← Volver al Dashboard
          </button>
        )}
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
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="p-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
          title="Cerrar sesión"
        >
          Salir →
        </button>
      </div>
    </nav>
  );
}

// Componente que protege rutas según rol
function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Redirigir según el rol del usuario
    if (currentUser.role === 'student') navigate('/');
    else if (currentUser.role === 'teacher') navigate('/');
    else if (currentUser.role === 'admin') navigate('/');
    return null;
  }

  return children;
}

// Componente principal con las rutas
function AppRoutes() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si hay usuario logueado y está en la raíz, redirigir según su rol
    if (currentUser && window.location.pathname === '/') {
      // No redirigir, el dashboard ya se muestra según el rol
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return <Login />;
  }

  // Determinar qué dashboard mostrar según el rol en la ruta raíz
  const getDashboardByRole = () => {
    switch (currentUser.role) {
      case 'student': return <StudentDashboard />;
      case 'teacher': return <TeacherDashboard />;
      case 'admin': return <AdminDashboard />;
      default: return <div>Rol no reconocido</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          {/* Ruta raíz - muestra el dashboard según el rol */}
          <Route path="/" element={getDashboardByRole()} />
          
          {/* Ruta de perfil - solo estudiantes */}
          <Route 
            path="/perfil" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirección para rutas no encontradas */}
          <Route path="*" element={<div className="text-center py-12">Página no encontrada. <button onClick={() => window.location.href = '/'} className="text-blue-600 underline">Volver al inicio</button></div>} />
        </Routes>
      </main>
    </div>
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