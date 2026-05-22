// ========== TIPOS ACTUALIZADOS ==========

export interface Student {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;           // NUEVO: Cédula (solo admin puede editar)
  phone: string;            // NUEVO: Teléfono (estudiante puede editar)
  birthDate: string;        // NUEVO: Fecha de nacimiento
  address: string;          // NUEVO: Dirección
  emergencyContact: {       // NUEVO: Contacto de emergencia
    name: string;
    phone: string;
    relationship: string;
  };
  disability: string;
  disabilityCertificate: string; // NUEVO: Certificado de discapacidad (URL o texto)
  avgGrade: number;
  moodHistory: number[];
  absences: number;
  risk: 'low' | 'medium' | 'high';
  courses: CourseEnrollment[];  // CAMBIADO: ahora es un array de objetos con profesor
  alerts: string[];
  avatar: string;
  coordinatorId: number;    // NUEVO: ID del coordinador DEO asignado
  createdAt: string;        // NUEVO: Fecha de registro
  updatedAt: string;        // NUEVO: Última actualización
  status?: 'pending' | 'active' | 'requires_update';
  assignedTeachers?: {
  teacherId: number;
  teacherName: string;
}[];
  // ===== NUEVO: Expediente DEO =====

disabilityLevel?: string;
academicImpact?: string;

reasonableAdjustments?: string[];

supportPlan?: string;

supportDocuments?: string[];
}

export interface CourseEnrollment {
  courseId: number;
  courseName: string;
  teacherId: number;
  teacherName: string;
  schedule: string;
  classroom: string;
}

export interface Teacher {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;           // NUEVO
  phone: string;            // NUEVO
  specialty: string;
  department: string;       // NUEVO
  courses: string[];        // Cursos que dicta
  avatar: string;
  coordinatorId: number;    // NUEVO: Coordinador DEO asignado
}

export interface Coordinator {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;
  phone: string;
  department: string;       // Facultad que coordina
  avatar: string;
}

export interface Admin {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;
  phone: string;
  role: 'super_admin' | 'admin';
}

export interface DailyReport {
  id?: number;
  studentId: number;
  studentEmail: string;
  studentName: string;      // NUEVO: Para fácil referencia
  mood: number;
  attended: boolean;
  difficulties: string[];
  achievements: string[];
  supportRequest: string;
  completedGoals: string[];
  riskDetected: boolean;
  riskLevel: 'low' | 'medium' | 'high';  // NUEVO
  createdAt: string;
  date: string;
}

export interface ProgressStats {
  weeklyMoodAvg: number;
  monthlyMoodAvg: number;
  attendanceRate: number;
  improvementRate: number;
  recommendations: string[];
  comparisonData: { period: string; moodAvg: number; attendance: number }[];
  riskEvolution: { date: string; risk: string }[];  // NUEVO
}

export interface Task {
  id?: number;
  text: string;
  userEmail: string;
  createdAt: Date;
  completed: boolean;
  category: 'study' | 'personal' | 'deadline';  // NUEVO
  dueDate?: Date;           // NUEVO
}

export interface StudyReminder {
  id?: number;
  text: string;
  userEmail: string;
  courseName: string;       // NUEVO: Materia específica
  createdAt: Date;
  scheduledFor: Date;       // NUEVO: Fecha programada
}

export interface AuditLog {
  id?: number;
  action: string;
  timestamp: string;
  user: string;
  userRole: string;         // NUEVO
  details?: string;         // NUEVO
}

export type UserRole = 'student' | 'teacher' | 'coordinator' | 'admin';

export interface CurrentUser {
  role: UserRole;
  email: string;
  name: string;
  id: number | null;
  cedula?: string;
}

// NUEVO: Para tokens JWT
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}