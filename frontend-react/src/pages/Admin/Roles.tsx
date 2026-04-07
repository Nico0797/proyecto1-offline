import { useEffect, useState } from 'react';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';

interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}

interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
}

export const AdminRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    description: '',
    permissions: []
  });

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions')
      ]);
      setRoles(rolesRes.data.roles || []);
      setPermissions(permsRes.data.permissions || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar roles y permisos');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/admin/roles/${editingRole.id}`, formData);
        toast.success('Rol actualizado exitosamente');
      } else {
        await api.post('/admin/roles', formData);
        toast.success('Rol creado exitosamente');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar rol');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este rol?')) {
      try {
        await api.delete(`/admin/roles/${id}`);
        toast.success('Rol eliminado');
        fetchData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar rol');
      }
    }
  };

  const togglePermission = (permName: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permName);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permName) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permName] };
      }
    });
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Roles y Permisos" 
        description="Gestiona los roles de acceso al sistema y sus privilegios."
        actions={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus size={18} /> Nuevo Rol
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-slate-800 border border-white/10 rounded-xl p-6 shadow-sm hover:border-blue-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-bold text-white text-lg">{role.name}</h3>
                </div>
                <p className="text-slate-400 text-sm mt-2 ml-1">{role.description}</p>
              </div>
              <div className="flex gap-2">
                {!role.is_system && (
                  <>
                    <button 
                      onClick={() => handleOpenModal(role)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
                {role.is_system && (
                   <StatusBadge variant="neutral">Sistema</StatusBadge>
                )}
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 tracking-wider">Permisos ({role.permissions.length})</h4>
              <div className="flex flex-wrap gap-2">
                {role.permissions.slice(0, 8).map(perm => (
                  <span key={perm} className="px-2 py-1 bg-slate-900 text-slate-300 text-xs rounded border border-slate-700">
                    {perm}
                  </span>
                ))}
                {role.permissions.length > 8 && (
                  <span className="px-2 py-1 bg-slate-900 text-slate-500 text-xs rounded border border-slate-700">
                    +{role.permissions.length - 8} más
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? "Editar Rol" : "Nuevo Rol"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del Rol"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={editingRole?.is_system}
            />
            <Input
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permisos</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-semibold text-white capitalize mb-3 pb-2 border-b border-slate-700">
                    {category === 'admin' ? 'Administración' : category}
                  </h4>
                  <div className="space-y-2">
                    {perms.map(perm => (
                      <label key={perm.id} className="flex items-start gap-2 cursor-pointer group">
                        <div className="relative flex items-center mt-0.5">
                          <input
                            type="checkbox"
                            className="peer h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-offset-0 focus:ring-0"
                            checked={formData.permissions.includes(perm.name)}
                            onChange={() => togglePermission(perm.name)}
                          />
                        </div>
                        <div className="text-sm">
                          <span className={cn(
                            "block font-medium", 
                            formData.permissions.includes(perm.name) ? "text-blue-400" : "text-slate-400 group-hover:text-slate-300"
                          )}>
                            {perm.name}
                          </span>
                          <span className="text-xs text-slate-500">{perm.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <Button type="submit">
              {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
