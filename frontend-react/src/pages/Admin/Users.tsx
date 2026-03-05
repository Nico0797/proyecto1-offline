import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  membership_plan?: string;
  membership_start?: string;
  membership_end?: string;
  is_active: boolean;
  last_login?: string;
  roles?: any[];
}

interface Role {
  id: number;
  name: string;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'free',
    is_active: true,
    roles: [] as number[]
  });
  
  // Available roles for edit
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error al cargar usuarios', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      setAvailableRoles(res.data.roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        plan: formData.plan,
        role_ids: formData.roles
      });
      setIsCreateModalOpen(false);
      fetchUsers();
      // Reset form
      setFormData({ name: '', email: '', password: '', plan: 'free', is_active: true, roles: [] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  const handleEdit = async (user: AdminUser) => {
    try {
      // Fetch user details including current roles
      // Backend returns roles in user details or separate endpoint?
      // Based on panel.html, it used separate endpoint.
      // But let's check what /admin/users/:id returns.
      // Assuming it returns user with roles or we fetch roles separately.
      // Keeping separate fetch for safety as per original code, but we can optimize later.
      const [userRes, rolesRes] = await Promise.all([
        api.get(`/admin/users/${user.id}`),
        api.get(`/admin/users/${user.id}/roles`)
      ]);
      
      const userData = userRes.data.user;
      const userRoles = rolesRes.data.roles || []; // Array of Role objects or IDs?
      // If rolesRes.data.roles is array of objects {id, name}, we need to map to IDs
      const roleIds = userRoles.map((r: any) => r.id);
      
      setSelectedUser(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '', // Don't show password
        plan: userData.plan || 'free',
        is_active: userData.is_active,
        roles: roleIds
      });
      
      setIsEditModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Error al cargar detalles del usuario');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      // Update user details including roles
      await api.put(`/admin/users/${selectedUser.id}`, {
        name: formData.name,
        email: formData.email,
        plan: formData.plan,
        is_active: formData.is_active,
        role_ids: formData.roles
      });
      
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al actualizar usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diff < 0) return <span className="text-red-400">Vencido</span>;
    if (diff === 0) return <span className="text-yellow-400">Vence hoy</span>;
    return <span className="text-green-400">{diff} días</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus size={18} /> Nuevo Usuario
        </Button>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Membresía</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Último Login</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">No se encontraron usuarios</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        user.plan === 'pro' ? "bg-purple-500/10 text-purple-400" : "bg-slate-700 text-slate-300"
                      )}>
                        {user.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.membership_end ? (
                        <div className="text-xs">
                          <div>Vence: {new Date(user.membership_end).toLocaleDateString()}</div>
                          <div>{getDaysRemaining(user.membership_end)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle size={14} /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <XCircle size={14} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({...formData, plan: e.target.value as 'free' | 'pro'})}
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, roles: [...formData.roles, role.id]});
                      } else {
                        setFormData({...formData, roles: formData.roles.filter(id => id !== role.id)});
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit">Crear Usuario</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Usuario"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({...formData, plan: e.target.value as 'free' | 'pro'})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                value={String(formData.is_active)}
                onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, roles: [...formData.roles, role.id]});
                      } else {
                        setFormData({...formData, roles: formData.roles.filter(id => id !== role.id)});
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
