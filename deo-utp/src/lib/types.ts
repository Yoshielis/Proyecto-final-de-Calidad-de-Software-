// ========== TIPOS ACTUALIZADOS ==========

export interface Student {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;
  phone: string;
  birthDate: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  disability: string;
  disabilityCertificate: string;
  avgGrade: number;
  moodHistory: number[];
  absences: number;
  risk: 'low' | 'medium' | 'high';
  courses: CourseEnrollment[];
  alerts: string[];
  avatar: string;
  coordinatorId: number;
  createdAt: string;
  updatedAt: string;
  status?: 'pending' | 'active' | 'requires_update';
  assignedTeachers?: {
    teacherId: number;
    teacherName: string;
  }[];
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
  cedula: string;
  phone: string;
  specialty: string;
  department: string;
  courses: string[];
  avatar: string;
  coordinatorId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Coordinator {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;
  phone: string;
  department: string;
  avatar: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  id?: number;
  email: string;
  password: string;
  name: string;
  cedula: string;
  phone: string;
  role: 'super_admin' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyReport {
  id?: number;
  studentId: number;
  studentEmail: string;
  studentName: string;
  mood: number;
  attended: boolean;
  difficulties: string[];
  achievements: string[];
  supportRequest: string;
  completedGoals: string[];
  riskDetected: boolean;
  riskLevel: 'low' | 'medium' | 'high';
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
  riskEvolution: { date: string; risk: string }[];
}

export interface Task {
  id?: number;
  text: string;
  userEmail: string;
  createdAt: Date;
  completed: boolean;
  category: 'study' | 'personal' | 'deadline';
  dueDate?: Date;
}

export interface StudyReminder {
  id?: number;
  text: string;
  userEmail: string;
  courseName: string;
  createdAt: Date;
  scheduledFor: Date;
}

export interface AuditLog {
  id?: number;
  action: string;
  timestamp: string;
  user: string;
  userRole: string;
  details?: string;
}

export type UserRole = 'student' | 'teacher' | 'coordinator' | 'admin';

export interface CurrentUser {
  role: UserRole;
  email: string;
  name: string;
  id: number | null;
  cedula?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ========== REPORTE (para CU6/CU7) ==========
export interface Report {
  id?: number;
  studentId: number;
  teacherId: number | null;
  content: string;
  type: 'academic' | 'behavioral' | 'attendance' | 'mixed';
  urgency: 'low' | 'medium' | 'high';
  date: string;
  evidence?: string[];
}

// ========== NUEVO: Reporte de Seguimiento (CU6) ==========
export interface FollowUpReport {
  id?: number;
  studentId: number;
  studentName: string;
  teacherId: number;
  teacherName: string;
  type: 'academic' | 'behavioral' | 'attendance' | 'mixed';
  rating: 'significant_improvement' | 'improvement' | 'stable' | 'declining' | 'critical';
  observations: string;
  urgency: 'low' | 'medium' | 'high';
  evidence?: string[];  // URLs o nombres de archivos
  createdAt: string;
  date: string;
  riskDetected: boolean;
  notifiedCoordinator: boolean;
}