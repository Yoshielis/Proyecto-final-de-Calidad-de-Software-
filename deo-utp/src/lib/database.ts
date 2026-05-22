import type { Student, Teacher, Admin, Report, Task, StudyReminder, AuditLog } from './types';

let db: IDBDatabase | null = null;

const DB_NAME = 'DEO_DB';
const DB_VERSION = 9;

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

      if (!database.objectStoreNames.contains('students')) {
        const store = database.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.add({ email: 'ana.gomez@utp.ac.pa', password: '123456', name: 'Ana Gómez', disability: 'Dislexia', avgGrade: 78, moodHistory: [4,3,4,5,3,4,4], absences: 2, risk: 'medium', courses: ['Matemáticas', 'Literatura'], alerts: ['Tiempo extra en exámenes'], avatar: '👩' });
        store.add({ email: 'carlos.perez@utp.ac.pa', password: '123456', name: 'Carlos Pérez', disability: 'TDAH', avgGrade: 65, moodHistory: [2,2,1,3,2,2,1], absences: 5, risk: 'high', courses: ['Física', 'Programación'], alerts: ['Inasistencias repetidas'], avatar: '👨' });
        store.add({ email: 'maria.lopez@utp.ac.pa', password: '123456', name: 'María López', disability: 'Discapacidad visual parcial', avgGrade: 88, moodHistory: [4,5,4,5,4,5,5], absences: 0, risk: 'low', courses: ['Inglés', 'Química'], alerts: [], avatar: '👩‍🎓' });
      }

      if (!database.objectStoreNames.contains('teachers')) {
        const store = database.createObjectStore('teachers', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.add({ email: 'profesor@utp.ac.pa', password: '123456', name: 'Dra. María Rodríguez', specialty: 'Psicología Educativa', avatar: '👩' });
        store.add({ email: 'jorge.martinez@utp.ac.pa', password: '123456', name: 'Prof. Jorge Martínez', specialty: 'Matemáticas', avatar: '👨' });
      }

      if (!database.objectStoreNames.contains('admins')) {
        const store = database.createObjectStore('admins', { keyPath: 'id', autoIncrement: true });
        store.createIndex('email', 'email', { unique: true });
        store.add({ email: 'admin@utp.ac.pa', password: '123456', name: 'Administrador DEO' });
      }

      if (!database.objectStoreNames.contains('reports')) database.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('tasks')) database.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('study_reminders')) database.createObjectStore('study_reminders', { keyPath: 'id', autoIncrement: true });
      if (!database.objectStoreNames.contains('audit_log')) database.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
    };
  });
}

function getDB(): IDBDatabase {
  if (!db) throw new Error('Database not initialized');
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

export const getStudentByEmail = (email: string) => dbGetByIndex<Student>('students', 'email', email);
export const getTeacherByEmail = (email: string) => dbGetByIndex<Teacher>('teachers', 'email', email);
export const getAdminByEmail = (email: string) => dbGetByIndex<Admin>('admins', 'email', email);
export const getAllStudents = () => dbGetAll<Student>('students');
export const getAllTeachers = () => dbGetAll<Teacher>('teachers');
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
export const addAuditLog = (action: string, user: string) => dbAdd('audit_log', { action, timestamp: new Date().toISOString(), user });
export const getAuditLog = () => dbGetAll<AuditLog>('audit_log');

export async function updateStudentMood(studentId: number, newMood: number): Promise<void> {
  const student = await dbGet<Student>('students', studentId);
  if (!student) return;
  student.moodHistory.push(newMood);
  if (student.moodHistory.length > 7) student.moodHistory.shift();
  await dbPut<Student>('students', student);
}

export async function updateStudent(student: Student): Promise<void> {
  await dbPut<Student>('students', student);
}
