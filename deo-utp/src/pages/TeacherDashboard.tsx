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
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const teacherCourses = Array.from(
    new Map(
      students
        .flatMap(s => s.courses.filter(c => c.teacherId === currentUser?.id))
        .map(c => [c.courseId, { id: c.courseId, name: c.courseName }])
    ).values()
  );
  const studentsInSelectedCourse = students.filter(s => 
    s.courses?.some(c => c.courseId === selectedCourseId)
  );
  const [activeTab, setActiveTab] = useState('Académico');
  const [searchTerm, setSearchTerm] = useState(""); // Lo que el usuario escribe
const [filterRisk, setFilterRisk] = useState("Todos"); // El filtro de botones
// Lógica de filtrado
const filteredStudents = students.filter(s => {
  const matchesName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesRisk = filterRisk === "Todos" || s.risk === filterRisk;
  return matchesName && matchesRisk;
});

const estudiantesFiltrados = students.filter(s => {
  const coincideCurso = selectedCourseId === 'Todos' || s.courseId === selectedCourseId;
  const coincideRiesgo = riskFilter === 'all' || s.risk === riskFilter;
  const coincideBusqueda = s.name.toLowerCase().includes(search.toLowerCase());
    return coincideCurso && coincideRiesgo && coincideBusqueda;
});

  useEffect(() => {
  getAllStudents().then(allStudents => {
    // FILTRO DINÁMICO: 
    // Buscamos si en la lista de cursos del estudiante, 
    // alguno coincide con el ID del profesor logueado.
    const myStudents = allStudents.filter(s => 
      s.courses?.some(course => course.teacherId === currentUser?.id)
    );
    setStudents(myStudents);
    setLoading(false);
  });
}, [currentUser]);

  const filtered = students.filter(s => {
  // 1. Filtro de curso: Si hay un curso seleccionado, el estudiante debe tener ese ID en su lista de cursos
  const matchCourse = selectedCourseId ? s.courses.some(c => c.courseId === selectedCourseId) : true;
    // 2. Filtro de búsqueda (lo que ya tenías)
  const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    // 3. Filtro de riesgo (lo que ya tenías)
  const matchRisk = riskFilter === 'all' || s.risk === riskFilter;
  return matchCourse && matchSearch && matchRisk;
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

{/* Selector de Cursos - Estilo Adaptado a Modo Oscuro */}
<div className="bg-[#1a2234] p-6 rounded-2xl shadow-sm border border-gray-700 mb-8">
  <h3 className="font-semibold text-gray-200 text-lg mb-4 flex items-center gap-2">
    📚 Mis Cursos
  </h3>
  <div className="flex gap-3 flex-wrap">
    {teacherCourses.map(course => (
      <button 
        key={course.id}
        onClick={() => setSelectedCourseId(selectedCourseId === course.id ? null : course.id)}
        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 
          ${selectedCourseId === course.id 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
      >
        {course.name}
      </button>
    ))}
  </div>
</div>

      {/* SEARCH HERO */}
<div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e4668, #2c5f8a)' }}>
  <h3 className="font-semibold text-lg mb-3">🔍 Buscar estudiantes</h3>
  <div className="flex items-center gap-3 rounded-full px-4 py-3 mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
    <span>🔍</span>
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Nombre del estudiante..."
      className="flex-1 bg-transparent outline-none text-sm placeholder-blue-200"
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

{/* LÓGICA DE FILTRADO Y LISTADO DE TARJETAS */}
{(() => {
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    
    // Si hay algo escrito en el buscador, ignoramos los otros filtros
    if (search.length > 0) {
      return matchesSearch;
    }
    
    // Si no hay nada escrito, aplicamos los filtros de materia y riesgo
    const matchesCourse = selectedCourseId === 'Todos' || s.courseId === selectedCourseId;
    const matchesRisk = riskFilter === 'all' || s.risk === riskFilter;
    
    return matchesCourse && matchesRisk;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {filteredStudents.map(student => (
        <div key={student.id} className="bg-[#111827] p-6 rounded-3xl border border-gray-800 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{student.avatar}</span>
            <div>
              <h4 className="text-white font-bold">{student.name}</h4>
              <p className="text-gray-400 text-xs">{student.disability}</p>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm text-gray-300 mb-6">
            <span>📊 {student.avgGrade}%</span>
            <span>📅 {student.absences} faltas</span>
          </div>

          <div className={`px-4 py-2 rounded-full text-xs font-bold w-fit ${
            student.risk === 'high' ? 'bg-red-500/20 text-red-400' : 
            student.risk === 'medium' ? 'bg-orange-500/20 text-orange-400' : 
            'bg-green-500/20 text-green-400'
          }`}>
            Riesgo {student.risk === 'high' ? 'Alto' : student.risk === 'medium' ? 'Medio' : 'Bajo'}
          </div>

          <button 
            onClick={() => setSelectedStudent(student)}
            className="w-full mt-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all"
          >
            Ver Expediente
          </button>
        </div>
      ))}
    </div>
  );
})()}

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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedStudent(null)}>
    <div className="bg-[#111827] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-800" onClick={e => e.stopPropagation()}>
      
      {/* CABECERA DEL EXPEDIENTE */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#1a2234]">
        <div className="flex items-center gap-4">
          <span className="text-5xl bg-gray-800 p-3 rounded-2xl">{selectedStudent.avatar}</span>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedStudent.name}</h2>
            <p className="text-blue-400 text-sm font-medium">ID Estudiante: #2024-00{selectedStudent.id}</p>
          </div>
        </div>
        <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
      </div>

     
      <div className="flex bg-[#1a2234] px-4 flex-wrap border-b border-gray-800">
        {[
          'Información Académica', 
          'Ajustes Razonables', 
          'Estrategias Pedagógicas', 
          'Contactos de Apoyo', 
          'Alertas Activas'
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-4 text-sm font-semibold transition-all flex-1 text-center ${
              activeTab === tab 
              ? 'border-b-2 border-blue-500 text-blue-500 bg-blue-500/10' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="p-10 overflow-y-auto max-h-[60vh] text-gray-300">
        
        {activeTab === 'Información Académica' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-8 rounded-3xl border border-gray-700">
              <h4 className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-widest">Rendimiento General</h4>
              <div className="text-5xl font-bold text-green-400 mb-2">{selectedStudent.avgGrade}%</div>
              <p className="text-sm">Promedio ponderado del curso.</p>
            </div>
            <div className="bg-gray-800/50 p-8 rounded-3xl border border-gray-700">
              <h4 className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-widest">Inasistencias</h4>
              <div className="text-5xl font-bold text-blue-400 mb-2">{selectedStudent.absences}</div>
              <p className="text-sm">Total de faltas registradas.</p>
            </div>
          </div>
        )}

        {activeTab === 'Ajustes Razonables' && (
          <div className="space-y-4">
            <h4 className="text-white font-bold text-lg">Plan Individual de Ajustes</h4>
            <div className="bg-blue-900/20 p-6 rounded-2xl border border-blue-800">
              <p className="text-sm leading-relaxed">
                <strong className="text-blue-400">Discapacidad/Condición:</strong> {selectedStudent.disability || 'No registrada'}<br/><br/>
                Este estudiante requiere ajustes en los tiempos de evaluación y materiales impresos.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'Estrategias Pedagógicas' && (
          <div className="space-y-4">
             <h4 className="text-white font-bold text-lg">Guía para el Docente</h4>
             <ul className="list-disc pl-5 space-y-2 text-sm">
               <li>Ubicar al estudiante en la primera fila.</li>
               <li>Fraccionar instrucciones largas.</li>
               <li>Permitir herramientas de apoyo.</li>
             </ul>
          </div>
        )}

        {activeTab === 'Contactos de Apoyo' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl">
              <div className="bg-blue-600 h-10 w-10 rounded-full flex items-center justify-center font-bold">DEO</div>
              <div>
                <p className="font-bold text-white">Lic. Ana Ramírez</p>
                <p className="text-xs">Coordinadora de Orientación</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Alertas Activas' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className={`h-4 w-4 rounded-full animate-pulse ${
                selectedStudent.risk === 'high' ? 'bg-red-500' : 'bg-green-500'
              }`}></span>
              <h4 className="text-white font-bold text-xl">
                Estado: {selectedStudent.risk === 'high' ? 'Alto' : 'Bajo'}
              </h4>
            </div>
            <div className="space-y-3">
              {selectedStudent.alerts?.map((alert, i) => (
                <div key={i} className="bg-red-900/20 text-red-200 p-4 rounded-xl border border-red-800/50 text-sm flex items-center gap-3">
                  ⚠️ {alert}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* PIE DE PÁGINA */}
      <div className="p-6 border-t border-gray-800 bg-[#1a2234] flex justify-end">
        <button 
          onClick={() => setSelectedStudent(null)} 
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg"
        >
          Cerrar Expediente
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
