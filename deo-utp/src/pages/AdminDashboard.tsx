import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Teacher, AuditLog } from '../lib/types';
import {
  getAllStudents, getAllTeachers, deleteStudent, deleteTeacher,
  addStudent, addTeacher, addAuditLog, getAuditLog
} from '../lib/database';

type Tab = 'students' | 'teachers' | 'add';
const RISK_COLORS: Record<string, string> = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [loading, setLoading] = useState(true);
  const [absenceThreshold, setAbsenceThreshold] = useState(3);
  const [moodThreshold, setMoodThreshold] = useState(2);
  const [saved, setSaved] = useState('');

  // Add student form
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sDisability, setSDisability] = useState('');
  const [sGrade, setSGrade] = useState('');
  const [sRisk, setSRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [sCourses, setSCourses] = useState('');
  const [sMsg, setSMsg] = useState('');

  // Add teacher form
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSpecialty, setTSpecialty] = useState('');
  const [tMsg, setTMsg] = useState('');

  async function load() {
    const [s, t, log] = await Promise.all([getAllStudents(), getAllTeachers(), getAuditLog()]);
    setStudents(s);
    setTeachers(t);
    setAuditLog(log);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDeleteStudent(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    await deleteStudent(id);
    await addAuditLog(`Estudiante ${name} eliminado por ${currentUser!.name}`, currentUser!.email);
    await load();
  }

  async function handleDeleteTeacher(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    await deleteTeacher(id);
    await addAuditLog(`Profesor ${name} eliminado por ${currentUser!.name}`, currentUser!.email);
    await load();
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    await addStudent({
      email: sEmail, password: '123456', name: sName,
      disability: sDisability, avgGrade: parseInt(sGrade), moodHistory: [3,3,3,3,3,3,3],
      absences: 0, risk: sRisk, courses: sCourses.split(',').map(c => c.trim()),
      alerts: [], avatar: '👨‍🎓'
    });
    await addAuditLog(`Estudiante ${sName} agregado por ${currentUser!.name}`, currentUser!.email);
    setSMsg('✅ Estudiante agregado exitosamente');
    setSName(''); setSEmail(''); setSDisability(''); setSGrade(''); setSCourses('');
    await load();
    setTimeout(() => setSMsg(''), 3000);
  }

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    await addTeacher({ email: tEmail, password: '123456', name: tName, specialty: tSpecialty, avatar: '👩‍🏫' });
    await addAuditLog(`Profesor ${tName} agregado por ${currentUser!.name}`, currentUser!.email);
    setTMsg('✅ Profesor agregado exitosamente');
    setTName(''); setTEmail(''); setTSpecialty('');
    await load();
    setTimeout(() => setTMsg(''), 3000);
  }

  async function handleSaveRules() {
    localStorage.setItem('systemRules', JSON.stringify({ absenceThreshold, moodThreshold }));
    await addAuditLog(`Reglas del sistema actualizadas por ${currentUser!.name}`, currentUser!.email);
    setSaved('✅ Configuración guardada correctamente');
    setTimeout(() => setSaved(''), 3000);
  }

  const activeAlerts = students.filter(s => s.alerts.length > 0).length;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;

  const inputClass = "w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none mt-1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración DEO</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios, expedientes y reglas del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '👥', val: students.length, lbl: 'Estudiantes Registrados', color: '#1e4668' },
          { icon: '👨‍🏫', val: teachers.length, lbl: 'Profesores', color: '#3a7b5c' },
          { icon: '⚠️', val: activeAlerts, lbl: 'Alertas Activas', color: '#e74c3c' },
        ].map(s => (
          <div key={s.lbl} className="rounded-2xl p-5 text-white text-center" style={{ background: s.color }}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-4xl font-bold">{s.val}</div>
            <div className="text-sm opacity-90 mt-1">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Main table card */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-5 pb-0">
          {([['students', '📚 Gestión de Estudiantes'], ['teachers', '👨‍🏫 Gestión de Profesores'], ['add', '➕ Agregar Persona']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === id ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Students tab */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Discapacidad</th>
                  <th className="pb-3 font-medium">Riesgo</th>
                  <th className="pb-3 font-medium">Alertas</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-3">{s.avatar} {s.name}</td>
                    <td className="py-3 text-muted-foreground">{s.email}</td>
                    <td className="py-3">{s.disability || 'Ninguna'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full text-xs text-white font-medium" style={{ background: RISK_COLORS[s.risk] }}>
                        {s.risk === 'high' ? 'Alto' : s.risk === 'medium' ? 'Medio' : 'Bajo'}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{s.alerts.slice(0, 2).join(', ') || '—'}</td>
                    <td className="py-3">
                      <button onClick={() => handleDeleteStudent(s.id!, s.name)} className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ background: '#e74c3c' }}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Teachers tab */}
        {activeTab === 'teachers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Especialidad</th>
                  <th className="pb-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-3">{t.avatar} {t.name}</td>
                    <td className="py-3 text-muted-foreground">{t.email}</td>
                    <td className="py-3">{t.specialty || 'General'}</td>
                    <td className="py-3">
                      <button onClick={() => handleDeleteTeacher(t.id!, t.name)} className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ background: '#e74c3c' }}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add tab */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/30 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">👨‍🎓 Agregar Estudiante</h3>
              {sMsg && <p className="text-sm text-green-600 mb-3">{sMsg}</p>}
              <form onSubmit={handleAddStudent} className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Nombre completo *</label><input required value={sName} onChange={e => setSName(e.target.value)} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground">Email *</label><input required type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground">Discapacidad</label><input value={sDisability} onChange={e => setSDisability(e.target.value)} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground">Promedio (%) *</label><input required type="number" value={sGrade} onChange={e => setSGrade(e.target.value)} min="0" max="100" className={inputClass} /></div>
                <div>
                  <label className="text-xs text-muted-foreground">Nivel de riesgo *</label>
                  <select required value={sRisk} onChange={e => setSRisk(e.target.value as 'low' | 'medium' | 'high')} className={inputClass}>
                    <option value="low">Bajo Riesgo</option>
                    <option value="medium">Riesgo Medio</option>
                    <option value="high">Alto Riesgo</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Cursos (separados por coma) *</label><input required value={sCourses} onChange={e => setSCourses(e.target.value)} placeholder="Matemáticas, Física" className={inputClass} /></div>
                <button type="submit" className="w-full py-2 rounded-full font-semibold text-white text-sm mt-2" style={{ background: '#1e4668' }}>
                  Agregar Estudiante
                </button>
              </form>
            </div>

            <div className="bg-muted/30 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">👩‍🏫 Agregar Profesor</h3>
              {tMsg && <p className="text-sm text-green-600 mb-3">{tMsg}</p>}
              <form onSubmit={handleAddTeacher} className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Nombre completo *</label><input required value={tName} onChange={e => setTName(e.target.value)} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground">Email *</label><input required type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground">Especialidad</label><input value={tSpecialty} onChange={e => setTSpecialty(e.target.value)} className={inputClass} /></div>
                <button type="submit" className="w-full py-2 rounded-full font-semibold text-white text-sm mt-2" style={{ background: '#3a7b5c' }}>
                  Agregar Profesor
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alert rules */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">⚠️ Reglas de Alertas</h3>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium block mb-2">Umbral de inasistencias: <strong>{absenceThreshold}</strong></label>
              <input type="range" min="1" max="10" value={absenceThreshold} onChange={e => setAbsenceThreshold(Number(e.target.value))} className="w-full accent-blue-700" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Umbral de estado anímico: <strong>{moodThreshold}</strong></label>
              <input type="range" min="1" max="5" value={moodThreshold} onChange={e => setMoodThreshold(Number(e.target.value))} className="w-full accent-blue-700" />
            </div>
            {saved && <p className="text-sm text-green-600 font-medium">{saved}</p>}
            <button onClick={handleSaveRules} className="w-full py-3 rounded-full font-semibold text-white text-sm" style={{ background: '#1e4668' }}>
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">📜 Bitácora de auditoría</h3>
          <div className="bg-muted rounded-xl p-3 max-h-64 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin registros</p>
            ) : (
              <div className="space-y-1">
                {auditLog.slice(-20).reverse().map((log, i) => (
                  <div key={i} className="text-xs p-2 bg-card rounded-lg">
                    <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleString('es-PA')}]</span>
                    <span className="ml-2">{log.action}</span>
                    <span className="ml-1 text-muted-foreground">— {log.user}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
