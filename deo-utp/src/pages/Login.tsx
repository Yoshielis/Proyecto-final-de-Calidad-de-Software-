import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_CREDS = [
  { label: 'Estudiante', email: 'ana.gomez@utp.ac.pa', pass: '123456', icon: '📚' },
  { label: 'Profesor', email: 'jorge.martinez@utp.ac.pa', pass: '123456', icon: '👨‍🏫' },
  { label: 'Administrador', email: 'admin@utp.ac.pa', pass: '123456', icon: '⚙️' },
];

export default function Login() {
  const { login, dbReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Ingrese email y contraseña'); return; }
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1e4668] via-[#2c5f8a] to-[#1e4668]">
      <div className="w-full max-w-md px-6 py-8">
        {/* Brand */}
        <div className="mb-8 text-center text-white">
          <div className="text-6xl mb-4">♿</div>
          <h1 className="text-4xl font-bold mb-1">
            DEO <span className="font-light">Inclusión UTP</span>
          </h1>
          <p className="text-blue-200 text-sm">Dirección de Equidad y Oportunidades</p>
          <p className="text-blue-300 text-xs mt-1">Universidad Tecnológica de Panamá</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 text-center">Acceso al Sistema</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-gray-700 rounded-full px-4 py-3">
              <span className="text-slate-400 dark:text-slate-400">✉️</span>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-gray-700 rounded-full px-4 py-3">
              <span className="text-slate-400 dark:text-slate-400">🔒</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !dbReady}
              className="w-full py-3 rounded-full font-semibold text-white transition-all duration-200 disabled:opacity-60 hover:opacity-90"
              style={{ background: '#1e4668' }}
            >
              {loading ? 'Verificando...' : !dbReady ? 'Iniciando...' : 'Ingresar →'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 text-center">🔐 Credenciales de prueba:</p>
            <div className="space-y-2">
              {DEMO_CREDS.map(cred => (
                <button
                  key={cred.email}
                  onClick={() => { setEmail(cred.email); setPassword(cred.pass); setError(''); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 hover:opacity-80"
                  style={{ background: '#e8f0fe', color: '#1e4668' }}
                >
                  {cred.icon} {cred.label}: {cred.email} / {cred.pass}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}