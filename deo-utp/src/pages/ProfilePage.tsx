import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Student, Coordinator } from '../lib/types';
import { getStudentByEmailOptimized, updateStudent, getAllCoordinators, addAuditLog } from '../lib/database';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });

  useEffect(() => {
    async function load() {
      if (!currentUser?.email) return;
      const studentData = await getStudentByEmailOptimized(currentUser.email);
      if (studentData) {
        setStudent(studentData);
        setFormData({
          phone: studentData.phone || '',
          address: studentData.address || '',
          emergencyContact: studentData.emergencyContact || { name: '', phone: '', relationship: '' }
        });
      }
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
        `Estudiante ${student.name} actualizó su perfil`,
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2">Cargando perfil...</span></div>;
  }

  if (!student) {
    return <div className="text-center p-8 text-muted-foreground">No se encontró información del estudiante</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1><p className="text-muted-foreground mt-1">Gestiona tu información personal</p></div>
        {!editing && <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: '#2c5f8a' }}>✏️ Editar Perfil</button>}
      </div>

      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}

      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-foreground">👤 Información Personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Nombre completo</label><p className="font-medium text-foreground">{student.name}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Correo electrónico</label><p className="font-medium text-foreground">{student.email}</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Cédula</label><p className="font-medium text-foreground">{student.cedula || 'No registrada'}</p><p className="text-xs text-muted-foreground mt-1">🔒 Solo administrador</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Discapacidad</label><p className="font-medium text-foreground">{student.disability || 'Ninguna'}</p></div>
          
          {editing ? (
            <>
              <div className="rounded-xl p-3 border-2 border-blue-200"><label className="text-xs text-blue-600 font-semibold">📱 Teléfono</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full mt-1 p-2 bg-muted rounded-lg text-sm text-foreground" /></div>
              <div className="rounded-xl p-3 border-2 border-blue-200 md:col-span-2"><label className="text-xs text-blue-600 font-semibold">🏠 Dirección</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full mt-1 p-2 bg-muted rounded-lg text-sm text-foreground" /></div>
            </>
          ) : (
            <>
              <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">📱 Teléfono</label><p className="font-medium text-foreground">{student.phone || 'No registrado'}</p></div>
              <div className="bg-muted/30 rounded-xl p-3 md:col-span-2"><label className="text-xs text-muted-foreground">🏠 Dirección</label><p className="font-medium text-foreground">{student.address || 'No registrada'}</p></div>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-foreground">🚨 Contacto de Emergencia</h2>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-3 border-2 border-blue-200"><label className="text-xs text-blue-600 font-semibold">Nombre</label><input type="text" value={formData.emergencyContact.name} onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })} className="w-full mt-1 p-2 bg-muted rounded-lg text-sm text-foreground" /></div>
            <div className="rounded-xl p-3 border-2 border-blue-200"><label className="text-xs text-blue-600 font-semibold">Teléfono</label><input type="tel" value={formData.emergencyContact.phone} onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })} className="w-full mt-1 p-2 bg-muted rounded-lg text-sm text-foreground" /></div>
            <div className="rounded-xl p-3 border-2 border-blue-200"><label className="text-xs text-blue-600 font-semibold">Parentesco</label><input type="text" value={formData.emergencyContact.relationship} onChange={e => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })} className="w-full mt-1 p-2 bg-muted rounded-lg text-sm text-foreground" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Nombre</label><p className="font-medium text-foreground">{student.emergencyContact?.name || 'No registrado'}</p></div>
            <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Teléfono</label><p className="font-medium text-foreground">{student.emergencyContact?.phone || 'No registrado'}</p></div>
            <div className="bg-muted/30 rounded-xl p-3"><label className="text-xs text-muted-foreground">Parentesco</label><p className="font-medium text-foreground">{student.emergencyContact?.relationship || 'No registrado'}</p></div>
          </div>
        )}
        {editing && <div className="flex gap-3 mt-6"><button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-full text-white bg-green-600 disabled:opacity-50">{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button><button onClick={() => { setEditing(false); setFormData({ phone: student?.phone || '', address: student?.address || '', emergencyContact: student?.emergencyContact || { name: '', phone: '', relationship: '' } }); }} className="px-6 py-2 rounded-full bg-muted text-foreground">Cancelar</button></div>}
      </div>
    </div>
  );
}