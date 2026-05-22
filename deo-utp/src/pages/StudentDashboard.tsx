import { getAllCoordinators } from '../lib/database';
import type { Coordinator } from '../lib/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Task, StudyReminder, DailyReport } from '../lib/types';
import {
  getStudentByEmailOptimized, updateStudentMood, addTask, getAllTasks, deleteTask,
  addStudyReminder, getStudyReminders, addAuditLog,
  addDailyReport, getDailyReportsByStudent, updateStudentRiskAdvanced,
  getLast7DaysReports, getCompleteProgressStats
} from '../lib/database';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

const MOODS = [
  { value: 1, label: '😢 Muy mal', emoji: '😢', color: '#ef4444' },
  { value: 2, label: '😕 Mal', emoji: '😕', color: '#f97316' },
  { value: 3, label: '😐 Normal', emoji: '😐', color: '#eab308' },
  { value: 4, label: '🙂 Bien', emoji: '🙂', color: '#22c55e' },
  { value: 5, label: '😄 Muy bien', emoji: '😄', color: '#10b981' },
];

// ========== CU10: REGISTRAR REPORTE DIARIO ==========
interface DailyReportFormProps {
  studentId: number;
  studentName: string;
  studentEmail: string;
  onReportSaved: () => void;
}

function DailyReportForm({ studentId, studentName, studentEmail, onReportSaved }: DailyReportFormProps) {
  const { currentUser } = useAuth();
  const [mood, setMood] = useState(3);
  const [attended, setAttended] = useState(true);
  const [difficulties, setDifficulties] = useState('');
  const [achievements, setAchievements] = useState('');
  const [supportRequest, setSupportRequest] = useState('');
  const [completedGoals, setCompletedGoals] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  const DIFICULTY_OPTIONS = [
    'Comprensión de temas', 'Concentración', 'Carga de trabajo',
    'Relación con compañeros', 'Acceso a recursos', 'Salud/estrés', 
    'Motivación', 'Problemas técnicos', 'Horarios'
  ];

  const ACHIEVEMENT_OPTIONS = [
    'Entendí un tema difícil', 'Participé en clase', 'Entregué un trabajo',
    'Ayudé a un compañero', 'Me concentré mejor', 'Cumplí mis metas',
    'Recibí feedback positivo', 'Mejoré mi nota'
  ];

  const analyzeRiskContent = (text: string): { isRisk: boolean; level: 'low' | 'medium' | 'high'; keywords: string[] } => {
    const riskKeywords = {
      high: ['no puedo más', 'sin sentido', 'rendirme', 'suicidio', 'muerte', 'desaparecer', 'no valgo'],
      medium: ['depresión', 'ansiedad extrema', 'crisis', 'ayuda por favor', 'desesperado', 'no aguanto'],
      low: ['estresado', 'preocupado', 'cansado', 'difícil', 'agotado']
    };
    
    const found: string[] = [];
    let level: 'low' | 'medium' | 'high' = 'low';
    
    for (const keyword of riskKeywords.high) {
      if (text.toLowerCase().includes(keyword)) {
        found.push(keyword);
        level = 'high';
        break;
      }
    }
    
    if (level !== 'high') {
      for (const keyword of riskKeywords.medium) {
        if (text.toLowerCase().includes(keyword)) {
          found.push(keyword);
          level = 'medium';
          break;
        }
      }
    }
    
    if (level !== 'high' && level !== 'medium') {
      for (const keyword of riskKeywords.low) {
        if (text.toLowerCase().includes(keyword)) {
          found.push(keyword);
          level = 'low';
        }
      }
    }
    
    return { isRisk: found.length > 0, level, keywords: found };
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    
    const difficultiesList = difficulties.split(',').map(d => d.trim()).filter(Boolean);
    const achievementsList = achievements.split(',').map(a => a.trim()).filter(Boolean);
    const goalsList = completedGoals.split(',').map(g => g.trim()).filter(Boolean);
    
    if (difficultiesList.length === 0 && achievementsList.length === 0 && goalsList.length === 0 && !supportRequest) {
      alert('Por favor completa al menos un campo (dificultades, logros o metas) antes de guardar.');
      return;
    }
    
    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];

    const fullText = `${difficulties} ${achievements} ${supportRequest} ${completedGoals}`;
    const riskAnalysis = analyzeRiskContent(fullText);
    
    if (riskAnalysis.isRisk) {
      setShowCrisisResources(true);
      await addAuditLog(
        `🚨 PROTOCOLO DE CRISIS - Estudiante ${studentId} (${studentName}) - Nivel: ${riskAnalysis.level}`,
        `student_${studentId}`,
        'student',
        fullText.substring(0, 200)
      );
    }

    await addDailyReport({
      studentId,
      studentEmail: currentUser.email,
      studentName,
      mood,
      attended,
      difficulties: difficultiesList,
      achievements: achievementsList,
      supportRequest,
      completedGoals: goalsList,
      riskDetected: riskAnalysis.isRisk,
      riskLevel: riskAnalysis.level,
      createdAt: new Date().toISOString(),
      date: today
    } as any);

    await updateStudentMood(studentId, mood);
    await updateStudentRiskAdvanced(studentId);
    
    const recentReports = await getLast7DaysReports(studentId);
    const positiveDays = recentReports.filter(r => r.mood >= 4).length;
    
    let motivacionalMessage = '';
    if (positiveDays >= 4 && mood >= 4) {
      motivacionalMessage = `🎉 ¡Increíble! Llevas ${positiveDays} días con ánimo positivo. ¡Sigue así! 🌟`;
    } else if (achievementsList.length > 0) {
      motivacionalMessage = `✨ ¡Gran trabajo con tus logros! "${achievementsList[0]}" es un gran avance. 💪`;
    } else if (mood >= 4) {
      motivacionalMessage = `😊 ¡Qué bueno que te sientes bien hoy! Cada paso cuenta.`;
    } else if (mood <= 2) {
      motivacionalMessage = `💙 Gracias por compartir cómo te sientes. El equipo DEO está aquí para apoyarte.`;
    } else {
      motivacionalMessage = `📝 ¡Reporte guardado! Gracias por mantenernos al tanto.`;
    }
    
    setSuccessMessage(motivacionalMessage);
    await addAuditLog(`Reporte diario: Ánimo=${mood}/5, Asistencia=${attended ? 'Sí' : 'No'}`, currentUser.email, 'student');
    
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setDifficulties('');
    setAchievements('');
    setSupportRequest('');
    setCompletedGoals('');
    setMood(3);
    setAttended(true);
    
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage('');
      onReportSaved();
    }, 4000);
  };

  return (
    <div className="space-y-5">
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
        </div>
      )}
      
      {showCrisisResources && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 rounded-xl p-5 mb-4">
          <h4 className="font-bold text-red-700 dark:text-red-300 text-lg mb-2">🚨 Recursos de Apoyo Emergente</h4>
          <p className="text-red-600 dark:text-red-200 text-sm mb-3">Detectamos que podrías estar pasando por un momento difícil. No estás solo/a.</p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>📞 <strong>Línea de crisis DEO:</strong> 800-123-4567 (24/7)</li>
            <li>💬 <strong>Chat de apoyo emocional:</strong> disponible en el portal</li>
            <li>🏥 <strong>Servicio de psicología UTP:</strong> agenda tu cita al 555-7890</li>
          </ul>
          <button onClick={() => setShowCrisisResources(false)} className="mt-3 text-sm px-4 py-2 rounded-lg bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200">Entiendo, gracias</button>
        </div>
      )}

      <div>
        <label className="font-semibold mb-3 block text-foreground text-lg">❤️ ¿Cómo te sientes hoy?</label>
        <div className="flex gap-3 flex-wrap justify-center">
          {MOODS.map(m => (
            <button key={m.value} onClick={() => setMood(m.value)} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:scale-105 ${mood === m.value ? 'ring-2 ring-primary scale-105 bg-primary/10' : 'bg-muted hover:bg-muted/80'}`}>
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs text-foreground">{m.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <label className="font-semibold mb-3 block text-foreground">📚 Asistencia a clases</label>
        <div className="flex gap-6 justify-center">
          <label className="flex items-center gap-3 cursor-pointer p-2 px-4 rounded-lg hover:bg-muted">
            <input type="radio" checked={attended} onChange={() => setAttended(true)} className="w-5 h-5 accent-green-600" />
            <span className="text-foreground">✅ Asistí a todas</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-2 px-4 rounded-lg hover:bg-muted">
            <input type="radio" checked={!attended} onChange={() => setAttended(false)} className="w-5 h-5 accent-red-600" />
            <span className="text-foreground">❌ Falté a alguna(s)</span>
          </label>
        </div>
      </div>

      <div>
        <label className="font-semibold mb-2 block text-foreground">⚠️ Dificultades encontradas</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {DIFICULTY_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => setDifficulties(prev => prev ? `${prev}, ${opt}` : opt)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground">+ {opt}</button>
          ))}
        </div>
        <textarea value={difficulties} onChange={e => setDifficulties(e.target.value)} placeholder="Describe las dificultades (separadas por coma)" className="w-full p-3 rounded-xl bg-muted text-foreground text-sm resize-none" rows={2} />
      </div>

      <div>
        <label className="font-semibold mb-2 block text-foreground">🌟 Logros del día</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {ACHIEVEMENT_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => setAchievements(prev => prev ? `${prev}, ${opt}` : opt)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground">+ {opt}</button>
          ))}
        </div>
        <textarea value={achievements} onChange={e => setAchievements(e.target.value)} placeholder="¿Qué logros tuviste? (separados por coma)" className="w-full p-3 rounded-xl bg-muted text-foreground text-sm resize-none" rows={2} />
      </div>

      <div>
        <label className="font-semibold mb-2 block text-foreground">🎯 Metas que cumpliste hoy</label>
        <input value={completedGoals} onChange={e => setCompletedGoals(e.target.value)} placeholder="Ej: Estudiar 2 horas, Leer capítulo 3" className="w-full p-3 rounded-xl bg-muted text-foreground text-sm" />
      </div>

      <div>
        <label className="font-semibold mb-2 block text-foreground">📢 ¿Necesitas apoyo del equipo DEO?</label>
        <textarea value={supportRequest} onChange={e => setSupportRequest(e.target.value)} placeholder="Describe qué ayuda necesitas..." className="w-full p-3 rounded-xl bg-muted text-foreground text-sm resize-none" rows={3} />
      </div>

      <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 text-lg" style={{ background: '#2c5f8a' }}>
        {isSubmitting ? '📤 Guardando...' : '📝 Guardar Reporte Diario'}
      </button>
    </div>
  );
}

// ========== CU11: CONSULTAR PROGRESO PERSONAL ==========
interface ProgressComparisonProps {
  student: Student;
}

function ProgressComparison({ student }: ProgressComparisonProps) {
  const [stats, setStats] = useState<any>(null);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonPeriod, setComparisonPeriod] = useState<'week' | 'month' | 'semester'>('week');
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      if (!student.id) return;
      const [progressStats, reports] = await Promise.all([
        getCompleteProgressStats(student.id),
        getDailyReportsByStudent(student.id)
      ]);
      setStats(progressStats);
      setDailyReports(reports);
      setLoading(false);
    }
    loadProgress();
  }, [student.id]);

  const generateReport = () => {
    const reportContent = `INFORME DE PROGRESO - ${student.name}
Fecha: ${new Date().toLocaleDateString()}

=== RESUMEN EJECUTIVO ===
• Ánimo promedio (semana): ${stats?.weeklyMood.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7 || 0}/5
• Tasa de asistencia: ${(dailyReports.filter(r => r.attended).length / (dailyReports.length || 1) * 100).toFixed(0)}%
• Racha positiva: ${stats?.positiveStreak || 0} días
• Nivel de riesgo: ${stats?.riskLevel || 'bajo'}

=== RECOMENDACIONES ===
${stats?.recommendations?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

=== HISTORIAL RECIENTE ===
${dailyReports.slice(-7).map(r => `• ${r.date}: Ánimo ${r.mood}/5, Asistencia: ${r.attended ? 'Sí' : 'No'}`).join('\n')}`;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progreso_${student.name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog(`Reporte de progreso generado por ${student.name}`, student.email, 'student');
    alert('📄 Reporte generado correctamente');
  };

  if (loading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-muted-foreground">Cargando estadísticas...</p></div>;
  if (!stats || dailyReports.length === 0) return <div className="text-center py-12"><p className="text-muted-foreground">📊 No hay datos suficientes. Completa tus reportes diarios.</p></div>;

  let chartData: { fecha: string; animo: number }[] = [];
  let comparisonData = { previousAvg: 0, currentAvg: 0, improvement: 0 };
  
  if (comparisonPeriod === 'week') {
    chartData = dailyReports.slice(-7).map(r => ({ fecha: new Date(r.date).toLocaleDateString('es', { weekday: 'short' }), animo: r.mood }));
    const currentWeek = stats.weeklyMood.slice(-7);
    const previousWeek = stats.weeklyMood.slice(-14, -7);
    comparisonData.currentAvg = currentWeek.reduce((a: number, b: number) => a + b, 0) / (currentWeek.length || 1);
    comparisonData.previousAvg = previousWeek.reduce((a: number, b: number) => a + b, 0) / (previousWeek.length || 1);
    comparisonData.improvement = ((comparisonData.currentAvg - comparisonData.previousAvg) / (comparisonData.previousAvg || 1)) * 100;
  } else if (comparisonPeriod === 'month') {
    chartData = dailyReports.slice(-30).map(r => ({ fecha: new Date(r.date).toLocaleDateString('es', { day: 'numeric', month: 'short' }), animo: r.mood }));
    comparisonData.currentAvg = stats.monthlyMood.slice(-30).reduce((a: number, b: number) => a + b, 0) / 30;
    comparisonData.previousAvg = stats.monthlyMood.slice(-60, -30).reduce((a: number, b: number) => a + b, 0) / 30;
    comparisonData.improvement = ((comparisonData.currentAvg - comparisonData.previousAvg) / (comparisonData.previousAvg || 1)) * 100;
  }

  const attendanceRate = (dailyReports.filter(r => r.attended).length / (dailyReports.length || 1) * 100).toFixed(0);
  const recentMoodAvg = stats.weeklyMood.slice(-7).reduce((a: number, b: number) => a + b, 0) / Math.min(7, stats.weeklyMood.length);
  const isNegativeTrend = stats.negativeStreak >= 3 || recentMoodAvg <= 2.5;
  const isPositiveTrend = comparisonData.improvement > 10 || stats.positiveStreak >= 4;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><button onClick={generateReport} className="text-sm px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">📄 Generar Reporte</button></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center"><div className="text-2xl">📊</div><div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{recentMoodAvg.toFixed(1)}<span className="text-sm">/5</span></div><div className="text-xs text-muted-foreground">Ánimo promedio</div></div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center"><div className="text-2xl">📚</div><div className="text-2xl font-bold text-green-700 dark:text-green-300">{attendanceRate}<span className="text-sm">%</span></div><div className="text-xs text-muted-foreground">Asistencia</div></div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 text-center"><div className="text-2xl">🔥</div><div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.positiveStreak}</div><div className="text-xs text-muted-foreground">Días positivos</div></div>
        <div className={`rounded-xl p-4 text-center ${stats.riskLevel === 'high' ? 'bg-red-50 dark:bg-red-900/30' : stats.riskLevel === 'medium' ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
          <div className="text-2xl">⚠️</div><div className={`text-2xl font-bold ${stats.riskLevel === 'high' ? 'text-red-700 dark:text-red-300' : stats.riskLevel === 'medium' ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>{stats.riskLevel === 'high' ? 'Alto' : stats.riskLevel === 'medium' ? 'Medio' : 'Bajo'}</div>
          <div className="text-xs text-muted-foreground">Nivel de riesgo</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3 text-foreground">📅 Comparar Períodos</h4>
        <div className="flex gap-2 mb-4">
          {(['week', 'month'] as const).map(p => (<button key={p} onClick={() => setComparisonPeriod(p)} className={`text-sm px-4 py-2 rounded-full transition-all ${comparisonPeriod === p ? 'bg-primary text-white shadow-md' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>{p === 'week' ? '📊 Semana' : '📅 Mes'}</button>))}
        </div>
        <div className={`p-4 rounded-xl mb-4 ${isPositiveTrend ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : isNegativeTrend ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200' : 'bg-muted/30'}`}>
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-muted-foreground">Período anterior</p><p className="text-2xl font-bold text-foreground">{comparisonData.previousAvg.toFixed(1)}<span className="text-sm">/5</span></p></div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div><p className="text-sm text-muted-foreground">Período actual</p><p className="text-2xl font-bold text-foreground">{comparisonData.currentAvg.toFixed(1)}<span className="text-sm">/5</span></p></div>
            <div className={`text-lg font-semibold ${comparisonData.improvement >= 0 ? 'text-green-600' : 'text-red-500'}`}>{comparisonData.improvement >= 0 ? '+' : ''}{comparisonData.improvement.toFixed(1)}%</div>
          </div>
          {isPositiveTrend && <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg"><p className="text-green-700 dark:text-green-300">📈 {comparisonData.improvement > 10 ? `¡Mejora significativa! +${comparisonData.improvement.toFixed(1)}%` : 'Tendencia positiva detectada. ¡Sigue así!'}</p></div>}
          {isNegativeTrend && <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-lg"><p className="text-orange-700 dark:text-orange-300">📉 Se detecta tendencia descendente. Recomendamos contactar al equipo DEO.</p></div>}
        </div>
      </div>

      {chartData.length > 0 && (
        <div><h4 className="font-semibold mb-3 text-foreground">📈 Evolución de estado anímico</h4><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fecha" tick={{ fill: 'currentColor' }} /><YAxis domain={[0, 5]} tick={{ fill: 'currentColor' }} /><Tooltip /><Area type="monotone" dataKey="animo" stroke="#2c5f8a" fill="#2c5f8a" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div></div>
      )}

      {showRecommendations && (
        <div className={`rounded-xl p-5 ${isNegativeTrend ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
          <div className="flex justify-between items-center mb-3"><h4 className="font-semibold text-foreground">💡 Recomendaciones personalizadas</h4><button onClick={() => setShowRecommendations(false)} className="text-xs text-muted-foreground">Ocultar</button></div>
          <ul className="space-y-2">{stats.recommendations.map((rec: string, idx: number) => (<li key={idx} className="text-sm text-foreground">• {rec}</li>))}</ul>
        </div>
      )}
    </div>
  );
}

// ========== COMPONENTE PRINCIPAL ==========
export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [assignedCoordinator, setAssignedCoordinator] = useState<Coordinator | null>(null);
  const [moodFeedback, setMoodFeedback] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [newTask, setNewTask] = useState('');
  const [iaCmd, setIaCmd] = useState('');
  const [iaResponse, setIaResponse] = useState('');
  const [alertMsg, setAlertMsg] = useState('Sin notificaciones nuevas');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily-report' | 'progress'>('dashboard');
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  const [showReminderNotification, setShowReminderNotification] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false); // Estado para colapsar info personal

  const loadData = useCallback(async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    
    try {
      const [found, allTasks, allReminders, allCoordinators] = await Promise.all([
        getStudentByEmailOptimized(currentUser.email),
        getAllTasks(),
        getStudyReminders(),
        getAllCoordinators()
      ]);
      
      setStudent(found ?? null);
      setCoordinators(allCoordinators);
      setTasks(allTasks.filter(t => t.userEmail === currentUser.email));
      setReminders(allReminders.filter(r => r.userEmail === currentUser.email));
      
      if (found) {
        const coord = allCoordinators.find(c => c.id === found.coordinatorId);
        setAssignedCoordinator(coord || null);
        
        const recentReports = await getLast7DaysReports(found.id!);
        const stats = await getCompleteProgressStats(found.id);
        
        const lastReportDate = recentReports[0]?.date;
        const today = new Date().toISOString().split('T')[0];
        if (lastReportDate !== today && recentReports.length > 0) {
          setShowReminderNotification(true);
          setTimeout(() => setShowReminderNotification(false), 5000);
        }
        
        if (found.absences >= 3) {
          setAlertMsg(`⚠️ Tienes ${found.absences} inasistencias. Se ha notificado al DEO.`);
        } else if (stats.riskLevel === 'high') {
          setAlertMsg('⚠️ Alerta: Situación que requiere atención. El equipo DEO se contactará contigo.');
        } else if (stats.negativeStreak >= 2) {
          setAlertMsg(`⚠️ Has reportado ánimo bajo ${stats.negativeStreak} días seguidos.`);
        } else {
          setAlertMsg('Sin notificaciones nuevas');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMood = useCallback(async (value: number) => {
    if (!student?.id || isSubmittingMood) return;
    setIsSubmittingMood(true);
    try {
      await updateStudentMood(student.id, value);
      await updateStudentRiskAdvanced(student.id);
      setMoodFeedback(`✅ Estado de ánimo ${value}/5 registrado.`);
      if (value <= 2) {
        setAlertMsg('⚠️ Alerta de bienestar emocional - Se ha notificado al DEO');
        await addAuditLog(`Estado de ánimo bajo (${value}/5) reportado por ${student.name}`, student.email, 'student');
      } else if (value >= 4) {
        setMoodFeedback(`😊 ¡Qué bueno que te sientes bien! Sigue así.`);
      }
      const updated = await getStudentByEmailOptimized(student.email);
      setStudent(updated ?? null);
      setTimeout(() => setMoodFeedback(''), 3000);
    } finally {
      setIsSubmittingMood(false);
    }
  }, [student, isSubmittingMood]);

  const handleAddTask = useCallback(async () => {
    if (!newTask.trim() || !currentUser) return;
    await addTask({ text: newTask, userEmail: currentUser.email, createdAt: new Date(), completed: false });
    setNewTask('');
    const allTasks = await getAllTasks();
    setTasks(allTasks.filter(t => t.userEmail === currentUser?.email));
  }, [newTask, currentUser]);

  const handleDeleteTask = useCallback(async (id: number) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleGenerateStudyPlan = useCallback(async () => {
    if (!student || !currentUser) return;
    
    const coursesList = student.courses.map(c => typeof c === 'string' ? c : c.courseName);
    const randomCourse = coursesList[Math.floor(Math.random() * coursesList.length)] || 'el primer curso';
    
    const studyTopics: Record<string, string> = {
      'Matemáticas': 'resolver ejercicios de álgebra y cálculo',
      'Física': 'repasar leyes y fórmulas físicas',
      'Programación': 'practicar ejercicios de código en JavaScript',
      'Literatura': 'leer y analizar textos literarios',
      'Inglés': 'practicar vocabulario y gramática',
      'Química': 'repasar ecuaciones químicas y tabla periódica',
      'Historia': 'repasar fechas y eventos importantes',
      'Biología': 'estudiar conceptos de biología celular'
    };
    
    const defaultTopic = `revisar los temas de ${randomCourse}`;
    const studyTopic = studyTopics[randomCourse] || defaultTopic;
    const text = `📚 ${randomCourse}: ${studyTopic} - Plan de estudio semanal (IA)`;
    
    await addStudyReminder({ text, userEmail: currentUser.email, createdAt: new Date() } as any);
    const all = await getStudyReminders();
    setReminders(all.filter(r => r.userEmail === currentUser?.email));
    setIaResponse(`✅ Plan de estudio generado para ${randomCourse}`);
    setTimeout(() => setIaResponse(''), 3000);
  }, [student, currentUser]);

  const handleIaCommand = useCallback(async () => {
    if (!currentUser) return;
    const cmd = iaCmd.toLowerCase().trim();
    if (!cmd) return;
    
    if (cmd.includes('recordatorio')) {
      await addStudyReminder({ text: iaCmd, userEmail: currentUser.email, createdAt: new Date() } as any);
      setIaResponse('✅ Recordatorio guardado');
      const all = await getStudyReminders();
      setReminders(all.filter(r => r.userEmail === currentUser?.email));
    } else if (cmd.includes('tarea')) {
      const taskText = iaCmd.replace(/tarea|:/g, '').trim();
      await addTask({ text: taskText, userEmail: currentUser.email, createdAt: new Date(), completed: false });
      setIaResponse('📋 Tarea agregada');
      const allTasks = await getAllTasks();
      setTasks(allTasks.filter(t => t.userEmail === currentUser?.email));
    } else {
      setIaResponse('🤖 Comandos: "recordatorio: ..." o "tarea: ..."');
    }
    setIaCmd('');
    setTimeout(() => setIaResponse(''), 3000);
  }, [iaCmd, currentUser]);

  const moodData = useMemo(() => {
    if (!student?.moodHistory) return [];
    return student.moodHistory.slice(-7).map((v, i) => ({ dia: `Día ${i + 1}`, animo: v }));
  }, [student?.moodHistory]);

  const avgMood = useMemo(() => {
    if (!student?.moodHistory.length) return '—';
    return (student.moodHistory.reduce((a, b) => a + b, 0) / student.moodHistory.length).toFixed(1);
  }, [student?.moodHistory]);

  if (loading) {
    return <div className="flex flex-col items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div><p className="text-muted-foreground">Cargando tu panel...</p></div>;
  }
  
  if (!student) return <div className="text-center p-8 text-muted-foreground">Estudiante no encontrado</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-8">
      {showReminderNotification && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          🔔 ¡No olvides completar tu reporte diario! <button onClick={() => setActiveTab('daily-report')} className="underline font-medium">Registrar ahora →</button>
        </div>
      )}

      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-3xl font-bold text-foreground">Panel del Estudiante</h1><p className="text-muted-foreground text-lg">{student.avatar} {student.name}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-md' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>📊 Dashboard</button>
          <button onClick={() => setActiveTab('daily-report')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'daily-report' ? 'bg-primary text-white shadow-md' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>📝 Reporte Diario</button>
          <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'progress' ? 'bg-primary text-white shadow-md' : 'bg-muted hover:bg-muted/80 text-foreground'}`}>📈 Mi Progreso</button>
        </div>
      </div>

      {alertMsg !== 'Sin notificaciones nuevas' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 dark:text-red-300">🔔 {alertMsg}</div>
      )}

      {/* ========== INFO PERSONAL Y CURSOS - SECCIÓN COLABSABLE ========== */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowPersonalInfo(!showPersonalInfo)}
          className="w-full flex justify-between items-center p-4 hover:bg-muted/30 transition-colors"
        >
          <span className="font-semibold text-lg text-foreground">📋 Mi Información Personal y Cursos</span>
          <span className="text-2xl text-muted-foreground">{showPersonalInfo ? '▲' : '▼'}</span>
        </button>
        
        {showPersonalInfo && (
          <div className="p-6 pt-0 border-t border-border space-y-6">
            {/* Datos de contacto y coordinador */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-muted/30 rounded-xl p-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">📱 Teléfono</label>
                <p className="font-medium text-foreground">{student.phone || 'No registrado'}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">🏠 Dirección</label>
                <p className="font-medium text-foreground">{student.address || 'No registrada'}</p>
              </div>
              {assignedCoordinator && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 md:col-span-2">
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">👔 Coordinador DEO asignado</label>
                  <p className="font-medium text-foreground">{assignedCoordinator.name}</p>
                  <p className="text-sm text-muted-foreground">{assignedCoordinator.department}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">📞 Contacto para apoyo académico y personal</p>
                </div>
              )}
            </div>

            {/* Botón editar perfil */}
            <div className="flex justify-end">
              <button onClick={() => window.location.href = '/perfil'} className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors">
                ✏️ Editar mi perfil
              </button>
            </div>

            {/* Cursos con profesores */}
            <div>
              <h3 className="font-semibold text-md mb-3 text-foreground">📚 Mis Cursos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {student.courses.map((course, idx) => {
                  const courseName = typeof course === 'string' ? course : course.courseName;
                  const teacherName = typeof course === 'string' ? 'Por asignar' : course.teacherName;
                  const schedule = typeof course === 'string' ? 'Horario por definir' : course.schedule;
                  const classroom = typeof course === 'string' ? 'Aula por definir' : course.classroom;
                  return (
                    <div key={idx} className="bg-muted/30 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2"><span className="text-xl">📖</span><h4 className="font-semibold text-foreground">{courseName}</h4></div>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">👨‍🏫 Profesor: <span className="text-foreground font-medium">{teacherName}</span></p>
                        <p className="text-muted-foreground">⏰ Horario: <span className="text-foreground">{schedule}</span></p>
                        <p className="text-muted-foreground">🏛️ Aula: <span className="text-foreground">{classroom}</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-foreground">❤️ ¿Cómo te sientes hoy?</h3>
              <div className="flex gap-3 flex-wrap justify-center">
                {MOODS.map(m => (
                  <button key={m.value} onClick={() => handleMood(m.value)} disabled={isSubmittingMood} className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:scale-105 bg-muted disabled:opacity-50 transition-all">
                    <span className="text-2xl">{m.emoji}</span><span className="text-xs text-foreground">{m.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
              {moodFeedback && <p className="mt-3 text-sm text-green-600 dark:text-green-400 text-center">{moodFeedback}</p>}
              <h3 className="font-semibold text-lg mt-6 mb-3 text-foreground">📈 Evolución de ánimo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={moodData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="dia" tick={{ fill: 'currentColor' }} /><YAxis domain={[0, 5]} tick={{ fill: 'currentColor' }} /><Tooltip /><Line type="monotone" dataKey="animo" stroke="#2c5f8a" strokeWidth={2} dot={{ r: 5 }} /></LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-foreground">🎓 Rendimiento Académico</h3>
              <div className="space-y-4">
                <div className="flex justify-between pb-2 border-b border-border"><span className="text-muted-foreground">Promedio general</span><span className={`text-2xl font-bold ${student.avgGrade >= 70 ? 'text-green-600' : 'text-red-500'}`}>{student.avgGrade}%</span></div>
                <div className="flex justify-between pb-2 border-b border-border"><span className="text-muted-foreground">Inasistencias</span><span className={`text-xl font-bold ${student.absences >= 3 ? 'text-red-500' : 'text-foreground'}`}>{student.absences}</span></div>
                <div className="flex justify-between pb-2 border-b border-border"><span className="text-muted-foreground">Ánimo promedio</span><span className="text-xl font-bold text-foreground">{avgMood}/5</span></div>
                <div><p className="text-sm text-muted-foreground mb-2">Cursos actuales:</p><div className="flex flex-wrap gap-2">{student.courses.map(c => (<span key={typeof c === 'string' ? c : c.courseName} className="text-sm px-3 py-1 bg-muted rounded-full text-foreground">📚 {typeof c === 'string' ? c : c.courseName}</span>))}</div></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-foreground">🏅 Logros recientes</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl"><span className="text-2xl">🏅</span><div><p className="font-medium text-foreground">Perseverancia</p><p className="text-xs text-muted-foreground">Por mantener constancia</p></div></div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><span className="text-2xl">📖</span><div><p className="font-medium text-foreground">Mejora académica</p><p className="text-xs text-muted-foreground">Progreso en tus estudios</p></div></div>
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl"><span className="text-2xl">🎯</span><div><p className="font-medium text-foreground">Participación activa</p><p className="text-xs text-muted-foreground">Compromiso en clases</p></div></div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-lg mb-4 text-foreground">🔔 Notificaciones</h3>
              {student.alerts.length > 0 ? student.alerts.map((a, i) => (<div key={i} className="text-sm p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-700 dark:text-orange-300">⚠️ {a}</div>)) : <p className="text-muted-foreground text-center py-8">📭 Sin notificaciones</p>}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border shadow-sm">
            <h3 className="font-semibold text-xl mb-5 text-foreground">🤖 Asistente Personal IA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><h4 className="font-semibold mb-3 text-foreground">📋 Mis tareas</h4><div className="space-y-2 max-h-40 overflow-y-auto">{tasks.slice(0, 5).map(t => (<div key={t.id} className="flex justify-between p-2 bg-muted rounded-lg"><span className="text-sm text-foreground">📌 {t.text}</span><button onClick={() => handleDeleteTask(t.id!)} className="text-green-600">✅</button></div>))}{tasks.length === 0 && <p className="text-sm text-muted-foreground">✨ Sin tareas</p>}</div><div className="flex gap-2 mt-3"><input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Nueva tarea..." className="flex-1 text-sm bg-muted rounded-full px-3 py-2 text-foreground placeholder:text-muted-foreground" onKeyDown={e => e.key === 'Enter' && handleAddTask()} /><button onClick={handleAddTask} className="px-3 py-2 rounded-full font-medium text-white hover:opacity-90 transition-all" style={{ background: '#1e4668' }}>+</button></div></div>
              <div><h4 className="font-semibold mb-3 text-foreground">🧠 Estudio espaciado</h4><div className="space-y-2 max-h-40 overflow-y-auto mb-3">{reminders.slice(-3).map((r, i) => (<div key={i} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-foreground">🧠 {r.text}</div>))}{reminders.length === 0 && <p className="text-sm text-muted-foreground">📚 Sin recordatorios</p>}</div><button onClick={handleGenerateStudyPlan} className="text-sm px-4 py-2 rounded-full font-medium text-white hover:opacity-90 transition-all" style={{ background: '#3a7b5c' }}>🎲 Generar plan de estudio</button></div>
              <div><h4 className="font-semibold mb-3 text-foreground">💬 Comandos IA</h4><div className="flex gap-2 mb-2"><input value={iaCmd} onChange={e => setIaCmd(e.target.value)} placeholder='"Recordatorio: Estudiar..."' className="flex-1 text-sm bg-muted rounded-full px-3 py-2 text-foreground placeholder:text-muted-foreground" onKeyDown={e => e.key === 'Enter' && handleIaCommand()} /><button onClick={handleIaCommand} className="px-3 py-2 rounded-full font-medium text-white hover:opacity-90 transition-all" style={{ background: '#3a7b5c' }}>→</button></div>{iaResponse && <div className="text-xs p-3 bg-muted rounded-lg mt-2 text-foreground">{iaResponse}</div>}<p className="text-xs text-muted-foreground mt-2">Ej: "Recordatorio: Repasar mate" o "Tarea: Entregar ensayo"</p></div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'daily-report' && (
        <div className="bg-card rounded-2xl p-6 border shadow-sm">
          <div className="text-center mb-6"><h2 className="text-2xl font-bold text-foreground">📝 Reporte Diario</h2><p className="text-muted-foreground mt-1">Completa este formulario para que el equipo DEO pueda darte el mejor acompañamiento</p></div>
          <DailyReportForm studentId={student.id!} studentName={student.name} studentEmail={student.email} onReportSaved={loadData} />
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="bg-card rounded-2xl p-6 border shadow-sm">
          <div className="text-center mb-6"><h2 className="text-2xl font-bold text-foreground">📈 Mi Progreso Personal</h2><p className="text-muted-foreground mt-1">Visualiza tu evolución y recibe recomendaciones personalizadas</p></div>
          <ProgressComparison student={student} />
        </div>
      )}
    </div>
  );
}