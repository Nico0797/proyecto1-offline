import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { AdminCard } from '../../components/Admin/ui/AdminCard';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  plan: 'free' | 'basic' | 'pro' | 'business';
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
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGrantAccessModalOpen, setIsGrantAccessModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'basic' as 'basic' | 'pro' | 'business',
    is_active: true,
    roles: [] as number[]
  });
  const [grantForm, setGrantForm] = useState({
    plan: 'basic' as 'basic' | 'pro' | 'business',
    duration_days: 30,
    reason: '',
  });
  
  // Available roles for edit
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          page,
          per_page: itemsPerPage,
          search
        }
      });
      setUsers(res.data.users || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error('Error al cargar usuarios', err);
      toast.error('Error al cargar usuarios');
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
  }, [page, search]); // Re-fetch when page or search changes

  useEffect(() => {
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
      toast.success('Usuario creado exitosamente');
      fetchUsers();
      // Reset form
      setFormData({ name: '', email: '', password: '', plan: 'basic', is_active: true, roles: [] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  const handleEdit = async (user: AdminUser) => {
    try {
      // Fetch user details including current roles
      const [userRes, rolesRes] = await Promise.all([
        api.get(`/admin/users/${user.id}`),
        api.get(`/admin/users/${user.id}/roles`)
      ]);
      
      const userData = userRes.data.user;
      const userRoles = rolesRes.data.roles || []; 
      const roleIds = userRoles.map((r: any) => r.id);
      
      setSelectedUser(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '', // Don't show password
        plan: userData.plan || 'basic',
        is_active: userData.is_active,
        roles: roleIds
      });
      
      setIsEditModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles del usuario');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        name: formData.name,
        email: formData.email,
        plan: formData.plan,
        is_active: formData.is_active,
        role_ids: formData.roles
      });
      
      setIsEditModalOpen(false);
      toast.success('Usuario actualizado exitosamente');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const openGrantAccessModal = (user: AdminUser) => {
    setSelectedUser(user);
    setGrantForm({
      plan: user.plan === 'business' ? 'business' : user.plan === 'pro' ? 'pro' : 'basic',
      duration_days: 30,
      reason: '',
    });
    setIsGrantAccessModalOpen(true);
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.post(`/admin/users/${selectedUser.id}/grant-access`, {
        plan: grantForm.plan,
        duration_days: grantForm.duration_days,
        reason: grantForm.reason,
      });
      toast.success(`Acceso ${grantForm.plan.toUpperCase()} otorgado a ${selectedUser.name}`);
      setIsGrantAccessModalOpen(false);
      setSelectedUser(null);
      setGrantForm({
        plan: 'basic',
        duration_days: 30,
        reason: '',
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo otorgar el acceso manual');
    }
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diff < 0) return <span className="text-red-400 font-medium">Vencido</span>;
    if (diff === 0) return <span className="text-amber-400 font-medium">Vence hoy</span>;
    return <span className="text-emerald-400">{diff} días</span>;
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'Usuario',
      cell: (user) => (
        <div>
          <div className="font-medium text-white">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
      )
    },
    {
      header: 'Plan',
      cell: (user) => {
        const variants: Record<string, 'neutral' | 'purple' | 'warning'> = {
          basic: 'neutral',
          free: 'neutral',
          pro: 'warning',
          business: 'purple'
        };
        return (
          <StatusBadge variant={variants[user.plan] || 'neutral'}>
            {user.plan === 'free' || user.plan === 'basic' ? 'BÁSICA' : user.plan.toUpperCase()}
          </StatusBadge>
        );
      }
    },
    {
      header: 'Membresía',
      cell: (user) => (
        user.membership_end ? (
          <div className="text-xs">
            <div>Vence: {new Date(user.membership_end).toLocaleDateString()}</div>
            <div>{getDaysRemaining(user.membership_end)}</div>
          </div>
        ) : (
          <span className="text-slate-600">-</span>
        )
      )
    },
    {
      header: 'Estado',
      cell: (user) => (
        <StatusBadge variant={user.is_active ? 'success' : 'error'} icon>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </StatusBadge>
      )
    },
    {
      header: 'Último Login',
      accessorKey: 'last_login',
      cell: (user) => user.last_login ? new Date(user.last_login).toLocaleString() : '-'
    },
    {
      header: 'Acciones',
      align: 'right',
      cell: (user) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); openGrantAccessModal(user); }}
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Otorgar acceso manual"
          >
            <ShieldCheck size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Gestión de Usuarios" 
        description="Administra usuarios, asigna planes y controla accesos."
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} /> Nuevo Usuario
          </Button>
        }
      />

      <AdminCard noPadding>
        <div className="p-4 border-b border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={users}
          isLoading={loading}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            totalItems: totalItems,
            itemsPerPage: itemsPerPage
          }}
        />
      </AdminCard>

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
              onChange={(e) => setFormData({...formData, plan: e.target.value as 'basic' | 'pro' | 'business'})}
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="basic">Básica</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded">
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
                onChange={(e) => setFormData({...formData, plan: e.target.value as 'basic' | 'pro' | 'business'})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="basic">Básica</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
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
                <label key={role.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded">
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

      <Modal
        isOpen={isGrantAccessModalOpen}
        onClose={() => {
          setIsGrantAccessModalOpen(false);
          setSelectedUser(null);
        }}
        title="Otorgar acceso manual"
      >
        <form onSubmit={handleGrantAccess} className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {selectedUser ? (
              <>
                <div className="font-semibold">{selectedUser.name}</div>
                <div className="mt-1 text-emerald-50/80">{selectedUser.email}</div>
              </>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan a otorgar</label>
            <select
              value={grantForm.plan}
              onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value as 'basic' | 'pro' | 'business' })}
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="basic">Básica</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>

          <Input
            label="Duración en días"
            type="number"
            min={1}
            value={String(grantForm.duration_days)}
            onChange={(e) => setGrantForm({ ...grantForm, duration_days: Math.max(Number(e.target.value || 1), 1) })}
            required
          />

          <Input
            label="Motivo"
            value={grantForm.reason}
            onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
            placeholder="Ej: acceso de prueba aprobado por soporte"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsGrantAccessModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Otorgar acceso</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
