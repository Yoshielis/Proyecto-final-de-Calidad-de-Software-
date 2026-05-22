import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Task, StudyReminder } from '../lib/types';
import {
  getAllStudents, updateStudentMood, addTask, getAllTasks, deleteTask,
  addStudyReminder, getStudyReminders, addAuditLog
} from '../lib/database';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const MOODS = [
  { value: 1, label: '😢 Muy mal' },
  { value: 2, label: '😕 Mal' },
  { value: 3, label: '😐 Normal' },
  { value: 4, label: '🙂 Bien' },
  { value: 5, label: '😄 Muy bien' },
];

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [moodFeedback, setMoodFeedback] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [newTask, setNewTask] = useState('');
  const [iaCmd, setIaCmd] = useState('');
  const [iaResponse, setIaResponse] = useState('');
  const [alertMsg, setAlertMsg] = useState('Sin notificaciones nuevas');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const students = await getAllStudents();
    const found = students.find(s => s.email === currentUser?.email);
    setStudent(found ?? null);
    const allTasks = await getAllTasks();
    setTasks(allTasks.filter(t => t.userEmail === currentUser?.email));
    const allReminders = await getStudyReminders();
    setReminders(allReminders.filter(r => r.userEmail === currentUser?.email));
    if (found && found.absences >= 3) setAlertMsg(`⚠️ Tienes ${found.absences} inasistencias. Se ha notificado al DEO.`);
    if (found && (found.moodHistory[found.moodHistory.length - 1] ?? 3) <= 2) setAlertMsg('⚠️ Alerta de bienestar emocional - Se ha notificado al DEO.');
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleMood(value: number) {
    if (!student?.id) return;
    await updateStudentMood(student.id, value);
    setMoodFeedback(`✅ Estado de ánimo ${value}/5 registrado.`);
    if (value <= 2) {
      setAlertMsg('⚠️ Alerta de bienestar emocional - Se ha notificado al DEO');
      await addAuditLog(`Estado de ánimo bajo (${value}/5) reportado por ${student.name}`, student.email);
    }
    await loadData();
  }

  async function handleAddTask() {
    if (!newTask.trim()) return;
    await addTask({ text: newTask, userEmail: currentUser!.email, createdAt: new Date(), completed: false });
    setNewTask('');
    const allTasks = await getAllTasks();
    setTasks(allTasks.filter(t => t.userEmail === currentUser?.email));
  }

  async function handleDeleteTask(id: number) {
    await deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  async function handleGenerateStudyPlan() {
    if (!student) return;
    const text = `Repasar ${student.courses[0] || 'el primer curso'} - Plan de estudio semanal`;
    await addStudyReminder({ text, userEmail: currentUser!.email, createdAt: new Date() });
    const all = await getStudyReminders();
    setReminders(all.filter(r => r.userEmail === currentUser?.email));
    setIaResponse('✅ Plan de estudio generado exitosamente');
  }

  async function handleIaCommand() {
    const cmd = iaCmd.toLowerCase().trim();
    if (!cmd) return;
    if (cmd.includes('recordatorio')) {
      await addStudyReminder({ text: iaCmd, userEmail: currentUser!.email, createdAt: new Date() });
      setIaResponse('✅ Recordatorio guardado correctamente');
      const all = await getStudyReminders();
      setReminders(all.filter(r => r.userEmail === currentUser?.email));
    } else if (cmd.includes('tarea')) {
      await addTask({ text: cmd.replace('tarea', '').trim(), userEmail: currentUser!.email, createdAt: new Date(), completed: false });
      setIaResponse('📋 Tarea agregada a tu lista');
      const allTasks = await getAllTasks();
      setTasks(allTasks.filter(t => t.userEmail === currentUser?.email));
    } else {
      setIaResponse('🤖 Comandos disponibles: "recordatorio: ..." o "tarea: ..."');
    }
    setIaCmd('');
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  if (!student) return <div className="text-center text-muted-foreground p-8">Estudiante no encontrado</div>;

  const moodData = student.moodHistory.slice(-7).map((v, i) => ({ dia: `Día ${i + 1}`, animo: v }));
  const avgMood = student.moodHistory.length > 0 ? (student.moodHistory.reduce((a, b) => a + b, 0) / student.moodHistory.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Panel del Estudiante</h1>
        <p className="text-muted-foreground text-lg mt-1">{student.avatar} {student.name}</p>
      </div>

      {/* Alert */}
      {alertMsg !== 'Sin notificaciones nuevas' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl px-4 py-3 text-sm font-medium">
          {alertMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Mood */}
        <div className="col-span-1 md:col-span-2 bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">❤️ ¿Cómo te sientes hoy?</h3>
          <div className="flex gap-3 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => handleMood(m.value)}
                className="text-sm px-4 py-2 rounded-full transition-all duration-150 font-medium hover:scale-105"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
              >
                {m.label}
              </button>
            ))}
          </div>
          {moodFeedback && <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">{moodFeedback}</p>}

          <h3 className="font-semibold text-lg mt-6 mb-3">📈 Evolución de ánimo (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="animo" stroke="#2c5f8a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Academic */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">🎓 Rendimiento Académico</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Promedio general</span>
              <strong className="text-xl" style={{ color: student.avgGrade >= 75 ? '#27ae60' : '#e74c3c' }}>{student.avgGrade}%</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Inasistencias</span>
              <strong className={student.absences >= 3 ? 'text-red-500' : 'text-foreground'}>{student.absences}</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Ánimo promedio</span>
              <strong>{avgMood}/5</strong>
            </div>
            <div className="pt-2">
              <p className="text-muted-foreground text-sm mb-2">Cursos actuales:</p>
              <ul className="space-y-1">
                {student.courses.map(c => (
                  <li key={c} className="text-sm flex items-center gap-2">
                    <span>📚</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {alertMsg !== 'Sin notificaciones nuevas' && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs text-red-600 dark:text-red-300">
              🔔 {alertMsg}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">🏅 Logros recientes</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">🏅 Perseverancia - Asistencia perfecta</li>
            <li className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">📖 Mejora en comprensión lectora</li>
            <li className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">🎯 Participación activa en clases</li>
          </ul>
        </div>

        {/* Alerts / Notifications */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="font-semibold text-lg mb-4">🔔 Notificaciones</h3>
          {student.alerts.length > 0 ? (
            <ul className="space-y-2">
              {student.alerts.map((a, i) => (
                <li key={i} className="text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-700 dark:text-orange-300">
                  ⚠️ {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Sin notificaciones nuevas</p>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="font-semibold text-xl mb-5">🤖 Asistente Personal IA - Tareas y Recordatorios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tasks */}
          <div>
            <h4 className="font-semibold mb-3">📋 Mis tareas pendientes</h4>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">✨ No tienes tareas pendientes</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {tasks.map(t => (
                  <li key={t.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-xl">
                    <span>📌 {t.text}</span>
                    <button onClick={() => handleDeleteTask(t.id!)} className="text-green-600 hover:text-green-700 font-bold text-xs">✅</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Escribe una nueva tarea..."
                className="flex-1 text-sm bg-muted rounded-full px-3 py-2 outline-none"
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              />
              <button onClick={handleAddTask} className="text-sm px-3 py-2 rounded-full font-medium text-white" style={{ background: '#1e4668' }}>➕</button>
            </div>
          </div>

          {/* Study reminders */}
          <div>
            <h4 className="font-semibold mb-3">🧠 Estudio espaciado (IA)</h4>
            <p className="text-xs text-muted-foreground mb-2">La IA sugiere repasar estos temas según tu ritmo:</p>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">📚 No hay recordatorios de estudio</p>
            ) : (
              <ul className="space-y-1 mb-3">
                {reminders.slice(-5).map((r, i) => (
                  <li key={i} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">🧠 {r.text}</li>
                ))}
              </ul>
            )}
            <button onClick={handleGenerateStudyPlan} className="text-sm px-4 py-2 rounded-full font-medium text-white" style={{ background: '#3a7b5c' }}>
              Generar nuevo plan
            </button>
          </div>

          {/* IA command */}
          <div>
            <h4 className="font-semibold mb-3">💬 Pídele a la IA</h4>
            <div className="flex gap-2 mb-2">
              <input
                value={iaCmd}
                onChange={e => setIaCmd(e.target.value)}
                placeholder="Ej: 'Recuérdame estudiar Matemáticas'"
                className="flex-1 text-sm bg-muted rounded-full px-3 py-2 outline-none"
                onKeyDown={e => e.key === 'Enter' && handleIaCommand()}
              />
              <button onClick={handleIaCommand} className="text-sm px-3 py-2 rounded-full font-medium text-white" style={{ background: '#3a7b5c' }}>Enviar</button>
            </div>
            {iaResponse && <div className="text-xs p-3 bg-muted rounded-xl">{iaResponse}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
