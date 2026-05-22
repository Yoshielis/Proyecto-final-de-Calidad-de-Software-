import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student } from '../lib/types';
import { getAllStudents, addReport, addAuditLog } from '../lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RISK_COLORS: Record<string, string> = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };
const RISK_LABELS: Record<string, string> = { high: 'Alto riesgo 🔴', medium: 'Riesgo medio 🟠', low: 'Riesgo bajo 🟢' };
const REPORT_TYPES = ['Académico', 'Conductual', 'Asistencia', 'Bienestar emocional'];

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reportStudent, setReportStudent] = useState<number | ''>('');
  const [reportType, setReportType] = useState('Académico');
  const [reportContent, setReportContent] = useState('');
  const [reportSent, setReportSent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllStudents().then(s => { setStudents(s); if (s.length > 0) setReportStudent(s[0].id!); setLoading(false); });
  }, []);

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.disability.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || s.risk === riskFilter;
    return matchSearch && matchRisk;
  });

  async function handleSubmitReport() {
    if (!reportContent.trim()) { setReportSent('Por favor ingrese una descripción'); return; }
    await addReport({ studentId: Number(reportStudent), teacherId: currentUser!.id, content: reportContent, type: reportType, date: new Date().toISOString() });
    await addAuditLog(`Informe generado para estudiante ID:${reportStudent} por ${currentUser!.name}`, currentUser!.email);
    setReportContent('');
    setReportSent('✅ Informe enviado a DEO correctamente');
    setTimeout(() => setReportSent(''), 4000);
  }

  const chartData = students.map(s => ({ name: s.name.split(' ')[0], promedio: s.avgGrade }));

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portal del Profesor</h1>
        <p className="text-muted-foreground mt-1">Bienvenido, {currentUser?.name}</p>
      </div>

      {/* Search hero */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e4668, #2c5f8a)' }}>
        <h3 className="font-semibold text-lg mb-3">🔍 Buscar estudiantes</h3>
        <div className="flex items-center gap-3 rounded-full px-4 py-3 mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <span>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nombre del estudiante, tipo de discapacidad..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-blue-200"
            style={{ color: 'white' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all', 'Todos'], ['high', 'Alto riesgo 🔴'], ['medium', 'Riesgo medio 🟠'], ['low', 'Riesgo bajo 🟢']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setRiskFilter(val)}
              className={`text-xs px-4 py-2 rounded-full font-medium transition-all ${riskFilter === val ? 'bg-white text-blue-900' : 'text-white'}`}
              style={riskFilter !== val ? { background: 'rgba(255,255,255,0.2)' } : {}}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Student cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center text-muted-foreground py-8">No se encontraron estudiantes</div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border" style={{ borderLeft: `4px solid ${RISK_COLORS[s.risk]}` }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{s.avatar}</span>
              <div>
                <strong className="font-semibold">{s.name}</strong>
                <p className="text-xs text-muted-foreground">{s.disability || 'Sin especificar'}</p>
              </div>
            </div>
            <div className="text-sm mb-2">
              📊 Promedio: <strong>{s.avgGrade}%</strong> &nbsp;|&nbsp; 📚 Inasistencias: <strong>{s.absences}</strong>
            </div>
            {s.alerts.length > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">⚠️ {s.alerts.slice(0, 2).join(', ')}</p>
            )}
            <span className="inline-block text-xs px-3 py-1 rounded-full font-medium text-white" style={{ background: RISK_COLORS[s.risk] }}>
              {RISK_LABELS[s.risk]}
            </span>
            <button
              onClick={() => setSelectedStudent(s)}
              className="block mt-3 text-xs font-medium px-4 py-2 rounded-full text-white"
              style={{ background: '#3a7b5c' }}
            >
              Ver expediente
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report form */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">📄 Generar nuevo informe</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estudiante:</label>
              <select value={reportStudent} onChange={e => setReportStudent(Number(e.target.value))} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none">
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de informe:</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none">
                {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción:</label>
              <textarea
                value={reportContent}
                onChange={e => setReportContent(e.target.value)}
                rows={4}
                placeholder="Observaciones, progreso o incidencias..."
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none resize-none"
              />
            </div>
            {reportSent && <p className="text-sm font-medium" style={{ color: reportSent.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{reportSent}</p>}
            <button onClick={handleSubmitReport} className="w-full py-3 rounded-full font-semibold text-white text-sm" style={{ background: '#1e4668' }}>
              Enviar informe a DEO
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">📊 Estadísticas de estudiantes</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Promedio']} />
              <Bar dataKey="promedio" fill="#2c5f8a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student detail modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedStudent(null)}>
          <div className="bg-card rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Expediente de {selectedStudent.name}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <strong>{selectedStudent.email}</strong></p>
              <p><span className="text-muted-foreground">Discapacidad:</span> <strong>{selectedStudent.disability || 'No especificada'}</strong></p>
              <p><span className="text-muted-foreground">Promedio:</span> <strong>{selectedStudent.avgGrade}%</strong></p>
              <p><span className="text-muted-foreground">Inasistencias:</span> <strong>{selectedStudent.absences}</strong></p>
              <p><span className="text-muted-foreground">Cursos:</span> <strong>{selectedStudent.courses.join(', ')}</strong></p>
              <p><span className="text-muted-foreground">Ánimo promedio:</span> <strong>{selectedStudent.moodHistory.length > 0 ? (selectedStudent.moodHistory.reduce((a, b) => a + b, 0) / selectedStudent.moodHistory.length).toFixed(1) : '—'}/5</strong></p>
              <p><span className="text-muted-foreground">Nivel de riesgo:</span> <strong style={{ color: RISK_COLORS[selectedStudent.risk] }}>{RISK_LABELS[selectedStudent.risk]}</strong></p>
              {selectedStudent.alerts.length > 0 && (
                <p><span className="text-muted-foreground">Alertas:</span> <strong>{selectedStudent.alerts.join(', ')}</strong></p>
              )}
            </div>
            <button onClick={() => setSelectedStudent(null)} className="mt-6 w-full py-3 rounded-full font-semibold text-white text-sm" style={{ background: '#1e4668' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
