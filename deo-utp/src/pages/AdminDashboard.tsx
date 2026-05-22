import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Teacher, Coordinator, AuditLog, DailyReport } from '../lib/types';
import {
  getAllStudents,
  getAllTeachers,
  getAllCoordinators,
  deleteStudent,
  deleteTeacher,
  addStudent,
  addTeacher,
  addAuditLog,
  getAuditLog,
  getAllDailyReports,
  getDailyReportsByStudent,
  getStudentById,
  updateStudent,
  getCompleteProgressStats,
  getStudentProgressStats
} from '../lib/database';

type Tab =
  | 'students'
  | 'teachers'
  | 'coordinators'
  | 'reports'
  | 'stats'
  | 'add'
  | 'pending';
const RISK_COLORS: Record<string, string> = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedStudentStats, setSelectedStudentStats] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [loading, setLoading] = useState(true);
  const [absenceThreshold, setAbsenceThreshold] = useState(3);
  const [moodThreshold, setMoodThreshold] = useState(2);
  const [saved, setSaved] = useState('');
  const [reportFilterStudent, setReportFilterStudent] = useState<number | 'all'>('all');
  const [statsFilterStudent, setStatsFilterStudent] = useState<number | null>(null);

  // Add student form
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sCedula, setSCedula] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sDisability, setSDisability] = useState('');
  const [sGrade, setSGrade] = useState('');
  const [sRisk, setSRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [sCourses, setSCourses] = useState('');
  const [sCoordinatorId, setSCoordinatorId] = useState<number>(1);
  const [sMsg, setSMsg] = useState('');

  // Add teacher form
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tCedula, setTCedula] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tSpecialty, setTSpecialty] = useState('');
  const [tMsg, setTMsg] = useState('');

  async function load() {
    const [s, t, c, log, reports] = await Promise.all([
      getAllStudents(),
      getAllTeachers(),
      getAllCoordinators(),
      getAuditLog(),
      getAllDailyReports()
    ]);
    setStudents(s);
    setTeachers(t);
    setCoordinators(c);
    setAuditLog(log);
    setDailyReports(reports);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
  if (editingStudent) {
    setActiveTab('students');
  }
}, [editingStudent]);

  async function handleDeleteStudent(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    await deleteStudent(id);
    await addAuditLog(`Estudiante ${name} eliminado por ${currentUser!.name}`, currentUser!.email, 'admin');
    await load();
  }

  async function handleDeleteTeacher(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    await deleteTeacher(id);
    await addAuditLog(`Profesor ${name} eliminado por ${currentUser!.name}`, currentUser!.email, 'admin');
    await load();
  }

  async function handleUpdateStudent() {
    if (!editingStudent) return;
    await updateStudent(editingStudent);
    await addAuditLog(`Estudiante ${editingStudent.name} actualizado por ${currentUser!.name}`, currentUser!.email, 'admin', `Campos editados: datos personales`);
    setEditingStudent(null);
    await load();
    alert('✅ Estudiante actualizado correctamente');
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    await addStudent({
      email: sEmail,
      password: '123456',
      name: sName,
      status: 'pending',
      cedula: sCedula,
      phone: sPhone,
      birthDate: '',
      address: '',
      emergencyContact: { name: '', phone: '', relationship: '' },
      disability: sDisability,
      disabilityCertificate: '',
      avgGrade: parseInt(sGrade),
      moodHistory: [3, 3, 3, 3, 3, 3, 3],
      absences: 0,
      risk: sRisk,
      courses: sCourses.split(',').map(c => ({ courseId: 0, courseName: c.trim(), teacherId: 0, teacherName: '', schedule: '', classroom: '' })),
      alerts: [],
      avatar: '👨‍🎓',
      coordinatorId: sCoordinatorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
    await addAuditLog(`Estudiante ${sName} agregado por ${currentUser!.name}`, currentUser!.email, 'admin');
    setSMsg('✅ Estudiante agregado exitosamente');
    setSName(''); setSEmail(''); setSCedula(''); setSPhone(''); setSDisability(''); setSGrade(''); setSCourses('');
    await load();
    setTimeout(() => setSMsg(''), 3000);
  }

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    await addTeacher({
      email: tEmail,
      password: '123456',
      name: tName,
      cedula: tCedula,
      phone: tPhone,
      specialty: tSpecialty,
      department: '',
      courses: [],
      avatar: '👩‍🏫',
      coordinatorId: 1
    } as any);
    await addAuditLog(`Profesor ${tName} agregado por ${currentUser!.name}`, currentUser!.email, 'admin');
    setTMsg('✅ Profesor agregado exitosamente');
    setTName(''); setTEmail(''); setTCedula(''); setTPhone(''); setTSpecialty('');
    await load();
    setTimeout(() => setTMsg(''), 3000);
  }

  async function handleSaveRules() {
    localStorage.setItem('systemRules', JSON.stringify({ absenceThreshold, moodThreshold }));
    await addAuditLog(`Reglas del sistema actualizadas por ${currentUser!.name}`, currentUser!.email, 'admin');
    setSaved('✅ Configuración guardada correctamente');
    setTimeout(() => setSaved(''), 3000);
  }

  async function handleViewStudentStats(studentId: number) {
    const stats = await getCompleteProgressStats(studentId);
    setSelectedStudentStats(stats);
    setSelectedStudentId(studentId);
  }

  const activeAlerts = students.filter(s => s.alerts.length > 0).length;
  // 🔥 FUNCIÓN: asignación automática de profesores
function assignTeachersToStudent(student: Student, teachers: Teacher[]) {
  const shuffled = [...teachers].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, 2).map(t => ({
    teacherId: t.id,
    teacherName: t.name,
  }));
}
  const filteredReports = reportFilterStudent === 'all'
    ? dailyReports
    : dailyReports.filter(r => r.studentId === reportFilterStudent);
  const sortedReports = [...filteredReports].sort((a, b) => b.date.localeCompare(a.date));

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;

  const inputClass = "w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none mt-1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración DEO</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios, reportes diarios, estadísticas y reglas del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: '👥', val: students.length, lbl: 'Estudiantes', color: '#1e4668' },
          { icon: '👨‍🏫', val: teachers.length, lbl: 'Profesores', color: '#3a7b5c' },
          { icon: '📋', val: dailyReports.length, lbl: 'Reportes Diarios', color: '#8e44ad' },
          { icon: '⚠️', val: activeAlerts, lbl: 'Alertas Activas', color: '#e74c3c' },
        ].map(s => (
          <div key={s.lbl} className="rounded-2xl p-4 text-white text-center" style={{ background: s.color }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.val}</div>
            <div className="text-xs opacity-90 mt-1">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Tabs principales */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex flex-wrap gap-1 border-b border-border mb-5 pb-0">
          {[
            ['students', '📚 Estudiantes'],
            ['teachers', '👨‍🏫 Profesores'],
            ['coordinators', '👔 Coordinadores'],
            ['reports', '📋 Reportes Diarios'],
            ['stats', '📊 Estadísticas'],
            ['add', '➕ Agregar'],
            ['pending', '📂 Expedientes Pendientes'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === id ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ========== TABLA DE ESTUDIANTES (con edición) ========== */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            {editingStudent ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">✏️ Editando: {editingStudent.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} className={inputClass} placeholder="Nombre" />
                  <input type="email" value={editingStudent.email} onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })} className={inputClass} placeholder="Email" />
                  <input type="text" value={editingStudent.cedula || ''} onChange={e => setEditingStudent({ ...editingStudent, cedula: e.target.value })} className={inputClass} placeholder="Cédula" />
                  <input type="text" value={editingStudent.phone || ''} onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })} className={inputClass} placeholder="Teléfono" />
                  <input type="text" value={editingStudent.disability || ''} onChange={e => setEditingStudent({ ...editingStudent, disability: e.target.value })} className={inputClass} placeholder="Discapacidad" />
                  <input type="text" value={editingStudent.disabilityCertificate || ''} onChange={e => setEditingStudent({ ...editingStudent, disabilityCertificate: e.target.value })} className={inputClass} placeholder="Certificado" />
                  {/* ===== SECCIÓN 2: Evaluación de necesidades ===== */}

