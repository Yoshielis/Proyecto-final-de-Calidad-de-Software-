export interface Student {
  id?: number;
  email: string;
  password: string;
  name: string;
  disability: string;
  avgGrade: number;
  moodHistory: number[];
  absences: number;
  risk: 'low' | 'medium' | 'high';
  courses: string[];
  alerts: string[];
  avatar: string;
}

export interface Teacher {
  id?: number;
  email: string;
  password: string;
  name: string;
  specialty: string;
  avatar: string;
}

export interface Admin {
  id?: number;
  email: string;
  password: string;
  name: string;
}

export interface Report {
  id?: number;
  studentId: number;
  teacherId: number | null;
  content: string;
  type: string;
  date: string;
}

export interface Task {
  id?: number;
  text: string;
  userEmail: string;
  createdAt: Date;
  completed: boolean;
}

export interface StudyReminder {
  id?: number;
  text: string;
  userEmail: string;
  createdAt: Date;
}

export interface AuditLog {
  id?: number;
  action: string;
  timestamp: string;
  user: string;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface CurrentUser {
  role: UserRole;
  email: string;
  name: string;
  id: number | null;
}
