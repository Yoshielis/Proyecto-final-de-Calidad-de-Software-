import type { 
  Student, Teacher, Admin, Coordinator, Report, Task, StudyReminder, 
  AuditLog, DailyReport, ProgressStats, CourseEnrollment, AuthTokens 
} from './types';

let db: IDBDatabase | null = null;

const DB_NAME = 'DEO_DB';
const DB_VERSION = 18;  

export async function openDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const now = new Date().toISOString();

      // ========== STUDENTS ==========
      if (!database.objectStoreNames.contains('students')) {
        const store = database.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('cedula', 'cedula', { unique: true });
        store.createIndex('coordinatorId', 'coordinatorId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        
        store.add({ 
          email: 'ana.gomez@utp.ac.pa', password: '123456', name: 'Ana Gómez', 
          cedula: '8-1234-5678', phone: '6123-4567', birthDate: '2000-05-15', 
          address: 'Panamá, Calle 123', status: 'active',
          emergencyContact: { name: 'Carlos Gómez', phone: '6123-4568', relationship: 'Padre' },
          disability: 'Dislexia', disabilityCertificate: 'Certificado #D-001',
          disabilityLevel: 'Leve', academicImpact: 'Dificultad en lectura rápida',
          reasonableAdjustments: ['Tiempo extra 25%', 'Software de lectura'],
          supportPlan: 'Seguimiento semanal con tutor',
          supportDocuments: ['diagnostico_dislexia.pdf'],
          avgGrade: 78, moodHistory: [4,3,4,5,3,4,4], absences: 2, risk: 'medium',
          courses: [
            { courseId: 1, courseName: 'Matemáticas', teacherId: 0, teacherName: 'Prof. Jorge Martínez', schedule: 'Lun/Mie 8:00-10:00', classroom: 'A-101' },
            { courseId: 2, courseName: 'Literatura', teacherId: 0, teacherName: 'Dra. María Rodríguez', schedule: 'Mar/Jue 10:00-12:00', classroom: 'B-202' }
          ],
          alerts: ['Tiempo extra en exámenes'], avatar: '👩', coordinatorId: 1,
          createdAt: now, updatedAt: now
        });
        store.add({ 
          email: 'carlos.perez@utp.ac.pa', password: '123456', name: 'Carlos Pérez',
          cedula: '8-8765-4321', phone: '6987-6543', birthDate: '1999-11-20', status: 'active',
          address: 'Panamá, Ave. Central',
          emergencyContact: { name: 'María Pérez', phone: '6987-6544', relationship: 'Madre' },
          disability: 'TDAH', disabilityCertificate: 'Certificado #T-002',
          disabilityLevel: 'Moderado', academicImpact: 'Dificultad de concentración',
          reasonableAdjustments: ['Pausas activas', 'Tiempo adicional'],
          supportPlan: 'Seguimiento psicológico',
          supportDocuments: ['diagnostico_tdah.pdf'],
          avgGrade: 65, moodHistory: [2,2,1,3,2,2,1], absences: 5, risk: 'high',
          courses: [
            { courseId: 3, courseName: 'Física', teacherId: 0, teacherName: 'Prof. Jorge Martínez', schedule: 'Lun/Mie 10:00-12:00', classroom: 'A-103' },
            { courseId: 4, courseName: 'Programación', teacherId: 0, teacherName: 'Ing. Luis Chen', schedule: 'Mar/Jue 2:00-4:00', classroom: 'Lab-1' }
          ],
          alerts: ['Inasistencias repetidas'], avatar: '👨', coordinatorId: 1,
          createdAt: now, updatedAt: now
        });
        store.add({ 
          email: 'maria.lopez@utp.ac.pa', password: '123456', name: 'María López',
          cedula: '9-9876-5432', phone: '6222-3333', birthDate: '2001-03-10', status: 'active',
          address: 'Panamá, El Dorado',
          emergencyContact: { name: 'José López', phone: '6222-3334', relationship: 'Padre' },
          disability: 'Discapacidad visual parcial', disabilityCertificate: 'Certificado #V-003',
          disabilityLevel: 'Moderado', academicImpact: 'Dificultad para leer texto pequeño',
          reasonableAdjustments: ['Ampliación de texto', 'Software lector'],
          supportPlan: 'Asistencia en aula',
          supportDocuments: ['diagnostico_visual.pdf'],
          avgGrade: 88, moodHistory: [4,5,4,5,4,5,5], absences: 0, risk: 'low',
          courses: [
            { courseId: 5, courseName: 'Inglés', teacherId: 0, teacherName: 'Prof. Susan Lee', schedule: 'Lun/Mie 1:00-3:00', classroom: 'C-305' },
            { courseId: 6, courseName: 'Química', teacherId: 0, teacherName: 'Dra. Ana Chen', schedule: 'Mar/Jue 8:00-10:00', classroom: 'Lab-2' }
          ],
          alerts: [], avatar: '👩‍🎓', coordinatorId: 1,
          createdAt: now, updatedAt: now
        });
      }

      // ========== TEACHERS ==========
      if (!database.objectStoreNames.contains('teachers')) {
        const store = database.createObjectStore('teachers', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('cedula', 'cedula', { unique: true });
        
        const teachersData = [
          { email: 'jorge.martinez@utp.ac.pa', name: 'Prof. Jorge Martínez', cedula: '8-1111-2222', phone: '6111-2222', specialty: 'Matemáticas/Física', department: 'Facultad de Ingeniería', courses: ['Matemáticas', 'Física'], avatar: '👨', coordinatorId: 1 },
          { email: 'maria.rodriguez@utp.ac.pa', name: 'Dra. María Rodríguez', cedula: '8-3333-4444', phone: '6333-4444', specialty: 'Literatura', department: 'Facultad de Humanidades', courses: ['Literatura'], avatar: '👩', coordinatorId: 1 },
          { email: 'luis.chen@utp.ac.pa', name: 'Ing. Luis Chen', cedula: '8-5555-6666', phone: '6555-6666', specialty: 'Programación', department: 'Facultad de Ingeniería', courses: ['Programación'], avatar: '👨', coordinatorId: 1 },
          { email: 'susan.lee@utp.ac.pa', name: 'Prof. Susan Lee', cedula: '8-7777-8888', phone: '6777-8888', specialty: 'Inglés', department: 'Facultad de Humanidades', courses: ['Inglés'], avatar: '👩', coordinatorId: 1 },
          { email: 'ana.chen@utp.ac.pa', name: 'Dra. Ana Chen', cedula: '8-9999-0000', phone: '6999-0000', specialty: 'Química', department: 'Facultad de Ciencias', courses: ['Química'], avatar: '👩', coordinatorId: 1 }
        ];
        
        for (const t of teachersData) {
          store.add({
            ...t,
            password: '123456',
            createdAt: now,
            updatedAt: now
          });
        }
      }

      // ========== COORDINATORS ==========
      if (!database.objectStoreNames.contains('coordinators')) {
        const store = database.createObjectStore('coordinators', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('cedula', 'cedula', { unique: true });
        store.add({ 
          email: 'coord.ingenieria@utp.ac.pa', password: '123456', name: 'Dr. Roberto Sánchez',
          cedula: '8-1212-3434', phone: '6123-4567', department: 'Facultad de Ingeniería',
          avatar: '👨', createdAt: now, updatedAt: now
        });
      }

      // ========== ADMINS ==========
      if (!database.objectStoreNames.contains('admins')) {
        const store = database.createObjectStore('admins', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.createIndex('cedula', 'cedula', { unique: true });
        store.add({ 
          email: 'admin@utp.ac.pa', password: '123456', name: 'Administrador DEO',
          cedula: '8-0000-0001', phone: '5000-0001', role: 'super_admin',
          createdAt: now, updatedAt: now
        });
      }

      // ========== OTHER STORES ==========
      if (!database.objectStoreNames.contains('reports')) database.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('tasks')) database.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('study_reminders')) database.createObjectStore('study_reminders', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('audit_log')) database.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('daily_reports')) database.createObjectStore('daily_reports', { keyPath: 'id', autoIncrement: true });
      // Agrega este store junto a los otros:
      if (!database.objectStoreNames.contains('follow_up_reports')) {
        const store = database.createObjectStore('follow_up_reports', { keyPath: 'id', autoIncrement: true });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('teacherId', 'teacherId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('urgency', 'urgency', { unique: false });
      }
    };
  });
}