<select
  value={editingStudent.disabilityLevel || ''}
  onChange={e =>
    setEditingStudent({
      ...editingStudent,
      disabilityLevel: e.target.value
    })
  }
  className={inputClass}
>
  <option value="">Nivel de discapacidad</option>
  <option value="Leve">Leve</option>
  <option value="Moderado">Moderado</option>
  <option value="Severo">Severo</option>
</select>

<input
  type="text"
  value={editingStudent.academicImpact || ''}
  onChange={e =>
    setEditingStudent({
      ...editingStudent,
      academicImpact: e.target.value
    })
  }
  className={inputClass}
  placeholder="Impacto académico"
/>

{/* ===== SECCIÓN 3: Ajustes razonables ===== */}

<input
  type="text"
  value={editingStudent.reasonableAdjustments?.join(', ') || ''}
  onChange={e =>
    setEditingStudent({
      ...editingStudent,
      reasonableAdjustments: e.target.value
        .split(',')
        .map(a => a.trim())
    })
  }
  className={inputClass}
  placeholder="Ajustes razonables (separados por coma)"
/>

{/* ===== SECCIÓN 4: Plan de apoyo ===== */}

<textarea
  value={editingStudent.supportPlan || ''}
  onChange={e =>
    setEditingStudent({
      ...editingStudent,
      supportPlan: e.target.value
    })
  }
  className={inputClass}
  placeholder="Plan de apoyo individualizado"
