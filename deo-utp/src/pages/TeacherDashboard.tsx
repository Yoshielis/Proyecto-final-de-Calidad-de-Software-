import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Teacher, Coordinator, DailyReport, FollowUpReport } from '../lib/types';
import {
  getTeacherByEmail,
  getAllStudents,
  getAllCoordinators,
  updateTeacher,
  getDailyReportsByStudent,
  getCompleteProgressStats,
  addAuditLog,
  addFollowUpReport,
  getFollowUpReportsByStudent
} from '../lib/database';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// ========== MODAL PARA REPORTE DE SEGUIMIENTO (CU6) ==========
interface FollowUpReportModalProps {
  student: Student;
  teacher: Teacher;
  onClose: () => void;
  onReportSaved: () => void;
}

function FollowUpReportModal({ student, teacher, onClose, onReportSaved }: FollowUpReportModalProps) {
  const [type, setType] = useState<'academic' | 'behavioral' | 'attendance' | 'mixed'>('academic');
  const [rating, setRating] = useState<'significant_improvement' | 'improvement' | 'stable' | 'declining' | 'critical'>('stable');
  const [observations, setObservations] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('low');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riskDetected, setRiskDetected] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const RATING_OPTIONS = [
    { value: 'significant_improvement', label: '🎉 Mejora significativa', color: '#27ae60' },
    { value: 'improvement', label: '📈 Mejora', color: '#2ecc71' },
    { value: 'stable', label: '📊 Estable', color: '#f39c12' },
    { value: 'declining', label: '📉 En declive', color: '#e67e22' },
    { value: 'critical', label: '⚠️ Crítico', color: '#e74c3c' }
  ];

  const TYPE_OPTIONS = [
    { value: 'academic', label: '📚 Académico', icon: '📚' },
    { value: 'behavioral', label: '🧠 Conductual', icon: '🧠' },
    { value: 'attendance', label: '📅 Asistencia', icon: '📅' },
    { value: 'mixed', label: '🔄 Mixto', icon: '🔄' }
  ];

  // Análisis de riesgo en observaciones
  const analyzeRisk = (text: string): boolean => {
    const riskKeywords = ['riesgo', 'alerta', 'emergencia', 'crisis', 'preocupante', 'grave', 'inasistencia', 'bajo rendimiento', 'aislamiento', 'depresión', 'ansiedad'];
    return riskKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const handleSubmit = async () => {
    if (!observations.trim()) {
      alert('Por favor ingrese observaciones antes de guardar.');
      return;
    }

    setIsSubmitting(true);
    const hasRisk = analyzeRisk(observations);
    setRiskDetected(hasRisk);

    // Validar consistencia entre urgencia y contenido (CU6 - Flujo excepción 2.3.1)
    if (urgency === 'high' && observations.length < 20 && !hasRisk) {
      const confirmHigh = confirm('Marcaste urgencia alta pero las observaciones son breves. ¿Deseas continuar?');
      if (!confirmHigh) {
        setIsSubmitting(false);
        return;
      }
    }

    await addFollowUpReport({
      studentId: student.id!,
      studentName: student.name,
      teacherId: teacher.id!,
      teacherName: teacher.name,
      type,
      rating,
      observations,
      urgency,
      evidence: evidence ? evidence.split(',').map(e => e.trim()) : [],
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      riskDetected: hasRisk,
      notifiedCoordinator: urgency === 'high' || hasRisk
    });

    await addAuditLog(
      `Reporte de seguimiento registrado para ${student.name} - Tipo: ${type} - Urgencia: ${urgency}`,
      teacher.email,
      'teacher'
    );

    setIsSubmitting(false);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      onReportSaved();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">📝 Reporte de Seguimiento</h2>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {showSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-300">
            ✅ Reporte enviado exitosamente. El equipo DEO ha sido notificado.
          </div>
        )}

        <div className="space-y-4">
          {/* Información del estudiante */}
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-sm"><strong>Estudiante:</strong> {student.avatar} {student.name}</p>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>

          {/* Tipo de reporte (CU6 - paso 3) */}
          <div>
            <label className="font-semibold block mb-2 text-foreground">📋 Tipo de reporte</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value as any)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${type === opt.value ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Escala de valoración */}
          <div>
            <label className="font-semibold block mb-2 text-foreground">📊 Valoración</label>
            <div className="grid grid-cols-2 gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRating(opt.value as any)}
                  className={`px-3 py-2 rounded-xl text-sm transition-all ${rating === opt.value ? 'ring-2 ring-primary shadow-md' : 'bg-muted'}`}
                  style={{ background: rating === opt.value ? opt.color + '20' : undefined }}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="font-semibold block mb-2 text-foreground">📝 Observaciones *</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Describa el progreso, dificultades o situaciones relevantes del estudiante..."
              className="w-full p-3 rounded-xl bg-muted text-foreground text-sm resize-none"
              rows={4}
            />
          </div>

          {/* Nivel de urgencia */}
          <div>
            <label className="font-semibold block mb-2 text-foreground">⚠️ Nivel de urgencia</label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${urgency === u ? 'text-white' : 'bg-muted text-foreground'}`}
                  style={{ background: urgency === u ? (u === 'low' ? '#27ae60' : u === 'medium' ? '#f39c12' : '#e74c3c') : undefined }}
                >
                  {u === 'low' ? '🟢 Baja' : u === 'medium' ? '🟡 Media' : '🔴 Alta'}
                </button>
              ))}
            </div>
          </div>

          {/* Evidencias */}
          <div>
            <label className="font-semibold block mb-2 text-foreground">📎 Evidencias (opcional)</label>
            <input
              type="text"
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
              placeholder="Ej: trabajo_entregado.pdf, captura_nota.png (separados por coma)"
              className="w-full p-3 rounded-xl bg-muted text-foreground text-sm"
            />
          </div>

          {/* Detección de riesgo */}
          {riskDetected && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                🚨 Se ha detectado lenguaje de riesgo. El coordinador DEO será notificado inmediatamente.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-full font-semibold text-white disabled:opacity-50"
              style={{ background: '#2c5f8a' }}
            >
              {isSubmitting ? 'Enviando...' : '📤 Enviar Reporte'}
            </button>
            <button onClick={onClose} className="flex-1 py-3 rounded-full bg-muted text-foreground">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== MODAL PARA VER REPORTES DE SEGUIMIENTO ==========
interface ViewReportsModalProps {
  student: Student;
  teacher: Teacher;
  onClose: () => void;
}

function ViewReportsModal({ student, teacher, onClose }: ViewReportsModalProps) {
  const [reports, setReports] = useState<FollowUpReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const allReports = await getFollowUpReportsByStudent(student.id!);
      setReports(allReports);
      setLoading(false);
    }
    load();
  }, [student.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
      </div>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-card rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">📋 Historial de Reportes - {student.name}</h2>
          <button onClick={onClose} className="text-2xl text-muted-foreground">✕</button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay reportes de seguimiento registrados</div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-muted/30 rounded-xl p-4">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(r.urgency)}`}>
                      {r.urgency === 'low' ? '🟢 Baja' : r.urgency === 'medium' ? '🟡 Media' : '🔴 Alta'}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{r.date}</span>
                  </div>
                  {r.riskDetected && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">🚨 Riesgo detectado</span>}
                </div>
                <p className="text-sm text-foreground mb-2">{r.observations}</p>
                {r.evidence && r.evidence.length > 0 && (
                  <p className="text-xs text-muted-foreground">📎 Evidencias: {r.evidence.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== TARJETA DE ESTADÍSTICAS DEL ESTUDIANTE (mejorada) ==========
interface StudentStatsCardProps {
  student: Student;
  teacher: Teacher;
  onClose: () => void;
  onReportSaved: () => void;
}

function StudentStatsCard({ student, teacher, onClose, onReportSaved }: StudentStatsCardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    async function load() {
      if (!student.id) return;
      const [progressStats, studentReports] = await Promise.all([
        getCompleteProgressStats(student.id),
        getDailyReportsByStudent(student.id)
      ]);
      setStats(progressStats);
      setReports(studentReports);
      setLoading(false);
    }
    load();
  }, [student.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const attendanceRate = reports.length > 0 ? (reports.filter(r => r.attended).length / reports.length * 100).toFixed(0) : '0';
  const recentMoodAvg = stats?.weeklyMood?.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7 || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-card rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">📊 Expediente de {student.name}</h2>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 border-b border-border mb-4">
          {[
            ['info', '📋 Información'],
            ['adjustments', '⚙️ Ajustes'],
            ['stats', '📈 Estadísticas'],
            ['reports', '📝 Reportes DEO']
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
                document.getElementById(`tab-${id}`)?.classList.remove('hidden');
              }}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent hover:text-primary"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pestaña 1: Información académica (CU4 - paso 6.1) */}
        <div id="tab-info" className="tab-content">
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-muted-foreground">Email</label><p className="font-medium">{student.email}</p></div>
              <div><label className="text-xs text-muted-foreground">Teléfono</label><p className="font-medium">{student.phone || 'No registrado'}</p></div>
              <div><label className="text-xs text-muted-foreground">Discapacidad</label><p className="font-medium">{student.disability || 'Ninguna'}</p></div>
              <div><label className="text-xs text-muted-foreground">Promedio</label><p className={`font-medium ${student.avgGrade >= 70 ? 'text-green-600' : 'text-red-500'}`}>{student.avgGrade}%</p></div>
              <div><label className="text-xs text-muted-foreground">Inasistencias</label><p className={`font-medium ${student.absences >= 3 ? 'text-red-500' : ''}`}>{student.absences}</p></div>
              <div><label className="text-xs text-muted-foreground">Nivel de riesgo</label><p className={`font-medium ${student.risk === 'high' ? 'text-red-600' : student.risk === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                {student.risk === 'high' ? 'Alto' : student.risk === 'medium' ? 'Medio' : 'Bajo'}
              </p></div>
            </div>
          </div>
        </div>

        {/* Pestaña 2: Ajustes razonables y plan de apoyo (CU4 - paso 6.2) */}
        <div id="tab-adjustments" className="tab-content hidden">
          {student.reasonableAdjustments && student.reasonableAdjustments.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-2">📋 Ajustes Razonables</h3>
              <ul className="list-disc pl-5 text-sm">
                {student.reasonableAdjustments.map((adj, i) => <li key={i}>{adj}</li>)}
              </ul>
            </div>
          )}
          {student.supportPlan && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-2">📝 Plan de Apoyo</h3>
              <p className="text-sm">{student.supportPlan}</p>
            </div>
          )}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
            <h3 className="font-semibold mb-2">👔 Contacto de Apoyo</h3>
            <p className="text-sm">Coordinador DEO: {student.coordinatorId ? 'Asignado' : 'Por asignar'}</p>
            <p className="text-xs text-muted-foreground mt-1">📞 Contactar al DEO para consultas sobre ajustes</p>
          </div>
        </div>

        {/* Pestaña 3: Estadísticas y tendencias (CU4 - paso 6.3) */}
        <div id="tab-stats" className="tab-content hidden">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{recentMoodAvg.toFixed(1)}<span className="text-sm">/5</span></div>
              <div className="text-xs text-muted-foreground">Ánimo promedio</div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{attendanceRate}<span className="text-sm">%</span></div>
              <div className="text-xs text-muted-foreground">Asistencia</div>
            </div>
          </div>
          {reports.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reports.slice(-7).map(r => ({ fecha: new Date(r.date).toLocaleDateString('es', { weekday: 'short' }), animo: r.mood }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="animo" stroke="#2c5f8a" fill="#2c5f8a" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pestaña 4: Reportes diarios del estudiante */}
        <div id="tab-reports" className="tab-content hidden">
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay reportes diarios registrados</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reports.slice(-10).map(r => (
                <div key={r.id} className="bg-muted/30 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                    <span className="text-xs">Ánimo: {r.mood}/5 | Asistencia: {r.attended ? '✅' : '❌'}</span>
                  </div>
                  {r.difficulties.length > 0 && <p className="text-xs mt-1">⚠️ {r.difficulties.join(', ')}</p>}
                  {r.achievements.length > 0 && <p className="text-xs text-green-600">🌟 {r.achievements.join(', ')}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones de acción (CU6) */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex-1 py-2 rounded-full font-semibold text-white"
            style={{ background: '#2c5f8a' }}
          >
            📝 Registrar Reporte de Seguimiento
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex-1 py-2 rounded-full font-semibold bg-muted text-foreground"
          >
            📋 Ver Historial
          </button>
        </div>

        {/* Recomendaciones para el docente */}
        {stats?.recommendations && stats.recommendations.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mt-4">
            <h3 className="font-semibold mb-2">💡 Recomendaciones pedagógicas</h3>
            <ul className="list-disc pl-5 text-sm">
              {stats.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
            </ul>
          </div>
        )}

        {/* Modales anidados */}
        {showFollowUpModal && (
          <FollowUpReportModal
            student={student}
            teacher={teacher}
            onClose={() => setShowFollowUpModal(false)}
            onReportSaved={() => {
              setShowFollowUpModal(false);
              onReportSaved();
            }}
          />
        )}
        {showHistoryModal && (
          <ViewReportsModal
            student={student}
            teacher={teacher}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// ========== MODAL PARA EDITAR PERFIL DEL PROFESOR ==========
interface EditProfileModalProps {
  teacher: Teacher;
  onClose: () => void;
  onUpdate: () => void;
}

function EditProfileModal({ teacher, onClose, onUpdate }: EditProfileModalProps) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: teacher.name,
    email: teacher.email,
    cedula: teacher.cedula || '',
    phone: teacher.phone || '',
    specialty: teacher.specialty || '',
    department: teacher.department || '',
    avatar: teacher.avatar || '👨‍🏫'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedTeacher = { ...teacher, ...formData, updatedAt: new Date().toISOString() };
      await updateTeacher(updatedTeacher);
      await addAuditLog(`Profesor ${teacher.name} actualizó su perfil`, currentUser!.email, 'teacher');
      setMessage('✅ Perfil actualizado correctamente');
      setTimeout(() => { onUpdate(); onClose(); }, 1500);
    } catch (error) {
      setMessage('❌ Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-foreground">✏️ Editar Perfil</h2>
          <button onClick={onClose} className="text-2xl text-muted-foreground">✕</button>
        </div>
        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm">{message}</div>}
        <div className="space-y-3">
          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Nombre" />
          <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Email" />
          <input type="text" value={formData.cedula} onChange={e => setFormData({ ...formData, cedula: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Cédula" />
          <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Teléfono" />
          <input type="text" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Especialidad" />
          <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Departamento" />
          <input type="text" value={formData.avatar} onChange={e => setFormData({ ...formData, avatar: e.target.value })} className="w-full p-2 bg-muted rounded-lg text-sm" placeholder="Avatar" maxLength={2} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-full text-white bg-green-600 disabled:opacity-50">{saving ? 'Guardando...' : '💾 Guardar'}</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-full bg-muted text-foreground">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ========== COMPONENTE PRINCIPAL ==========
export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = useCallback(async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    try {
      const [teacherData, allStudents, allCoordinators] = await Promise.all([
        getTeacherByEmail(currentUser.email),
        getAllStudents(),
        getAllCoordinators()
      ]);
      setTeacher(teacherData || null);
      setStudents(allStudents);
      setCoordinators(allCoordinators);
      if (teacherData) {
        const assigned = allStudents.filter(student =>
          student.courses?.some(course => course.teacherName === teacherData.name || course.teacherId === teacherData.id)
        );
        setMyStudents(assigned);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshTrigger]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredStudents = myStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCoordinatorName = (coordinatorId: number) => {
    const coord = coordinators.find(c => c.id === coordinatorId);
    return coord ? `${coord.name} (${coord.department})` : 'No asignado';
  };

  if (loading) {
    return <div className="flex flex-col items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div><p className="text-muted-foreground">Cargando...</p></div>;
  }

  if (!teacher) {
    return <div className="text-center p-8 text-muted-foreground">Profesor no encontrado</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel del Profesor</h1>
          <p className="text-muted-foreground text-lg">{teacher.avatar} {teacher.name}</p>
          <p className="text-xs text-muted-foreground">{teacher.email}</p>
        </div>
        <button onClick={() => setShowEditProfile(true)} className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: '#2c5f8a' }}>✏️ Editar Mi Perfil</button>
      </div>

      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h3 className="font-semibold text-lg mb-4 text-foreground">👨‍🏫 Mi Información</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Nombre</label><p className="font-medium">{teacher.name}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Email</label><p className="font-medium">{teacher.email}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Cédula</label><p className="font-medium">{teacher.cedula || 'No registrada'}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Teléfono</label><p className="font-medium">{teacher.phone || 'No registrado'}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Especialidad</label><p className="font-medium">{teacher.specialty || 'General'}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Departamento</label><p className="font-medium">{teacher.department || 'No asignado'}</p></div>
          <div className="bg-muted/30 rounded-xl p-3 md:col-span-2"><label className="text-xs text-muted-foreground">Coordinador DEO</label><p className="font-medium">{getCoordinatorName(teacher.coordinatorId)}</p></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-lg text-foreground">📚 Mis Estudiantes EcDF ({myStudents.length})</h3>
          <input type="text" placeholder="🔍 Buscar estudiante..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 rounded-full bg-muted text-sm w-64" />
        </div>
        {myStudents.length === 0 ? (
          <div className="text-center py-12"><p className="text-muted-foreground">📭 No tienes estudiantes asignados actualmente.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <div key={student.id} className="bg-muted/30 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{student.avatar}</span>
                  <div><h4 className="font-semibold text-foreground">{student.name}</h4><p className="text-xs text-muted-foreground">{student.email}</p></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Discapacidad:</span><span>{student.disability || 'Ninguna'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Promedio:</span><span className={student.avgGrade >= 70 ? 'text-green-600' : 'text-red-500'}>{student.avgGrade}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Riesgo:</span><span className={student.risk === 'high' ? 'text-red-600' : student.risk === 'medium' ? 'text-yellow-600' : 'text-green-600'}>{student.risk === 'high' ? 'Alto' : student.risk === 'medium' ? 'Medio' : 'Bajo'}</span></div>
                </div>
                <button onClick={() => setSelectedStudent(student)} className="w-full mt-3 py-2 rounded-full text-sm font-medium text-white" style={{ background: '#1e4668' }}>📋 Ver Expediente y Reportes</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentStatsCard
          student={selectedStudent}
          teacher={teacher}
          onClose={() => setSelectedStudent(null)}
          onReportSaved={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
      {showEditProfile && <EditProfileModal teacher={teacher} onClose={() => setShowEditProfile(false)} onUpdate={loadData} />}
    </div>
  );
}