function getDB(): IDBDatabase {
  if (!db) throw new Error('Database not initialized. Call openDatabase first.');
  return db;
}

function dbGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).get(value);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result || []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

function dbGet<T>(storeName: string, id: number): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function dbAdd<T>(storeName: string, item: T): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).add(item);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

function dbPut<T>(storeName: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(storeName: string, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ========== EXPORTS BÁSICOS ==========
export const getStudentByEmail = (email: string) => dbGetByIndex<Student>('students', 'email', email);
export const getStudentByCedula = (cedula: string) => dbGetByIndex<Student>('students', 'cedula', cedula);
export const getTeacherByEmail = (email: string) => dbGetByIndex<Teacher>('teachers', 'email', email);
export const getAdminByEmail = (email: string) => dbGetByIndex<Admin>('admins', 'email', email);
export const getCoordinatorByEmail = (email: string) => dbGetByIndex<Coordinator>('coordinators', 'email', email);
export const getAllStudents = () => dbGetAll<Student>('students');
export const getAllTeachers = () => dbGetAll<Teacher>('teachers');
export const getAllCoordinators = () => dbGetAll<Coordinator>('coordinators');
export const addStudent = (s: Omit<Student, 'id'>) => dbAdd<Omit<Student, 'id'>>('students', s);
export const addTeacher = (t: Omit<Teacher, 'id'>) => dbAdd<Omit<Teacher, 'id'>>('teachers', t);
export const deleteStudent = (id: number) => dbDelete('students', id);
export const deleteTeacher = (id: number) => dbDelete('teachers', id);
export const addReport = (r: Omit<Report, 'id'>) => dbAdd<Omit<Report, 'id'>>('reports', r);
export const getAllReports = () => dbGetAll<Report>('reports');
export const addTask = (t: Omit<Task, 'id'>) => dbAdd<Omit<Task, 'id'>>('tasks', t);
export const getAllTasks = () => dbGetAll<Task>('tasks');
export const deleteTask = (id: number) => dbDelete('tasks', id);
export const addStudyReminder = (r: Omit<StudyReminder, 'id'>) => dbAdd<Omit<StudyReminder, 'id'>>('study_reminders', r);
export const getStudyReminders = () => dbGetAll<StudyReminder>('study_reminders');
export const addAuditLog = (action: string, user: string, userRole: string = 'unknown', details?: string) => 
  dbAdd('audit_log', { action, timestamp: new Date().toISOString(), user, userRole, details });
export const getAuditLog = () => dbGetAll<AuditLog>('audit_log');

// ========== FUNCIONES DE ESTUDIANTE ==========
export async function updateStudentMood(studentId: number, newMood: number): Promise<void> {
  const student = await dbGet<Student>('students', studentId);
  if (!student) return;
  student.moodHistory.push(newMood);
  if (student.moodHistory.length > 7) student.moodHistory.shift();
  student.updatedAt = new Date().toISOString();
  await dbPut<Student>('students', student);
}

export async function updateStudent(student: Student): Promise<void> {
  student.updatedAt = new Date().toISOString();
  await dbPut<Student>('students', student);
}

export async function getStudentById(id: number): Promise<Student | undefined> {
  return dbGet<Student>('students', id);
}

export async function getStudentByEmailOptimized(email: string): Promise<Student | undefined> {
  return dbGetByIndex<Student>('students', 'email', email);
}

// ========== FUNCIONES PARA PROFESORES ==========
export async function updateTeacher(teacher: Teacher): Promise<void> {
  teacher.updatedAt = new Date().toISOString();
  await dbPut<Teacher>('teachers', teacher);
}

export async function getTeacherById(id: number): Promise<Teacher | undefined> {
  return dbGet<Teacher>('teachers', id);
}

// ========== FUNCIONES PARA DAILY REPORTS ==========
export const addDailyReport = (report: Omit<DailyReport, 'id'>): Promise<number> => {
  return dbAdd<Omit<DailyReport, 'id'>>('daily_reports', report);
};

export const getDailyReportsByStudent = async (studentId: number): Promise<DailyReport[]> => {
  const allReports = await dbGetAll<DailyReport>('daily_reports');
  return allReports.filter(r => r.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
};

export const getAllDailyReports = async (): Promise<DailyReport[]> => {
  return await dbGetAll<DailyReport>('daily_reports');
};

export const getLast7DaysReports = async (studentId: number): Promise<DailyReport[]> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const reports = await getDailyReportsByStudent(studentId);
  return reports.filter(r => r.date >= sevenDaysAgoStr);
};

// ========== FUNCIONES PARA PROGRESO ==========
export async function getStudentProgressStats(studentId: number): Promise<ProgressStats> {
  const student = await dbGet<Student>('students', studentId);
  const reports = await getDailyReportsByStudent(studentId);
  
  const weeklyMoodAvg = reports.slice(-7).reduce((sum, r) => sum + r.mood, 0) / Math.min(7, reports.length) || 3;
  const monthlyMoodAvg = reports.slice(-30).reduce((sum, r) => sum + r.mood, 0) / Math.min(30, reports.length) || weeklyMoodAvg;
  const attendanceRate = reports.length > 0 ? (reports.filter(r => r.attended).length / reports.length) * 100 : 100;
  
  const lastWeekAvg = reports.slice(-7).reduce((sum, r) => sum + r.mood, 0) / Math.min(7, reports.length) || 3;
  const previousWeekAvg = reports.slice(-14, -7).reduce((sum, r) => sum + r.mood, 0) / Math.min(7, reports.length - 7) || 3;
  const improvementRate = previousWeekAvg > 0 ? ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100 : 0;
  
  const recommendations: string[] = [];
  if (weeklyMoodAvg <= 2.5) recommendations.push('🫂 Has reportado ánimo bajo. El equipo DEO está para apoyarte.');
  if (attendanceRate < 80 && reports.length > 5) recommendations.push('📚 Tu asistencia ha disminuido. Habla con tus profesores.');
  if (student && student.avgGrade < 70) recommendations.push('🎯 Tu promedio está por debajo del 70%. Revisa el material didáctico.');
  if (recommendations.length === 0) recommendations.push('🌟 ¡Vas por buen camino! Sigue registrando tu progreso.');
  
  return {
    weeklyMoodAvg,
    monthlyMoodAvg,
    attendanceRate,
    improvementRate,
    recommendations,
    comparisonData: [
      { period: 'Última semana', moodAvg: weeklyMoodAvg, attendance: attendanceRate },
      { period: 'Último mes', moodAvg: monthlyMoodAvg, attendance: attendanceRate }
    ],
    riskEvolution: reports.map(r => ({ date: r.date, risk: r.riskLevel || 'low' }))
  };
}

export async function updateStudentRiskFromReports(studentId: number): Promise<void> {
  const student = await dbGet<Student>('students', studentId);
  if (!student) return;
  
  const reports = await getLast7DaysReports(studentId);
  const recentMoodAvg = reports.length > 0 
    ? reports.reduce((sum, r) => sum + r.mood, 0) / reports.length 
    : 3;
  
  let newRisk: 'low' | 'medium' | 'high' = student.risk;
  if (recentMoodAvg <= 2 || student.absences >= 4 || student.avgGrade < 60) newRisk = 'high';
  else if (recentMoodAvg <= 3 || student.absences >= 2 || student.avgGrade < 70) newRisk = 'medium';
  else newRisk = 'low';
  
  if (newRisk !== student.risk) {
    student.risk = newRisk;
    await dbPut<Student>('students', student);
  }
}

export async function updateStudentRiskAdvanced(studentId: number): Promise<void> {
  await updateStudentRiskFromReports(studentId);
}

export async function getCompleteProgressStats(studentId: number): Promise<{
  weeklyMood: number[];
  monthlyMood: number[];
  attendanceTrend: number[];
  gradeHistory: { date: string; grade: number }[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  positiveStreak: number;
  negativeStreak: number;
}> {
  const student = await dbGet<Student>('students', studentId);
  const reports = await getDailyReportsByStudent(studentId);
  
  if (!student) throw new Error('Student not found');
  
  let positiveStreak = 0;
  let negativeStreak = 0;
  let currentPositive = 0;
  let currentNegative = 0;
  
  for (const report of reports.slice(-14)) {
    if (report.mood >= 4) {
      currentPositive++;
      currentNegative = 0;
    } else if (report.mood <= 2) {
      currentNegative++;
      currentPositive = 0;
    } else {
      currentPositive = 0;
      currentNegative = 0;
    }
    positiveStreak = Math.max(positiveStreak, currentPositive);
    negativeStreak = Math.max(negativeStreak, currentNegative);
  }
  
  const recommendations: string[] = [];
  const recentMoods = reports.slice(-7).map(r => r.mood);
  const avgRecentMood = recentMoods.reduce((a,b) => a+b, 0) / (recentMoods.length || 1);
  const attendanceRate = reports.filter(r => r.attended).length / (reports.length || 1) * 100;
  
  if (positiveStreak >= 4) recommendations.push('🎉 ¡Increíble racha positiva! Sigue así.');
  if (negativeStreak >= 3) recommendations.push('⚠️ Has reportado ánimo bajo por varios días. Contacta al equipo DEO.');
  if (avgRecentMood <= 2.5) recommendations.push('💙 El equipo DEO está aquí para apoyarte.');
  if (attendanceRate < 80 && reports.length > 5) recommendations.push('📚 Tu asistencia ha disminuido.');
  if (student.avgGrade < 70) recommendations.push('🎯 Tu promedio está por debajo del 70%.');
  if (recommendations.length === 0) recommendations.push('🌟 Sigue registrando tu progreso diariamente.');
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (negativeStreak >= 3 || student.avgGrade < 60 || student.absences >= 4) riskLevel = 'high';
  else if (negativeStreak >= 2 || student.avgGrade < 70 || student.absences >= 2 || avgRecentMood <= 2.5) riskLevel = 'medium';
  
  return {
    weeklyMood: recentMoods,
    monthlyMood: reports.slice(-30).map(r => r.mood),
    attendanceTrend: reports.slice(-14).map(r => r.attended ? 100 : 0),
    gradeHistory: [],
    recommendations,
    riskLevel,
    positiveStreak,
    negativeStreak
  };
}

// ========== FUNCIÓN DE INTEGRIDAD DE DATOS ==========
export async function ensureDataIntegrity(): Promise<void> {
  await openDatabase();
  
  const teachers = await getAllTeachers();
  if (teachers.length === 0) {
    const defaultTeachers = [
      { email: 'jorge.martinez@utp.ac.pa', password: '123456', name: 'Prof. Jorge Martínez', cedula: '8-1111-2222', phone: '6111-2222', specialty: 'Matemáticas/Física', department: 'Facultad de Ingeniería', courses: ['Matemáticas', 'Física'], avatar: '👨', coordinatorId: 1 },
      { email: 'maria.rodriguez@utp.ac.pa', password: '123456', name: 'Dra. María Rodríguez', cedula: '8-3333-4444', phone: '6333-4444', specialty: 'Literatura', department: 'Facultad de Humanidades', courses: ['Literatura'], avatar: '👩', coordinatorId: 1 },
      { email: 'luis.chen@utp.ac.pa', password: '123456', name: 'Ing. Luis Chen', cedula: '8-5555-6666', phone: '6555-6666', specialty: 'Programación', department: 'Facultad de Ingeniería', courses: ['Programación'], avatar: '👨', coordinatorId: 1 },
      { email: 'susan.lee@utp.ac.pa', password: '123456', name: 'Prof. Susan Lee', cedula: '8-7777-8888', phone: '6777-8888', specialty: 'Inglés', department: 'Facultad de Humanidades', courses: ['Inglés'], avatar: '👩', coordinatorId: 1 },
      { email: 'ana.chen@utp.ac.pa', password: '123456', name: 'Dra. Ana Chen', cedula: '8-9999-0000', phone: '6999-0000', specialty: 'Química', department: 'Facultad de Ciencias', courses: ['Química'], avatar: '👩', coordinatorId: 1 }
    ];
    for (const t of defaultTeachers) {
      await addTeacher(t as any);
    }
    console.log('✅ Profesores agregados automáticamente');
  }
  
  const students = await getAllStudents();
  for (const student of students) {
    let needsUpdate = false;
    
    if (student.courses && student.courses.length > 0 && typeof student.courses[0] === 'string') {
      const newCourses = [];
      const courseNames = student.courses as unknown as string[];
      
      for (let i = 0; i < courseNames.length; i++) {
        const courseName = courseNames[i];
        let teacherName = '';
        let schedule = '';
        let classroom = '';
        
        if (courseName.includes('Matemáticas')) {
          teacherName = 'Prof. Jorge Martínez';
          schedule = 'Lun/Mie 8:00-10:00';
          classroom = 'A-101';
        } else if (courseName.includes('Literatura')) {
          teacherName = 'Dra. María Rodríguez';
          schedule = 'Mar/Jue 10:00-12:00';
          classroom = 'B-202';
        } else if (courseName.includes('Física')) {
          teacherName = 'Prof. Jorge Martínez';
          schedule = 'Lun/Mie 10:00-12:00';
          classroom = 'A-103';
        } else if (courseName.includes('Programación')) {
          teacherName = 'Ing. Luis Chen';
          schedule = 'Mar/Jue 2:00-4:00';
          classroom = 'Lab-1';
        } else if (courseName.includes('Inglés')) {
          teacherName = 'Prof. Susan Lee';
          schedule = 'Lun/Mie 1:00-3:00';
          classroom = 'C-305';
        } else if (courseName.includes('Química')) {
          teacherName = 'Dra. Ana Chen';
          schedule = 'Mar/Jue 8:00-10:00';
          classroom = 'Lab-2';
        } else {
          teacherName = 'Por asignar';
          schedule = 'Horario por definir';
          classroom = 'Aula por definir';
        }
        
        newCourses.push({
          courseId: i + 1,
          courseName: courseName,
          teacherId: 0,
          teacherName: teacherName,
          schedule: schedule,
          classroom: classroom
        });
      }
      
      student.courses = newCourses as any;
      needsUpdate = true;
    }
    
    if (!student.status) {
      student.status = 'active';
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await updateStudent(student);
    }
  }
  
  console.log('✅ Integridad de datos verificada');
}

// ========== FUNCIONES PARA REPORTES DE SEGUIMIENTO (CU6) ==========
export const addFollowUpReport = (report: Omit<FollowUpReport, 'id'>): Promise<number> => {
  return dbAdd<Omit<FollowUpReport, 'id'>>('follow_up_reports', report);
};

export const getFollowUpReportsByStudent = async (studentId: number): Promise<FollowUpReport[]> => {
  const allReports = await dbGetAll<FollowUpReport>('follow_up_reports');
  return allReports.filter(r => r.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
};

export const getFollowUpReportsByTeacher = async (teacherId: number): Promise<FollowUpReport[]> => {
  const allReports = await dbGetAll<FollowUpReport>('follow_up_reports');
  return allReports.filter(r => r.teacherId === teacherId).sort((a, b) => b.date.localeCompare(a.date));
};