import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Coordinator } from '../lib/types';
import { getStudentByEmailOptimized, updateStudent, getAllCoordinators, addAuditLog } from '../lib/database';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Campos editables por el estudiante
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });

  useEffect(() => {
    async function load() {
      if (!currentUser?.email) return;
      const [studentData, allCoordinators] = await Promise.all([
        getStudentByEmailOptimized(currentUser.email),
        getAllCoordinators()
      ]);
      if (studentData) {
        setStudent(studentData);
        setFormData({
          phone: studentData.phone || '',
          address: studentData.address || '',
          emergencyContact: studentData.emergencyContact || { name: '', phone: '', relationship: '' }
        });
      }
      setCoordinators(allCoordinators);
      setLoading(false);
    }
    load();
  }, [currentUser]);

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const updatedStudent = {
        ...student,
        phone: formData.phone,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        updatedAt: new Date().toISOString()
      };
      await updateStudent(updatedStudent);
      await addAuditLog(
        `Estudiante ${student.name} actualizó su perfil (teléfono, dirección, contacto emergencia)`,
        student.email,
        'student'
      );
      setStudent(updatedStudent);
      setEditing(false);
      setMessage({ type: 'success', text: '✅ Perfil actualizado correctamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  const getCoordinatorName = () => {
    const coord = coordinators.find(c => c.id === student?.coordinatorId);
    return coord ? `${coord.name} (${coord.department})` : 'No asignado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando perfil...</span>
      </div>
    );
  }

  if (!student) {
    return <div className="text-center p-8 text-muted-foreground">No se encontró información del estudiante</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">Gestiona tu información personal</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ background: '#2c5f8a' }}
          >
            ✏️ Editar Perfil
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Tarjeta de información personal */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>👤</span> Información Personal
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campos de solo lectura (solo admin puede editar) */}
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Nombre completo</label>
            <p className="font-medium">{student.name}</p>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Correo electrónico</label>
            <p className="font-medium">{student.email}</p>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Cédula</label>
            <p className="font-medium">{student.cedula || 'No registrada'}</p>
            <p className="text-xs text-muted-foreground mt-1">🔒 Solo el administrador puede editar este campo</p>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Fecha de nacimiento</label>
            <p className="font-medium">{student.birthDate || 'No registrada'}</p>
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Discapacidad</label>
            <p className="font-medium">{student.disability || 'Ninguna'}</p>
            {student.disabilityCertificate && (
              <p className="text-xs text-muted-foreground mt-1">Certificado: {student.disabilityCertificate}</p>
            )}
          </div>
          
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Coordinador DEO asignado</label>
            <p className="font-medium">{getCoordinatorName()}</p>
            <p className="text-xs text-muted-foreground mt-1">📞 Contacto para apoyo académico y personal</p>
          </div>

          {/* Campos editables por el estudiante */}
          {editing ? (
            <>
              <div className="rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800">
                <label className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold">📱 Teléfono *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 p-2 bg-muted rounded-lg text-sm"
                  placeholder="Ej: 6123-4567"
                />
                <p className="text-xs text-muted-foreground mt-1">Puedes editar este campo</p>
              </div>
              
              <div className="rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800 md:col-span-2">
                <label className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold">🏠 Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 p-2 bg-muted rounded-lg text-sm"
                  placeholder="Tu dirección"
                />
                <p className="text-xs text-muted-foreground mt-1">Puedes editar este campo</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 rounded-xl p-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">📱 Teléfono</label>
                <p className="font-medium">{student.phone || 'No registrado'}</p>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-3 md:col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">🏠 Dirección</label>
                <p className="font-medium">{student.address || 'No registrada'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contacto de emergencia */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>🚨</span> Contacto de Emergencia
        </h2>
        
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800">
              <label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Nombre</label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                className="w-full mt-1 p-2 bg-muted rounded-lg text-sm"
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800">
              <label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Teléfono</label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                className="w-full mt-1 p-2 bg-muted rounded-lg text-sm"
                placeholder="Teléfono de emergencia"
              />
            </div>
            <div className="rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800">
              <label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Parentesco</label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })}
                className="w-full mt-1 p-2 bg-muted rounded-lg text-sm"
                placeholder="Ej: Padre, Madre, Hermano"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-xl p-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</label>
              <p className="font-medium">{student.emergencyContact?.name || 'No registrado'}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Teléfono</label>
              <p className="font-medium">{student.emergencyContact?.phone || 'No registrado'}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Parentesco</label>
              <p className="font-medium">{student.emergencyContact?.relationship || 'No registrado'}</p>
            </div>
          </div>
        )}

        {editing && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: '#27ae60' }}
            >
              {saving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFormData({
                  phone: student?.phone || '',
                  address: student?.address || '',
                  emergencyContact: student?.emergencyContact || { name: '', phone: '', relationship: '' }
                });
              }}
              className="px-6 py-2 rounded-full text-sm font-medium bg-muted hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📚</span> Información Académica
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Promedio general</label>
            <p className={`text-2xl font-bold ${student.avgGrade >= 70 ? 'text-green-600' : 'text-red-500'}`}>{student.avgGrade}%</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Inasistencias acumuladas</label>
            <p className={`text-2xl font-bold ${student.absences >= 3 ? 'text-red-500' : ''}`}>{student.absences}</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3 md:col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Cursos actuales</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {student.courses.map((course, i) => (
                <span key={i} className="text-sm px-3 py-1 bg-muted rounded-full">
                  📚 {typeof course === 'string' ? course : course.courseName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}