/>

{/* ===== SECCIÓN 5: Documentación soporte ===== */}

<input
  type="text"
  value={editingStudent.supportDocuments?.join(', ') || ''}
  onChange={e =>
    setEditingStudent({
      ...editingStudent,
      supportDocuments: e.target.value
        .split(',')
        .map(d => d.trim())
    })
  }
  className={inputClass}
  placeholder="Documentos soporte"
/>
                  <select value={editingStudent.risk} onChange={e => setEditingStudent({ ...editingStudent, risk: e.target.value as any })} className={inputClass}>
                    <option value="low">Bajo Riesgo</option>
                    <option value="medium">Riesgo Medio</option>
                    <option value="high">Alto Riesgo</option>
                  </select>
                  <select value={editingStudent.coordinatorId} onChange={e => setEditingStudent({ ...editingStudent, coordinatorId: Number(e.target.value) })} className={inputClass}>
                    {coordinators.map(c => <option key={c.id} value={c.id}>{c.name} ({c.department})</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleUpdateStudent} className="px-4 py-2 rounded-full text-white text-sm" style={{ background: '#27ae60' }}>💾 Guardar Cambios</button>
                  <button onClick={() => setEditingStudent(null)} className="px-4 py-2 rounded-full bg-muted text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Cédula</th>
                    <th className="pb-3 font-medium">Discapacidad</th>
                    <th className="pb-3 font-medium">Riesgo</th>
                    <th className="pb-3 font-medium">Coordinador</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-3">{s.avatar} {s.name}</td>
                      <td className="py-3 text-muted-foreground">{s.cedula || '—'}</td>
                      <td className="py-3">{s.disability || 'Ninguna'}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs text-white font-medium" style={{ background: RISK_COLORS[s.risk] }}>
                          {s.risk === 'high' ? 'Alto' : s.risk === 'medium' ? 'Medio' : 'Bajo'}
                        </span>
                      </td>
                      <td className="py-3 text-xs">{coordinators.find(c => c.id === s.coordinatorId)?.name || '—'}</td>
                      <td className="py-3 flex gap-2">
                        <button onClick={() => setEditingStudent(s)} className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ background: '#f39c12' }}>✏️ Editar</button>
                        <button onClick={() => handleDeleteStudent(s.id!, s.name)} className="text-xs px-3 py-1 rounded-full text-white font-medium" style={{ background: '#e74c3c' }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {/* ========== EXPEDIENTES PENDIENTES ========== */}
{activeTab === 'pending' && (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">
      📂 Expedientes Pendientes
    </h2>

    <p className="text-muted-foreground text-sm">
      Estudiantes que requieren validación y activación del expediente.
    </p>

    {students.filter(s => s.status === 'pending').length === 0 ? (
      <div className="bg-muted/30 rounded-xl p-6 text-center">
        <p className="text-muted-foreground">
          ✅ No hay expedientes pendientes
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {students
          .filter(s => s.status === 'pending')
          .map(s => (
            <div
              key={s.id}
              className="bg-muted/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold text-lg">
                  {s.avatar} {s.name}
                </h3>

                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>📧 {s.email}</p>
                  <p>🪪 {s.cedula || 'Sin cédula'}</p>
                  <p>
                    ♿ {s.disability || 'Sin discapacidad registrada'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
              
<button
  onClick={async () => {

    if (
      !s.disability ||
      !s.disabilityLevel ||
      !s.academicImpact ||
      !s.supportPlan ||
      !s.reasonableAdjustments?.length ||
      !s.supportDocuments?.length
    ) {
      alert('⚠️ Complete todas las secciones del expediente');
      return;
    }

    const assignedTeachers = assignTeachersToStudent(s, teachers);

    await updateStudent({
      ...s,
      status: 'active',
      assignedTeachers
    } as any);

    await addAuditLog(
      `Expediente activado y profesores asignados a ${s.name}`,
      currentUser!.email,
      'admin'
    );

    await load();

    alert('✅ Expediente activado y profesores asignados');
  }}
  className="px-4 py-2 rounded-full text-white text-sm"
  style={{ background: '#27ae60' }}
>
  ✅ Activar Expediente
</button>

    
              </div>
            </div>
          ))}
      </div>
    )}
  </div>
)}

        {/* ========== TABLA DE PROFESORES ========== */}
        {activeTab === 'teachers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th>Nombre</th><th>Email</th><th>Cédula</th><th>Especialidad</th><th>Acciones</th></tr></thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id} className="border-t"><td className="py-3">{t.avatar} {t.name}</td><td>{t.email}</td><td>{t.cedula || '—'}</td><td>{t.specialty || 'General'}</td><td><button onClick={() => handleDeleteTeacher(t.id!, t.name)} className="text-xs px-3 py-1 rounded-full text-white bg-red-500">Eliminar</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== COORDINADORES ========== */}
        {activeTab === 'coordinators' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th>Nombre</th><th>Email</th><th>Cédula</th><th>Facultad</th></tr></thead>
              <tbody>
                {coordinators.map(c => (
                  <tr key={c.id} className="border-t"><td className="py-3">{c.avatar} {c.name}</td><td>{c.email}</td><td>{c.cedula || '—'}</td><td>{c.department}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== REPORTES DIARIOS POR ESTUDIANTE ========== */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-medium">Filtrar por estudiante:</label>
              <select value={reportFilterStudent} onChange={e => setReportFilterStudent(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-muted rounded-full px-4 py-2 text-sm">
                <option value="all">📊 Todos los estudiantes</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {sortedReports.map(r => {
                const student = students.find(s => s.id === r.studentId);
                return (
                  <div key={r.id} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex justify-between items-start flex-wrap">
                      <div><span className="font-medium">{student?.name || r.studentEmail}</span><span className="text-xs text-muted-foreground ml-2">{r.date}</span></div>
                      <div className="flex gap-2 text-xs"><span>Ánimo: {r.mood}/5</span><span>Asistió: {r.attended ? '✅' : '❌'}</span>{r.riskDetected && <span className="text-red-500">🚨 Riesgo detectado</span>}</div>
                    </div>
                    {r.difficulties.length > 0 && <p className="text-xs mt-1">⚠️ Dificultades: {r.difficulties.join(', ')}</p>}
                    {r.achievements.length > 0 && <p className="text-xs text-green-600">🌟 Logros: {r.achievements.join(', ')}</p>}
                    {r.supportRequest && <p className="text-xs text-blue-600">📢 Apoyo: {r.supportRequest}</p>}
                  </div>
                );
              })}
              {sortedReports.length === 0 && <p className="text-center text-muted-foreground py-8">📭 No hay reportes diarios registrados</p>}
            </div>
          </div>
        )}

        {/* ========== ESTADÍSTICAS POR ESTUDIANTE ========== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-medium">Estudiante:</label>
              <select value={statsFilterStudent || ''} onChange={async e => {
                const id = Number(e.target.value);
                setStatsFilterStudent(id);
                if (id) {
                  const stats = await getCompleteProgressStats(id);
                  setSelectedStudentStats(stats);
                  setSelectedStudentId(id);
                }
              }} className="bg-muted rounded-full px-4 py-2 text-sm">
                <option value="">Seleccionar estudiante</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedStudentStats && selectedStudentId && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-bold">📊 Estadísticas de {students.find(s => s.id === selectedStudentId)?.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>📈 Ánimo semanal: {selectedStudentStats.weeklyMood.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7 || 0}/5</div>
                  <div>📚 Asistencia: {((selectedStudentStats.attendanceTrend.filter((a: number) => a === 100).length / (selectedStudentStats.attendanceTrend.length || 1)) * 100).toFixed(0)}%</div>
                  <div>🔥 Racha positiva: {selectedStudentStats.positiveStreak} días</div>
                  <div className={selectedStudentStats.riskLevel === 'high' ? 'text-red-600 font-bold' : selectedStudentStats.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}>⚠️ Riesgo: {selectedStudentStats.riskLevel === 'high' ? 'Alto' : selectedStudentStats.riskLevel === 'medium' ? 'Medio' : 'Bajo'}</div>
                </div>
                <div><p className="font-medium mb-1">💡 Recomendaciones:</p><ul className="list-disc pl-5 text-sm">{selectedStudentStats.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
              </div>
            )}
          </div>
        )}

        {/* ========== AGREGAR PERSONAS ========== */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/30 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">👨‍🎓 Agregar Estudiante</h3>
              {sMsg && <p className="text-sm text-green-600 mb-3">{sMsg}</p>}
              <form onSubmit={handleAddStudent} className="space-y-3">
                <input required value={sName} onChange={e => setSName(e.target.value)} className={inputClass} placeholder="Nombre completo *" />
                <input required type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} className={inputClass} placeholder="Email *" />
                <input required value={sCedula} onChange={e => setSCedula(e.target.value)} className={inputClass} placeholder="Cédula *" />
                <input value={sPhone} onChange={e => setSPhone(e.target.value)} className={inputClass} placeholder="Teléfono" />
                <input value={sDisability} onChange={e => setSDisability(e.target.value)} className={inputClass} placeholder="Discapacidad" />
                <input required type="number" value={sGrade} onChange={e => setSGrade(e.target.value)} className={inputClass} placeholder="Promedio (%) *" />
                <select required value={sRisk} onChange={e => setSRisk(e.target.value as any)} className={inputClass}>
                  <option value="low">Bajo Riesgo</option>
                  <option value="medium">Riesgo Medio</option>
                  <option value="high">Alto Riesgo</option>
                </select>
                <input required value={sCourses} onChange={e => setSCourses(e.target.value)} className={inputClass} placeholder="Cursos (separados por coma) *" />
                <select value={sCoordinatorId} onChange={e => setSCoordinatorId(Number(e.target.value))} className={inputClass}>
                  {coordinators.map(c => <option key={c.id} value={c.id}>{c.name} ({c.department})</option>)}
                </select>
                <button type="submit" className="w-full py-2 rounded-full font-semibold text-white" style={{ background: '#1e4668' }}>Agregar Estudiante</button>
              </form>
            </div>

            <div className="bg-muted/30 rounded-2xl p-5">
              <h3 className="font-semibold mb-4">👩‍🏫 Agregar Profesor</h3>
              {tMsg && <p className="text-sm text-green-600 mb-3">{tMsg}</p>}
              <form onSubmit={handleAddTeacher} className="space-y-3">
                <input required value={tName} onChange={e => setTName(e.target.value)} className={inputClass} placeholder="Nombre completo *" />
                <input required type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} className={inputClass} placeholder="Email *" />
                <input required value={tCedula} onChange={e => setTCedula(e.target.value)} className={inputClass} placeholder="Cédula *" />
                <input value={tPhone} onChange={e => setTPhone(e.target.value)} className={inputClass} placeholder="Teléfono" />
                <input value={tSpecialty} onChange={e => setTSpecialty(e.target.value)} className={inputClass} placeholder="Especialidad" />
                <button type="submit" className="w-full py-2 rounded-full font-semibold text-white" style={{ background: '#3a7b5c' }}>Agregar Profesor</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Reglas de alertas + auditoría */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">⚠️ Reglas de Alertas</h3>
          <div className="space-y-5">
            <div><label className="text-sm font-medium">Umbral de inasistencias: <strong>{absenceThreshold}</strong></label><input type="range" min="1" max="10" value={absenceThreshold} onChange={e => setAbsenceThreshold(Number(e.target.value))} className="w-full accent-blue-700" /></div>
            <div><label className="text-sm font-medium">Umbral de estado anímico: <strong>{moodThreshold}</strong></label><input type="range" min="1" max="5" value={moodThreshold} onChange={e => setMoodThreshold(Number(e.target.value))} className="w-full accent-blue-700" /></div>
            {saved && <p className="text-sm text-green-600">{saved}</p>}
            <button onClick={handleSaveRules} className="w-full py-3 rounded-full font-semibold text-white" style={{ background: '#1e4668' }}>Guardar Configuración</button>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">📜 Bitácora de auditoría</h3>
          <div className="bg-muted rounded-xl p-3 max-h-64 overflow-y-auto">
            {auditLog.length === 0 ? <p className="text-xs text-muted-foreground">Sin registros</p> : (
              <div className="space-y-1">
                {auditLog.slice(-30).reverse().map((log, i) => (
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